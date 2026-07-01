package com.sapiens.erp.modules.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapiens.erp.modules.ai.api.AiContextDto;
import com.sapiens.erp.modules.ai.api.AiContextUpdateRequest;
import com.sapiens.erp.modules.ai.api.AiMessage;
import com.sapiens.erp.modules.ai.api.AiRequest;
import com.sapiens.erp.modules.ai.domain.AiContextSetting;
import com.sapiens.erp.modules.ai.domain.AiContextSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiAssistantService {

    private static final String ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION  = "2023-06-01";
    private static final String MODEL              = "claude-sonnet-4-6";
    private static final String CONTEXT_KEY        = "system_context";

    private static final String FALLBACK_SYSTEM_PROMPT = """
        Eres un asistente de desarrollo especializado en el proyecto Sapiens ERP, \
        un sistema de gestión de inventario para una pescadería. \
        Tu misión es ayudar al equipo a generar prompts estructurados y técnicamente \
        precisos para Claude Code.
        """;

    private final AiContextSettingRepository contextRepo;

    @Value("${ai.anthropic.api-key:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Context management ───────────────────────────────────────────────────

    public AiContextDto getContext() {
        return contextRepo.findBySettingKey(CONTEXT_KEY)
                .map(this::toDto)
                .orElseGet(() -> new AiContextDto(CONTEXT_KEY, "Contexto base del Asistente IA", FALLBACK_SYSTEM_PROMPT, null));
    }

    @Transactional
    public AiContextDto updateContext(AiContextUpdateRequest req) {
        AiContextSetting setting = contextRepo.findBySettingKey(CONTEXT_KEY)
                .orElseThrow(() -> new RuntimeException("Contexto no encontrado"));
        setting.updateContent(req.content());
        return toDto(contextRepo.save(setting));
    }

    private AiContextDto toDto(AiContextSetting s) {
        String updatedAt = s.getUpdatedAt() != null
                ? DateTimeFormatter.ISO_INSTANT.format(s.getUpdatedAt().atOffset(ZoneOffset.UTC))
                : null;
        return new AiContextDto(s.getSettingKey(), s.getLabel(), s.getContent(), updatedAt);
    }

    // ─── AI generation ────────────────────────────────────────────────────────

    public String generate(AiRequest req) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "API key de Anthropic no configurada. " +
                "Agrega AI_ANTHROPIC_API_KEY en las variables de entorno."
            );
        }

        String systemPrompt = contextRepo.findBySettingKey(CONTEXT_KEY)
                .map(AiContextSetting::getContent)
                .orElse(FALLBACK_SYSTEM_PROMPT);

        List<Map<String, String>> messages = new ArrayList<>();
        for (AiMessage m : req.messages()) {
            messages.add(Map.of("role", m.role(), "content", m.content()));
        }

        try {
            Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", 4096,
                "system", systemPrompt,
                "messages", messages
            );

            String json = objectMapper.writeValueAsString(body);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(ANTHROPIC_API_URL))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    httpRequest, HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                log.error("Anthropic API error {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("Error en la API de Anthropic: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            return root.path("content").get(0).path("text").asText();

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error llamando a Anthropic API", e);
            throw new RuntimeException("Error al comunicarse con la IA: " + e.getMessage());
        }
    }
}
