package com.sapiens.erp.imagen;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import org.junit.jupiter.api.Test;

import java.awt.*;
import java.awt.image.BufferedImage;

import static org.junit.jupiter.api.Assertions.*;

/** Comprueba que la codificación WebP funciona en este entorno antes de depender de ella. */
class ScrimageDisponibleTest {

    @Test
    void codificaWebpYRedimensionaSinDeformar() throws Exception {
        BufferedImage origen = new BufferedImage(4032, 3024, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = origen.createGraphics();
        g.setPaint(new GradientPaint(0, 0, new Color(200, 60, 40), 4032, 3024, new Color(20, 80, 120)));
        g.fillRect(0, 0, 4032, 3024);
        g.dispose();

        ImmutableImage img = ImmutableImage.wrapAwt(origen);
        ImmutableImage escalada = img.scaleToWidth(600);

        assertEquals(600, escalada.width);
        assertEquals(450, escalada.height, "debe conservar la proporción 4:3");

        byte[] webp = escalada.bytes(WebpWriter.DEFAULT.withQ(82));
        assertTrue(webp.length > 0, "el codificador WebP no produjo nada");
        // Firma RIFF....WEBP
        assertEquals('R', webp[0]); assertEquals('I', webp[1]);
        assertEquals('W', webp[8]); assertEquals('P', webp[11]);

        System.out.printf("  WebP 600px generado: %,d bytes%n", webp.length);
    }
}
