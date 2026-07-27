package com.sapiens.erp.modules.sales.application;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.sapiens.erp.modules.sales.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Representación gráfica en PDF de facturas y notas crédito (OpenPDF).
 * Datos del emisor placeholder hasta que exista configuración de empresa.
 * El espacio QR/CUFE queda reservado: "Documento no validado ante DIAN".
 */
@Service
@RequiredArgsConstructor
public class SalesInvoicePdfService {

    private static final String COMPANY_NAME = "La Pescadería";
    private static final String COMPANY_ID = "NIT 000.000.000-0";
    private static final String COMPANY_ADDRESS = "Calle del Puerto 12 · Mercado Central";

    private static final Color INK = new Color(11, 36, 54);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Font H1 = new Font(Font.HELVETICA, 16, Font.BOLD, INK);
    private static final Font H2 = new Font(Font.HELVETICA, 11, Font.BOLD, INK);
    private static final Font BODY = new Font(Font.HELVETICA, 9, Font.NORMAL, INK);
    private static final Font SMALL = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED);
    private static final Font TH = new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE);

    private final SalesInvoiceRepository invoiceRepository;
    private final SalesInvoicePaymentRepository paymentRepository;
    private final CreditNoteRepository creditNoteRepository;

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] invoicePdf(UUID invoiceId) {
        SalesInvoice inv = invoiceRepository.findByIdAndDeletedAtIsNull(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Factura no encontrada: " + invoiceId));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
        PdfWriter.getInstance(doc, out);
        doc.open();

        boolean isDraft = inv.getStatus() == SalesInvoiceStatus.DRAFT;
        String docTitle  = isDraft ? "Factura Proforma" : "Factura de Venta";
        String docNumber = isDraft ? inv.getSalesOrder().getOrderNumber() : inv.getInvoiceNumber();
        String watermark = isDraft ? "DOCUMENTO SIN VALIDEZ FISCAL · NO VÁLIDA ANTE DIAN"
                : inv.getStatus() == SalesInvoiceStatus.CANCELLED ? "ANULADA" : null;
        header(doc, docTitle, docNumber, watermark);

        // Emisor / adquiriente
        PdfPTable parties = new PdfPTable(2);
        parties.setWidthPercentage(100);
        parties.setSpacingAfter(12);
        parties.addCell(partyCell("EMISOR", COMPANY_NAME, COMPANY_ID + "\n" + COMPANY_ADDRESS));
        String customerName = inv.getCustomer() != null ? inv.getCustomer().getName() : "Cliente anónimo";
        String customerInfo = (inv.getCustomer() != null && inv.getCustomer().getPhone() != null ? "Tel: " + inv.getCustomer().getPhone() + "\n" : "")
                + (inv.getCustomer() != null && inv.getCustomer().getEmail() != null ? inv.getCustomer().getEmail() : "");
        parties.addCell(partyCell("ADQUIRIENTE", customerName, customerInfo.isBlank() ? "—" : customerInfo));
        doc.add(parties);

        // Fechas y condiciones
        Paragraph meta = new Paragraph(String.format(
                "Pedido: %s   ·   Emisión: %s   ·   Vencimiento: %s   ·   Forma de pago: %s%s%s",
                inv.getSalesOrder().getOrderNumber(),
                inv.getIssuedAt() != null ? DATE.format(inv.getIssuedAt().atZone(ZoneId.systemDefault()).toLocalDate()) : "—",
                inv.getDueDate() != null ? DATE.format(inv.getDueDate()) : "—",
                inv.getPaymentForm() == PaymentForm.CREDIT ? "Crédito " + inv.getCreditTermDays() + " días" : "Contado",
                inv.getPaymentMethod() != null ? "   ·   Medio: " + methodLabel(inv.getPaymentMethod()) : "",
                ""), SMALL);
        meta.setSpacingAfter(10);
        doc.add(meta);

        // Líneas
        PdfPTable table = new PdfPTable(new float[]{4.2f, 1f, 1.6f, 1f, 1f, 1.8f});
        table.setWidthPercentage(100);
        for (String h : new String[]{"Descripción", "Cant.", "Precio unit.", "Desc.", "IVA", "Total"}) {
            PdfPCell c = new PdfPCell(new Phrase(h, TH));
            c.setBackgroundColor(INK);
            c.setPadding(5);
            table.addCell(c);
        }
        for (SalesInvoiceLine l : inv.getLines()) {
            if (l.getDeletedAt() != null) continue;
            table.addCell(cell(l.getDescription(), Element.ALIGN_LEFT));
            table.addCell(cell(l.getQuantity().stripTrailingZeros().toPlainString(), Element.ALIGN_RIGHT));
            table.addCell(cell(cop(l.getUnitPrice()), Element.ALIGN_RIGHT));
            table.addCell(cell(l.getDiscountPct().stripTrailingZeros().toPlainString() + "%", Element.ALIGN_RIGHT));
            table.addCell(cell(l.getTaxRate().stripTrailingZeros().toPlainString() + "%", Element.ALIGN_RIGHT));
            table.addCell(cell(cop(l.getLineTotal()), Element.ALIGN_RIGHT));
        }
        table.setSpacingAfter(10);
        doc.add(table);

        // Impuestos por tarifa + totales
        Map<String, BigDecimal> taxes = new LinkedHashMap<>();
        for (SalesInvoiceLine l : inv.getLines()) {
            if (l.getDeletedAt() != null) continue;
            taxes.merge("IVA " + l.getTaxRate().stripTrailingZeros().toPlainString() + "%", l.taxAmount(), BigDecimal::add);
        }
        BigDecimal paid = paymentRepository.sumByInvoiceId(invoiceId);

        PdfPTable totals = new PdfPTable(new float[]{3f, 1.4f});
        totals.setWidthPercentage(42);
        totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalRow(totals, "Subtotal", cop(inv.getSubtotal()), false);
        totalRow(totals, "Descuentos", "-" + cop(inv.getTotalDiscounts()), false);
        taxes.forEach((k, v) -> totalRow(totals, k, cop(v), false));
        totalRow(totals, "TOTAL", cop(inv.getTotal()), true);
        totalRow(totals, "Pagado", cop(paid), false);
        totalRow(totals, "Saldo", cop(inv.getTotal().subtract(paid)), false);
        totals.setSpacingAfter(14);
        doc.add(totals);

        if (inv.getNotes() != null && !inv.getNotes().isBlank()) {
            Paragraph notes = new Paragraph("Notas: " + inv.getNotes(), SMALL);
            notes.setSpacingAfter(10);
            doc.add(notes);
        }

        dianFooter(doc, inv.getCufe());
        doc.close();
        return out.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] creditNotePdf(UUID noteId) {
        CreditNote note = creditNoteRepository.findByIdAndDeletedAtIsNull(noteId)
                .orElseThrow(() -> new IllegalArgumentException("Nota crédito no encontrada: " + noteId));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
        PdfWriter.getInstance(doc, out);
        doc.open();

        header(doc, "Nota crédito", note.getNoteNumber(), null);

        Paragraph body = new Paragraph(String.format(
                "Anula la factura %s por valor de %s.\n\nMotivo: %s\n\nFecha: %s",
                note.getInvoice().getInvoiceNumber(), cop(note.getTotal()), note.getReason(),
                DATE.format(note.getIssuedAt().atZone(ZoneId.systemDefault()).toLocalDate())), BODY);
        body.setSpacingBefore(14);
        body.setSpacingAfter(20);
        doc.add(body);

        dianFooter(doc, null);
        doc.close();
        return out.toByteArray();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void header(Document doc, String title, String number, String watermarkNote) {
        Paragraph company = new Paragraph(COMPANY_NAME, H1);
        doc.add(company);
        Paragraph sub = new Paragraph(title + "  ·  " + number
                + (watermarkNote != null ? "  ·  " + watermarkNote : ""), H2);
        sub.setSpacingAfter(12);
        doc.add(sub);
    }

    private PdfPCell partyCell(String label, String name, String info) {
        PdfPCell c = new PdfPCell();
        c.setPadding(8);
        c.setBorderColor(new Color(220, 232, 233));
        c.addElement(new Paragraph(label, SMALL));
        c.addElement(new Paragraph(name, H2));
        c.addElement(new Paragraph(info, SMALL));
        return c;
    }

    private PdfPCell cell(String text, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text, BODY));
        c.setHorizontalAlignment(align);
        c.setPadding(5);
        c.setBorderColor(new Color(220, 232, 233));
        return c;
    }

    private void totalRow(PdfPTable t, String label, String value, boolean bold) {
        Font f = bold ? H2 : BODY;
        PdfPCell l = new PdfPCell(new Phrase(label, f));
        l.setBorder(Rectangle.NO_BORDER);
        l.setHorizontalAlignment(Element.ALIGN_RIGHT);
        PdfPCell v = new PdfPCell(new Phrase(value, f));
        v.setBorder(Rectangle.NO_BORDER);
        v.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(l);
        t.addCell(v);
    }

    private void dianFooter(Document doc, String cufe) {
        // Espacio reservado para la representación gráfica DIAN (QR + CUFE)
        Paragraph dian = new Paragraph(
                cufe != null ? "CUFE: " + cufe : "Documento no validado ante DIAN", SMALL);
        dian.setSpacingBefore(18);
        doc.add(dian);
        Paragraph generated = new Paragraph(
                "Generado por Sapiens ERP · " + DATE.format(LocalDate.now()), SMALL);
        doc.add(generated);
    }

    private String cop(BigDecimal value) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-CO"));
        nf.setMaximumFractionDigits(0);
        return "$ " + nf.format(value);
    }

    private String methodLabel(InvoicePaymentMethod m) {
        return switch (m) {
            case CASH -> "Efectivo";
            case TRANSFER -> "Transferencia";
            case CARD -> "Tarjeta";
            case OTHER -> "Otro";
        };
    }
}
