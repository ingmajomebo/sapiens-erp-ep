package com.sapiens.erp.modules.inventory.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.inventory.domain.UnitConversion;
import com.sapiens.erp.modules.inventory.domain.UnitConversionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Convierte cantidades a unidad base para poder comparar consumo y obtención.
 *
 * <p>Devuelve {@code null} cuando la conversión no es posible, y quien llama
 * debe informar "no calculable". Rellenar con cero haría que la línea contara
 * como si no pesara nada y el rendimiento saldría mal sin que nadie lo note.
 *
 * <p>Un litro no se convierte a kilos sin conocer la densidad, y un paquete
 * depende de qué lleve dentro: para esos casos el factor lo declara el
 * producto en {@code baseUnitFactor}.
 */
@Component
@RequiredArgsConstructor
public class TransformationUnitConverter {

    private static final int SCALE = 6;

    private final UnitConversionRepository conversionRepository;

    /** @return cantidad en unidad base, o null si la unidad no es convertible. */
    public BigDecimal toBase(Product product, BigDecimal quantity) {
        if (quantity == null) return null;

        // El factor propio del producto manda: "1 paquete = 0.5 kg" es más
        // específico que cualquier regla general de la unidad.
        BigDecimal ownFactor = product.getBaseUnitFactor();
        if (ownFactor != null) {
            return quantity.multiply(ownFactor).setScale(SCALE, RoundingMode.HALF_UP);
        }

        return conversionRepository.findById(product.getUnitOfMeasure())
                .map(UnitConversion::getFactor)
                .map(f -> quantity.multiply(f).setScale(SCALE, RoundingMode.HALF_UP))
                .orElse(null);
    }
}
