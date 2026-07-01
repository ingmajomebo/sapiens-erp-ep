package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("SELECT e FROM Expense e WHERE e.deletedAt IS NULL ORDER BY e.expenseDate DESC, e.createdAt DESC")
    List<Expense> findAllActive();

    Optional<Expense> findByIdAndDeletedAtIsNull(UUID id);
}
