package com.sapiens.erp.modules.storefront.domain;

/**
 * Qué clase de lugar es el origen. Bahía Solano es un municipio, Chocó un
 * departamento y Noruega un país: sin distinguirlos no se pueden agrupar
 * bien en el filtro.
 */
public enum OriginKind { CITY, REGION, DEPARTMENT, COUNTRY }
