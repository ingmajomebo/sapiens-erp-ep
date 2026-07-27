package com.sapiens.erp.modules.procurement.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductRepository;
import com.sapiens.erp.modules.catalog.domain.Warehouse;
import com.sapiens.erp.modules.catalog.domain.WarehouseRepository;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import com.sapiens.erp.modules.finance.application.AccountsPayableService;
import com.sapiens.erp.modules.inventory.api.dto.EntryRequest;
import com.sapiens.erp.modules.inventory.application.InventoryService;
import com.sapiens.erp.modules.procurement.api.dto.*;
import com.sapiens.erp.modules.procurement.domain.*;
import com.sapiens.erp.modules.procurement.domain.exception.PurchaseOrderNotFoundException;
import com.sapiens.erp.modules.procurement.domain.exception.SupplierNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseReceiptRepository receiptRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryService inventoryService;
    private final AccountsPayableService accountsPayableService;

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listAll() {
        return purchaseOrderRepository.findAllActive().stream()
                .map(PurchaseOrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getById(UUID id) {
        return PurchaseOrderResponse.from(requireWithLines(id));
    }

    @Transactional(readOnly = true)
    public PurchaseReceiptResponse getReceipt(UUID poId) {
        return receiptRepository.findByPurchaseOrderId(poId)
                .map(PurchaseReceiptResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("No existe recepción para la orden: " + poId));
    }

    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest req) {
        Supplier supplier = supplierRepository.findById(req.supplierId())
                .filter(Supplier::isActive)
                .orElseThrow(() -> new SupplierNotFoundException(req.supplierId()));

        Long seq = purchaseOrderRepository.nextOrderNumber();
        String orderNumber = "PO-" + seq;

        Warehouse warehouseRef = req.warehouseId() != null
                ? warehouseRepository.findById(req.warehouseId()).orElse(null)
                : null;
        String warehouseName = warehouseRef != null ? warehouseRef.getName() : req.warehouse();

        PurchaseOrder po = PurchaseOrder.create(
                orderNumber, supplier,
                req.expectedDelivery(), warehouseName,
                warehouseRef, req.paymentTerms(), req.notes()
        );

        for (PurchaseOrderLineRequest lineReq : req.lines()) {
            Product product = productRepository.findById(lineReq.productId())
                    .filter(Product::isActive)
                    .orElseThrow(() -> new ProductNotFoundException(lineReq.productId()));
            BigDecimal taxRate = lineReq.taxRate() != null ? lineReq.taxRate() : BigDecimal.ZERO;
            BigDecimal discount = lineReq.discount() != null ? lineReq.discount() : BigDecimal.ZERO;
            po.addLine(PurchaseOrderLine.create(product, lineReq.quantity(), lineReq.unitCost(), taxRate, discount));
        }

        purchaseOrderRepository.save(po);
        return getById(po.getId());
    }

    @Transactional
    public PurchaseOrderResponse confirm(UUID id) {
        PurchaseOrder po = requireWithLines(id);
        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT orders can be confirmed");
        }
        po.setStatus(PurchaseOrderStatus.CONFIRMED);
        purchaseOrderRepository.save(po);
        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public PurchaseOrderResponse receive(UUID id, ReceiveRequest req) {
        PurchaseOrder po = requireWithLines(id);

        if (po.getStatus() != PurchaseOrderStatus.CONFIRMED) {
            throw new IllegalStateException("Solo las órdenes CONFIRMADAS pueden recibirse");
        }

        Map<UUID, BigDecimal> receivedByLineId = req.lines().stream()
                .collect(Collectors.toMap(ReceiveLineRequest::lineId, ReceiveLineRequest::quantityReceived));

        boolean allFullyReceived = true;
        boolean anyReceived = false;

        PurchaseReceipt receipt = PurchaseReceipt.create(po, req.notes());

        for (PurchaseOrderLine line : po.getLines()) {
            BigDecimal receivedQty = receivedByLineId.getOrDefault(line.getId(), BigDecimal.ZERO);

            if (receivedQty.compareTo(line.getQuantity()) > 0) {
                throw new IllegalArgumentException(
                        "La cantidad recibida de '" + line.getProduct().getName()
                        + "' (" + receivedQty + ") supera la cantidad solicitada (" + line.getQuantity() + ")");
            }
            if (receivedQty.compareTo(line.getQuantity()) < 0) {
                allFullyReceived = false;
            }
            if (receivedQty.compareTo(BigDecimal.ZERO) > 0) {
                anyReceived = true;
            }

            receipt.addLine(PurchaseReceiptLine.createFrom(line, receivedQty));
        }

        if (!anyReceived) {
            throw new IllegalArgumentException("Debe recibirse al menos una unidad de algún producto");
        }

        receiptRepository.save(receipt);

        UUID receivedWarehouseId = po.getWarehouseRef() != null ? po.getWarehouseRef().getId() : null;

        for (PurchaseReceiptLine rl : receipt.getLines()) {
            if (rl.getQuantityReceived().compareTo(BigDecimal.ZERO) > 0) {
                inventoryService.registerEntry(new EntryRequest(
                        rl.getProduct().getId(),
                        rl.getQuantityReceived(),
                        rl.getUnitCost(),
                        LocalDate.now(),
                        null,
                        po.getOrderNumber(),
                        "Recepción OC " + po.getOrderNumber(),
                        null,
                        receivedWarehouseId
                ));
            }
        }

        po.setStatus(allFullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);
        purchaseOrderRepository.save(po);

        accountsPayableService.createFromReceipt(receipt);

        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public void delete(UUID id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .filter(PurchaseOrder::isActive)
                .orElseThrow(() -> new PurchaseOrderNotFoundException(id));
        if (po.getStatus() == PurchaseOrderStatus.RECEIVED
                || po.getStatus() == PurchaseOrderStatus.PARTIALLY_RECEIVED) {
            throw new IllegalStateException("No se puede eliminar una orden ya recibida");
        }
        po.softDelete();
        purchaseOrderRepository.save(po);
    }

    private PurchaseOrder requireWithLines(UUID id) {
        return purchaseOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new PurchaseOrderNotFoundException(id));
    }
}
