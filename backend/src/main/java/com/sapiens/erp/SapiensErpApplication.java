package com.sapiens.erp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SapiensErpApplication {

    public static void main(String[] args) {
        SpringApplication.run(SapiensErpApplication.class, args);
    }
}
