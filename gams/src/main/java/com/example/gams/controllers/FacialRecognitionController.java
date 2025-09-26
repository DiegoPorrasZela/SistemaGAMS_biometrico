package com.example.gams.controllers;

import com.example.gams.entities.Usuario;
import com.example.gams.services.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class FacialRecognitionController {

    @Autowired
    private CustomUserDetailsService userDetailsService;

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
                // Usuario simulado reconocido (puedes cambiar esto por el usuario que quieras)
                String recognizedUsername = "admin"; // o "vendedor1" o "almacen1"
                
                // Buscar el usuario real en la base de datos
                Usuario usuario = userDetailsService.findUsuarioByUsername(recognizedUsername);
                
                if (usuario == null) {
                    response.put("success", false);
                    response.put("message", "Usuario no encontrado en el sistema");
                    return ResponseEntity.badRequest().body(response);
                }
                
                // Crear las autoridades basadas en los roles del usuario
                List<SimpleGrantedAuthority> authorities = usuario.getRoles().stream()
                        .map(rol -> new SimpleGrantedAuthority("ROLE_" + rol.getNombre()))
                        .collect(Collectors.toList());
                
                // Crear autenticación
                UsernamePasswordAuthenticationToken authToken = 
                    new UsernamePasswordAuthenticationToken(
                        usuario.getUsername(), 
                        null, 
                        authorities
                    );
                
                SecurityContextHolder.getContext().setAuthentication(authToken);
                
                // Guardar en sesión
                HttpSession session = request.getSession(true);
                session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, 
                                   SecurityContextHolder.getContext());
                
                // Construir información del usuario para la respuesta
                String rolesString = usuario.getRoles().stream()
                        .map(rol -> rol.getNombre())
                        .collect(Collectors.joining(", "));
                
                response.put("success", true);
                response.put("message", "Reconocimiento exitoso");
                response.put("user", Map.of(
                    "name", usuario.getNombre() + " " + usuario.getApellidos(),
                    "role", rolesString,
                    "username", usuario.getUsername()
                ));
                response.put("redirectUrl", "/"); // Redirige al index
                
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