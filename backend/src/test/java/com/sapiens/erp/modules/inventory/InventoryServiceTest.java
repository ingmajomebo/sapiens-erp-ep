package com.sapiens.erp.modules.inventory;

import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.inventory.api.dto.*;
import com.sapiens.erp.modules.inventory.application.InventoryService;
import com.sapiens.erp.modules.inventory.domain.*;
import com.sapiens.erp.modules.inventory.domain.exception.InsufficientStockException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InventoryService")
class InventoryServiceTest {

    @Mock ProductRepository productRepository;
    @Mock LotRepository lotRepository;
    @Mock InventoryMovementRepository movementRepository;
    @Mock MovementLotRepository movementLotRepository;
    @InjectMocks InventoryService service;

    private UUID productId;
    private Product product;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();
        Category category = Category.create("Fish", null);
        product = Product.create("Salmon", category, UnitOfMeasure.KG, new BigDecimal("2.000"), null);
        lenient().when(productRepository.findByIdAndDeletedAtIsNull(productId)).thenReturn(Optional.of(product));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void stubSaves() {
        lenient().when(lotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(movementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(movementLotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private Lot buildLot(BigDecimal qty, int daysAgo) {
        return Lot.create(product, qty, BigDecimal.ONE, LocalDate.now().minusDays(daysAgo), null, null, null, null);
    }

    // ── ENTRY ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("registerEntry()")
    class RegisterEntry {

        @Test
        @DisplayName("creates lot and ENTRY movement")
        void createsLotAndMovement() {
            stubSaves();
            EntryRequest req = new EntryRequest(productId, new BigDecimal("10.000"), new BigDecimal("5.50"), LocalDate.now(), null, "INV-001", null, "test", null);

            MovementResponse response = service.registerEntry(req);

            assertThat(response.movementType()).isEqualTo(MovementType.ENTRY);
            assertThat(response.quantity()).isEqualByComparingTo("10.000");
            verify(lotRepository).save(any(Lot.class));
            verify(movementRepository).save(any(InventoryMovement.class));
            verifyNoInteractions(movementLotRepository);
        }

        @Test
        @DisplayName("throws when product not found")
        void throwsWhenProductNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(productRepository.findByIdAndDeletedAtIsNull(unknownId)).thenReturn(Optional.empty());

            EntryRequest req = new EntryRequest(unknownId, BigDecimal.ONE, BigDecimal.ONE, null, null, null, null, null, null);
            assertThatThrownBy(() -> service.registerEntry(req)).isInstanceOf(RuntimeException.class);
        }
    }

    // ── EXIT ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("registerExit()")
    class RegisterExit {

        @Test
        @DisplayName("consumes FIFO and creates EXIT movement")
        void consumesFIFO() {
            stubSaves();
            Lot lot = buildLot(new BigDecimal("20.000"), 1);
            when(movementRepository.calculateCurrentStock(any())).thenReturn(new BigDecimal("20.000"));
            when(lotRepository.findAvailableByProductFIFO(any())).thenReturn(List.of(lot));
            when(lotRepository.calculateAvailableQuantity(any())).thenReturn(new BigDecimal("20.000"));

            ExitRequest req = new ExitRequest(productId, new BigDecimal("5.000"), null, "sale", null, "test");
            MovementResponse response = service.registerExit(req);

            assertThat(response.movementType()).isEqualTo(MovementType.EXIT);
            assertThat(response.quantity()).isEqualByComparingTo("5.000");
            verify(movementLotRepository).save(any(MovementLot.class));
        }

        @Test
        @DisplayName("throws InsufficientStockException when stock < requested")
        void throwsWhenInsufficientStock() {
            when(movementRepository.calculateCurrentStock(any())).thenReturn(new BigDecimal("3.000"));

            ExitRequest req = new ExitRequest(productId, new BigDecimal("10.000"), null, null, null, "test");
            assertThatThrownBy(() -> service.registerExit(req))
                    .isInstanceOf(InsufficientStockException.class);
        }

        @Test
        @DisplayName("spans multiple lots (FIFO)")
        void spansMultipleLots() {
            stubSaves();
            Lot lot1 = buildLot(new BigDecimal("5.000"), 2);
            Lot lot2 = buildLot(new BigDecimal("10.000"), 1);

            when(movementRepository.calculateCurrentStock(any())).thenReturn(new BigDecimal("15.000"));
            when(lotRepository.findAvailableByProductFIFO(any())).thenReturn(List.of(lot1, lot2));
            // Different available per lot — need exact argument matching
            when(lotRepository.calculateAvailableQuantity(lot1.getId())).thenReturn(new BigDecimal("5.000"));
            when(lotRepository.calculateAvailableQuantity(lot2.getId())).thenReturn(new BigDecimal("10.000"));

            ExitRequest req = new ExitRequest(productId, new BigDecimal("8.000"), null, null, null, "test");
            service.registerExit(req);

            verify(movementLotRepository, times(2)).save(any(MovementLot.class));
        }
    }

    // ── WASTE ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("registerWaste()")
    class RegisterWaste {

        @Test
        @DisplayName("creates WASTE movement with reason")
        void createsWasteMovement() {
            stubSaves();
            Lot lot = buildLot(new BigDecimal("5.000"), 0);
            when(movementRepository.calculateCurrentStock(any())).thenReturn(new BigDecimal("5.000"));
            when(lotRepository.findAvailableByProductFIFO(any())).thenReturn(List.of(lot));
            when(lotRepository.calculateAvailableQuantity(any())).thenReturn(new BigDecimal("5.000"));

            WasteRequest req = new WasteRequest(productId, new BigDecimal("1.500"), null, "Damaged packaging", null, "test");
            MovementResponse response = service.registerWaste(req);

            assertThat(response.movementType()).isEqualTo(MovementType.WASTE);
            assertThat(response.reason()).isEqualTo("Damaged packaging");
        }

        @Test
        @DisplayName("throws InsufficientStockException when stock too low")
        void throwsWhenInsufficientStock() {
            when(movementRepository.calculateCurrentStock(any())).thenReturn(BigDecimal.ZERO);

            WasteRequest req = new WasteRequest(productId, new BigDecimal("2.000"), null, "Spoiled", null, "test");
            assertThatThrownBy(() -> service.registerWaste(req))
                    .isInstanceOf(InsufficientStockException.class);
        }
    }

    // ── STOCK ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getStock()")
    class GetStock {

        @Test
        @DisplayName("returns OK status when above minimum")
        void returnsOkStatus() {
            when(movementRepository.calculateCurrentStock(any())).thenReturn(new BigDecimal("10.000"));
            StockResponse response = service.getStock(productId);

            assertThat(response.currentStock()).isEqualByComparingTo("10.000");
            assertThat(response.stockStatus()).isEqualTo(StockResponse.StockStatus.OK);
        }

        @Test
        @DisplayName("returns CRITICAL when stock equals minimum stock")
        void returnsCriticalAtMinimum() {
            // product has minimumStock = 2.000
            when(movementRepository.calculateCurrentStock(any())).thenReturn(new BigDecimal("2.000"));
            StockResponse response = service.getStock(productId);
            assertThat(response.stockStatus()).isEqualTo(StockResponse.StockStatus.CRITICAL);
        }

        @Test
        @DisplayName("returns OUT_OF_STOCK when stock is zero")
        void returnsOutOfStock() {
            when(movementRepository.calculateCurrentStock(any())).thenReturn(BigDecimal.ZERO);
            StockResponse response = service.getStock(productId);
            assertThat(response.stockStatus()).isEqualTo(StockResponse.StockStatus.OUT_OF_STOCK);
        }
    }
}
