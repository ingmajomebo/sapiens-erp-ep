package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.CustomerRequest;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.CustomerResponse;
import com.sapiens.erp.modules.sales.domain.Customer;
import com.sapiens.erp.modules.sales.domain.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public List<CustomerResponse> listAll() {
        return customerRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
                .map(CustomerResponse::from)
                .toList();
    }

    @Transactional
    public CustomerResponse create(CustomerRequest req) {
        Customer customer = Customer.create(req.name().trim(), req.email(), req.phone(), false);
        return CustomerResponse.from(customerRepository.save(customer));
    }
}
