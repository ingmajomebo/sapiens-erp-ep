package com.sapiens.erp.shared.api;

import java.util.List;

/** Envoltorio de paginación del proyecto: { content, page, size, totalElements }. */
public record PagedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements
) {
    public static <T> PagedResponse<T> of(List<T> all, int page, int size) {
        int from = Math.min(page * size, all.size());
        int to = Math.min(from + size, all.size());
        return new PagedResponse<>(all.subList(from, to), page, size, all.size());
    }
}
