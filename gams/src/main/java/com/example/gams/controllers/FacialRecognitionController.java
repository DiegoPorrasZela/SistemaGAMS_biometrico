package com.example.gams.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FacialRecognitionController {

    @PostMapping("/facial-recognition")
    public ResponseEntity<Map<String, Object>> processFacialRecognition(
            @RequestParam("image") MultipartFile image,
            HttpServletRequest request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (image.isEmpty()) {
                response.put("success", false);
                response.put("message", "No se recibió imagen");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Simular procesamiento de imagen
            Thread.sleep(2000);
            
            // Simular reconocimiento exitoso (70% de probabilidad)
            boolean recognized = Math.random() > 0.3;
            
            if (recognized) {
                // Usuario simulado reconocido
                String recognizedUser = "admin";
                String role = "ADMIN";
                
                // Crear autenticación
                UsernamePasswordAuthenticationToken authToken = 
                    new UsernamePasswordAuthenticationToken(
                        recognizedUser, 
                        null, 
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
                
                SecurityContextHolder.getContext().setAuthentication(authToken);
                
                // Guardar en sesión
                HttpSession session = request.getSession(true);
                session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, 
                                   SecurityContextHolder.getContext());
                
                response.put("success", true);
                response.put("message", "Reconocimiento exitoso");
                response.put("user", Map.of(
                    "name", "Diego Administrador",
                    "role", "Administrador",
                    "id", "ADM001"
                ));
                response.put("redirectUrl", "/dashboard");
                
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "No se pudo verificar la identidad");
                return ResponseEntity.ok(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error procesando imagen: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}