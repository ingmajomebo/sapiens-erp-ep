package com.sapiens.erp.modules.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapiens.erp.modules.catalog.api.dto.ProductRequest;
import com.sapiens.erp.modules.catalog.domain.ProductType;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import com.sapiens.erp.modules.inventory.api.dto.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Inventory — Integration tests")
class InventoryIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;

    private RequestPostProcessor adminUser;

    @BeforeEach
    void setUp() {
        adminUser = user("admin").roles("ADMIN");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private UUID createCategory() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/categories")
                        .with(adminUser)
                        .param("name", "Fish-" + UUID.randomUUID()))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(mapper.readTree(result.getResponse().getContentAsString()).get("id").asText());
    }

    private UUID createProduct(String name) throws Exception {
        UUID catId = createCategory();
        ProductRequest req = new ProductRequest(name, catId, null, UnitOfMeasure.KG, new BigDecimal("1.000"), null, null, null, ProductType.RAW_MATERIAL, null, BigDecimal.ZERO, true, "main", null, null, null,
                null, null);
        MvcResult result = mockMvc.perform(post("/api/v1/products")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(mapper.readTree(result.getResponse().getContentAsString()).get("id").asText());
    }

    private MovementResponse registerEntry(UUID productId, BigDecimal qty) throws Exception {
        EntryRequest req = new EntryRequest(productId, qty, new BigDecimal("4.00"), LocalDate.now(), null, "INV-TEST", null, "test-user", null);
        MvcResult result = mockMvc.perform(post("/api/v1/inventory/entries")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return mapper.readValue(result.getResponse().getContentAsString(), MovementResponse.class);
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("ENTRY increases stock")
    void entryIncreasesStock() throws Exception {
        UUID productId = createProduct("Cod-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("10.000"));

        mockMvc.perform(get("/api/v1/inventory/stock/" + productId).with(adminUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStock").value(10.0))
                .andExpect(jsonPath("$.stockStatus").value("OK"));
    }

    @Test
    @DisplayName("EXIT decreases stock using FIFO")
    void exitDecreasesStock() throws Exception {
        UUID productId = createProduct("Shrimp-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("20.000"));

        ExitRequest exitReq = new ExitRequest(productId, new BigDecimal("8.000"), null, "sale", null, "test-user");
        mockMvc.perform(post("/api/v1/inventory/exits")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(exitReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.movementType").value("EXIT"));

        mockMvc.perform(get("/api/v1/inventory/stock/" + productId).with(adminUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStock").value(12.0));
    }

    @Test
    @DisplayName("EXIT returns 422 when stock insufficient")
    void exitReturnsWith422WhenInsufficient() throws Exception {
        UUID productId = createProduct("Tuna-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("5.000"));

        ExitRequest exitReq = new ExitRequest(productId, new BigDecimal("99.000"), null, null, null, "test-user");
        mockMvc.perform(post("/api/v1/inventory/exits")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(exitReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    @DisplayName("WASTE requires reason — 400 when missing")
    void wasteRequiresReason() throws Exception {
        UUID productId = createProduct("Oyster-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("5.000"));

        WasteRequest wasteReq = new WasteRequest(productId, new BigDecimal("1.000"), null, "", null, "test-user");
        mockMvc.perform(post("/api/v1/inventory/wastes")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(wasteReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("WASTE with reason decreases stock")
    void wasteDecreasesStock() throws Exception {
        UUID productId = createProduct("Sardine-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("10.000"));

        WasteRequest wasteReq = new WasteRequest(productId, new BigDecimal("2.000"), null, "Expired packaging", null, "test-user");
        mockMvc.perform(post("/api/v1/inventory/wastes")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(wasteReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.movementType").value("WASTE"));

        mockMvc.perform(get("/api/v1/inventory/stock/" + productId).with(adminUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStock").value(8.0));
    }

    @Test
    @DisplayName("FIFO: consumes oldest lot first across multiple entries")
    void fifoConsumesOldestLotFirst() throws Exception {
        UUID productId = createProduct("Squid-" + UUID.randomUUID());

        EntryRequest entry1 = new EntryRequest(productId, new BigDecimal("5.000"), new BigDecimal("3.00"), LocalDate.now().minusDays(5), null, "OLD-001", null, "test-user", null);
        EntryRequest entry2 = new EntryRequest(productId, new BigDecimal("5.000"), new BigDecimal("4.00"), LocalDate.now(), null, "NEW-001", null, "test-user", null);

        mockMvc.perform(post("/api/v1/inventory/entries").with(adminUser)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(entry1)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/inventory/entries").with(adminUser)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(entry2)))
                .andExpect(status().isCreated());

        ExitRequest exitReq = new ExitRequest(productId, new BigDecimal("5.000"), null, null, null, "test-user");
        mockMvc.perform(post("/api/v1/inventory/exits").with(adminUser)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(exitReq)))
                .andExpect(status().isOk());

        MvcResult lotsResult = mockMvc.perform(get("/api/v1/inventory/lots/" + productId).with(adminUser))
                .andExpect(status().isOk())
                .andReturn();

        var lots = mapper.readTree(lotsResult.getResponse().getContentAsString());
        // Response ordered by receivedAt DESC: newest lot still has 5kg, oldest is fully consumed
        assertThat(lots.get(0).get("availableQuantity").decimalValue()).isEqualByComparingTo("5.000");
        assertThat(lots.get(1).get("availableQuantity").decimalValue()).isEqualByComparingTo("0.000");
    }

    @Test
    @DisplayName("movements list returns all movements for product")
    void movementsListReturnsHistory() throws Exception {
        UUID productId = createProduct("Mackerel-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("10.000"));

        ExitRequest exitReq = new ExitRequest(productId, new BigDecimal("3.000"), null, null, null, "test-user");
        mockMvc.perform(post("/api/v1/inventory/exits").with(adminUser)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(exitReq)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/inventory/movements").param("productId", productId.toString()).with(adminUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @DisplayName("stock list returns all products with stock info")
    void stockListReturnsAllProducts() throws Exception {
        UUID productId = createProduct("Herring-" + UUID.randomUUID());
        registerEntry(productId, new BigDecimal("15.000"));

        mockMvc.perform(get("/api/v1/inventory/stock").with(adminUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
