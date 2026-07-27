package com.sapiens.erp.modules.identity.api;

import com.sapiens.erp.modules.identity.api.dto.SelectiveResetRequest;
import com.sapiens.erp.modules.identity.application.DataResetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class DataResetController {

    private final DataResetService dataResetService;

    @PostMapping("/reset-data")
    @PreAuthorize("hasAuthority('IDENTITY_DATA_RESET')")
    public ResponseEntity<Map<String, String>> resetData() {
        dataResetService.resetBusinessData();
        return ResponseEntity.ok(Map.of("message", "Datos de negocio eliminados correctamente"));
    }

    @PostMapping("/selective-reset")
    @PreAuthorize("hasAuthority('IDENTITY_DATA_RESET')")
    public ResponseEntity<Map<String, String>> selectiveReset(@RequestBody SelectiveResetRequest request) {
        dataResetService.selectiveReset(request);
        return ResponseEntity.ok(Map.of("message", "Datos seleccionados eliminados correctamente"));
    }
}
