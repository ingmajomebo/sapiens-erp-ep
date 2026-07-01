package com.sapiens.erp.modules.procurement.application;

import com.sapiens.erp.modules.procurement.api.dto.SupplierRequest;
import com.sapiens.erp.modules.procurement.api.dto.SupplierResponse;
import com.sapiens.erp.modules.procurement.domain.Supplier;
import com.sapiens.erp.modules.procurement.domain.SupplierRepository;
import com.sapiens.erp.modules.procurement.domain.exception.SupplierNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<SupplierResponse> listAll() {
        return supplierRepository.findAllByDeletedAtIsNullOrderByNameAsc()
                .stream().map(SupplierResponse::from).toList();
    }

    @Transactional
    public SupplierResponse create(SupplierRequest req) {
        if (supplierRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(req.name())) {
            throw new IllegalArgumentException("Supplier '" + req.name() + "' already exists");
        }
        Supplier s = Supplier.create(req.name(), req.contactName(), req.email(),
                req.phone(), req.address(), req.taxId(), req.notes());
        return SupplierResponse.from(supplierRepository.save(s));
    }

    @Transactional
    public SupplierResponse update(UUID id, SupplierRequest req) {
        Supplier s = supplierRepository.findById(id)
                .filter(Supplier::isActive)
                .orElseThrow(() -> new SupplierNotFoundException(id));
        s.setName(req.name());
        s.setContactName(req.contactName());
        s.setEmail(req.email());
        s.setPhone(req.phone());
        s.setAddress(req.address());
        s.setTaxId(req.taxId());
        s.setNotes(req.notes());
        return SupplierResponse.from(supplierRepository.save(s));
    }

    @Transactional
    public void delete(UUID id) {
        Supplier s = supplierRepository.findById(id)
                .filter(Supplier::isActive)
                .orElseThrow(() -> new SupplierNotFoundException(id));
        s.softDelete();
        supplierRepository.save(s);
    }
}
