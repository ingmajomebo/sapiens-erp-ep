package com.sapiens.erp.modules.ai;

import com.sapiens.erp.modules.ai.api.AiContextDto;
import com.sapiens.erp.modules.ai.api.AiContextUpdateRequest;
import com.sapiens.erp.modules.ai.api.AiRequest;
import com.sapiens.erp.modules.ai.api.AiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final AiAssistantService service;

    @PostMapping("/generate-prompt")
    public AiResponse generate(@RequestBody AiRequest req) {
        return new AiResponse(service.generate(req));
    }

    @GetMapping("/context")
    public AiContextDto getContext() {
        return service.getContext();
    }

    @PutMapping("/context")
    public AiContextDto updateContext(@RequestBody AiContextUpdateRequest req) {
        return service.updateContext(req);
    }
}
