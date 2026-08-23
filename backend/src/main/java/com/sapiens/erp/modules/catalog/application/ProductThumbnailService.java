package com.sapiens.erp.modules.catalog.application;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import java.util.Set;

/**
 * Miniaturas de las fotos de producto.
 * <p>
 * La rejilla del catálogo muestra las fotos a unos 300 px de ancho pero el
 * archivo original mide 1000 px y pesa hasta 380 KB. Veinte productos son casi
 * 5 MB para pintar algo que cabe en una décima parte.
 * <p>
 * El resultado se guarda en disco junto al original: redimensionar es caro y
 * la foto de un producto casi nunca cambia. La primera petición paga el costo;
 * las demás leen el archivo ya hecho.
 */
@Service
@Slf4j
public class ProductThumbnailService {

    /** Anchos permitidos. Cerrar la lista evita que alguien llene el disco. */
    private static final Set<Integer> WIDTHS = Set.of(200, 400, 800);

    private static final float QUALITY = 0.82f;

    @Value("${app.uploads.products-dir:uploads/products}")
    private String uploadsDir;

    public boolean supports(int width) {
        return WIDTHS.contains(width);
    }

    /** El ancho permitido más pequeño que cubra el pedido. */
    public int normalize(int requested) {
        return WIDTHS.stream().sorted()
                .filter(w -> w >= requested)
                .findFirst()
                .orElse(WIDTHS.stream().max(Integer::compare).orElse(800));
    }

    /**
     * Devuelve la miniatura en JPEG. Si algo falla —formato raro, disco lleno—
     * devuelve null y quien llama sirve el original: una foto pesada es mejor
     * que ninguna foto.
     */
    public byte[] thumbnail(Path original, int width) {
        try {
            Path cached = cachePathFor(original, width);

            // Se rehace si el original cambió después de la miniatura
            if (Files.exists(cached)
                    && Files.getLastModifiedTime(cached).compareTo(Files.getLastModifiedTime(original)) >= 0) {
                return Files.readAllBytes(cached);
            }

            BufferedImage source = ImageIO.read(original.toFile());
            if (source == null) {
                log.warn("Formato no legible para miniatura: {}", original);
                return null;
            }

            // Ampliar no aporta nada: si ya es más pequeña, se deja como está
            if (source.getWidth() <= width) return null;

            byte[] jpeg = encode(resize(source, width));
            Files.createDirectories(cached.getParent());
            Files.write(cached, jpeg);
            return jpeg;

        } catch (IOException | RuntimeException e) {
            log.warn("No se pudo generar la miniatura de {} a {}px: {}", original, width, e.getMessage());
            return null;
        }
    }

    private BufferedImage resize(BufferedImage source, int width) {
        int height = Math.max(1, Math.round(source.getHeight() * (width / (float) source.getWidth())));

        // TYPE_INT_RGB descarta el canal alfa a propósito: la salida es JPEG,
        // que no lo admite, y sin esto los PNG con transparencia salen negros.
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, width, height);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(source.getScaledInstance(width, height, Image.SCALE_SMOOTH), 0, 0, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    private byte[] encode(BufferedImage image) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) throw new IOException("Sin codificador JPEG disponible");

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream buffer = new ByteArrayOutputStream();
             ImageOutputStream stream = ImageIO.createImageOutputStream(buffer)) {

            writer.setOutput(stream);
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(QUALITY);
            }
            writer.write(null, new IIOImage(image, null, null), params);
            stream.flush();
            return buffer.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    /** uploads/products/.thumbs/<archivo>@400.jpg */
    private Path cachePathFor(Path original, int width) {
        String name = original.getFileName().toString();
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        return Paths.get(uploadsDir, ".thumbs", base + "@" + width + ".jpg");
    }
}
