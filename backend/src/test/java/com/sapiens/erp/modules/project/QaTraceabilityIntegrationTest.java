package com.sapiens.erp.modules.project;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("QA trazabilidad — Integration tests (/tree y /coverage)")
class QaTraceabilityIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;

    private RequestPostProcessor adminUser;

    @BeforeEach
    void setUp() {
        adminUser = user("admin").roles("ADMIN");
    }

    private JsonNode postJson(String path, String body) throws Exception {
        MvcResult res = mockMvc.perform(post(path).with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return mapper.readTree(res.getResponse().getContentAsString());
    }

    private JsonNode getJson(String path) throws Exception {
        MvcResult res = mockMvc.perform(get(path).with(adminUser))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(res.getResponse().getContentAsString());
    }

    @Test
    @DisplayName("árbol del run y cobertura reflejan épica → historia → escenario → ejecución")
    void treeAndCoverage() throws Exception {
        JsonNode epic = postJson("/api/v1/epics",
                "{\"name\":\"Épica IT\",\"module\":\"project\",\"priority\":\"HIGH\"}");
        JsonNode story = postJson("/api/v1/user-stories",
                "{\"reqId\":\"RF-IT1\",\"epicId\":\"" + epic.get("id").asText() + "\"," +
                        "\"persona\":\"tester\",\"actionStatement\":\"probar integración\"," +
                        "\"outcomeStatement\":\"trazabilidad\",\"module\":\"project\"}");
        String storyId = story.get("id").asText();
        JsonNode sc1 = postJson("/api/v1/user-stories/" + storyId + "/scenarios",
                "{\"scenarioTitle\":\"Con ejecución\",\"givenConditions\":\"G\",\"whenEvent\":\"W\",\"thenOutcome\":\"T\"}");
        postJson("/api/v1/user-stories/" + storyId + "/scenarios",
                "{\"scenarioTitle\":\"Sin ejecutar\",\"givenConditions\":\"G2\",\"whenEvent\":\"W2\",\"thenOutcome\":\"T2\"}");

        JsonNode run = postJson("/api/v1/qa/test-runs",
                "{\"name\":\"Run IT\",\"runType\":\"REGRESSION\",\"buildVersion\":\"vIT\"," +
                        "\"scope\":{\"type\":\"STORIES\",\"storyIds\":[\"" + storyId + "\"]}}");
        String runId = run.get("id").asText();

        postJson("/api/v1/user-stories/" + storyId + "/scenarios/" + sc1.get("id").asText() + "/test-executions",
                "{\"result\":\"FAIL\",\"executedBy\":\"ISKIAN\",\"notes\":\"falla IT\"," +
                        "\"createDefect\":true,\"testRunId\":\"" + runId + "\"}");

        // ── Árbol ──
        JsonNode tree = getJson("/api/v1/qa/test-runs/" + runId + "/tree");
        assertThat(tree.get("run").get("code").asText()).isEqualTo(run.get("code").asText());
        JsonNode epicNode = tree.get("epics").get(0);
        assertThat(epicNode.get("epicName").asText()).isEqualTo("Épica IT");
        JsonNode storyNode = epicNode.get("stories").get(0);
        assertThat(storyNode.get("reqId").asText()).isEqualTo("RF-IT1");
        assertThat(storyNode.get("status").asText()).isEqualTo("QA_FAILED");
        assertThat(storyNode.get("scenarios")).hasSize(2);

        JsonNode executed = null;
        JsonNode pending = null;
        for (JsonNode sc : storyNode.get("scenarios")) {
            if (sc.get("pending").asBoolean()) pending = sc; else executed = sc;
        }
        assertThat(executed).isNotNull();
        assertThat(pending).isNotNull();
        JsonNode exec = executed.get("executions").get(0);
        assertThat(exec.get("result").asText()).isEqualTo("FAIL");
        assertThat(exec.get("defectTaskTitle").asText()).contains("RF-IT1");
        assertThat(exec.get("snapshotVersion").asInt()).isEqualTo(1);

        // ── Cobertura ──
        JsonNode cov = getJson("/api/v1/qa/coverage?epicId=" + epic.get("id").asText());
        JsonNode totals = cov.get("totals");
        assertThat(totals.get("totalScenarios").asLong()).isEqualTo(2);
        assertThat(totals.get("coveredScenarios").asLong()).isEqualTo(1);
        assertThat(totals.get("neverExecuted").asLong()).isEqualTo(1);
        JsonNode epicCov = cov.get("epics").get(0);
        assertThat(epicCov.get("coveragePct").asInt()).isEqualTo(50);
        assertThat(epicCov.get("stories").get(0).get("neverExecuted")).hasSize(1);

        // ── Historial inverso ──
        JsonNode history = getJson("/api/v1/user-stories/" + storyId + "/qa-history");
        assertThat(history).hasSize(1);
        assertThat(history.get(0).get("runCode").asText()).isEqualTo(run.get("code").asText());
        assertThat(history.get(0).get("results").get("fail").asLong()).isEqualTo(1);
        assertThat(history.get(0).get("results").get("pending").asLong()).isEqualTo(1);
    }
}
