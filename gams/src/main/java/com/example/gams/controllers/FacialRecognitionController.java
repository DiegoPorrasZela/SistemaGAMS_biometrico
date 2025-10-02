package com.example.gams.controllers;

import com.example.gams.entities.Usuario;
import com.example.gams.services.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class FacialRecognitionController {

    @Autowired
    private CustomUserDetailsService userDetailsService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String PYTHON_SERVICE_URL = "http://localhost:5000";

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

            // Convertir imagen a Base64
            String base64Image = Base64.getEncoder().encodeToString(image.getBytes());

            // Crear request para el servicio Python
            Map<String, String> pythonRequest = new HashMap<>();
            pythonRequest.put("image", base64Image);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(pythonRequest, headers);

            // Llamar al servicio Python
            ResponseEntity<Map> pythonResponse = restTemplate.postForEntity(
                    PYTHON_SERVICE_URL + "/recognize",
                    entity,
                    Map.class);

            Map<String, Object> pythonResult = pythonResponse.getBody();

            if (pythonResult != null && Boolean.TRUE.equals(pythonResult.get("success"))) {
                String recognizedUsername = (String) pythonResult.get("username");

                // Buscar el usuario en la base de datos
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
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        usuario.getUsername(),
                        null,
                        authorities);

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
                        "username", usuario.getUsername()));
                response.put("confidence", pythonResult.get("confidence"));
                response.put("redirectUrl", "/");

                return ResponseEntity.ok(response);
            } else {
                String message = pythonResult != null ? (String) pythonResult.get("message")
                        : "Error en el servicio de reconocimiento facial";

                response.put("success", false);
                response.put("message", message);
                return ResponseEntity.ok(response);
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error procesando imagen: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/facial-recognition/register")
    public ResponseEntity<Map<String, Object>> registerFace(
            @RequestParam("username") String username,
            @RequestParam("image") MultipartFile image) {

        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println("=== DEBUG REGISTER FACE ===");
            System.out.println("Username recibido: " + username);
            System.out.println("Tamaño imagen: " + image.getSize() + " bytes");

            // Verificar que el usuario existe
            Usuario usuario = userDetailsService.findUsuarioByUsername(username);
            if (usuario == null) {
                response.put("success", false);
                response.put("message", "Usuario no encontrado en el sistema");
                return ResponseEntity.badRequest().body(response);
            }

            // Convertir imagen a Base64
            String base64Image = Base64.getEncoder().encodeToString(image.getBytes());

            // Crear request para Python
            Map<String, String> pythonRequest = new HashMap<>();
            pythonRequest.put("username", username);
            pythonRequest.put("image", base64Image);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(pythonRequest, headers);

            System.out.println("Llamando a Python service...");

            // Llamar a Python
            ResponseEntity<Map> pythonResponse = restTemplate.postForEntity(
                    PYTHON_SERVICE_URL + "/register",
                    entity,
                    Map.class);

            System.out.println("Respuesta Python: " + pythonResponse.getStatusCode());

            Map<String, Object> pythonResult = pythonResponse.getBody();

            if (pythonResult != null && Boolean.TRUE.equals(pythonResult.get("success"))) {
                System.out.println("✓ Rostro registrado exitosamente");
            } else {
                System.out.println("✗ Error en Python: " + pythonResult);
            }

            return ResponseEntity.ok(pythonResult);

        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error registrando rostro: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}