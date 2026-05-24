package com.example.gams.controllers;

import com.example.gams.entities.Usuario;
import com.example.gams.repositories.UsuarioRepository;
import com.example.gams.services.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
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
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class FacialRecognitionController {

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String PYTHON_SERVICE_URL = "http://localhost:5000";

    // ──────────────────────────────────────────────
    // Helpers privados
    // ──────────────────────────────────────────────

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    /** POST al servicio Python con payload JSON. */
    private Map<String, Object> postToPython(String endpoint, Map<String, String> payload) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);
        return restTemplate.exchange(PYTHON_SERVICE_URL + endpoint, HttpMethod.POST, entity, MAP_TYPE).getBody();
    }

    /** GET al servicio Python. */
    private Map<String, Object> getFromPython(String endpoint) throws Exception {
        return restTemplate.exchange(PYTHON_SERVICE_URL + endpoint, HttpMethod.GET, null, MAP_TYPE).getBody();
    }

    /** DELETE al servicio Python — devuelve el body real en vez de descartarlo. */
    private Map<String, Object> deleteFromPython(String endpoint) throws Exception {
        return restTemplate.exchange(PYTHON_SERVICE_URL + endpoint, HttpMethod.DELETE, null, MAP_TYPE).getBody();
    }

    /** Respuesta de error estándar {success: false, message: "..."}. */
    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", false);
        resp.put("message", message);
        return resp;
    }

    // ──────────────────────────────────────────────
    // Endpoints
    // ──────────────────────────────────────────────

    /** Reconoce el rostro en la imagen y crea la sesión del usuario autenticado. */
    @PostMapping("/facial-recognition")
    public ResponseEntity<Map<String, Object>> processFacialRecognition(
            @RequestParam("image") MultipartFile image,
            HttpServletRequest request) {

        try {
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().body(errorResponse("No se recibió imagen"));
            }

            String base64Image = Base64.getEncoder().encodeToString(image.getBytes());
            Map<String, Object> pythonResult = postToPython("/recognize", Map.of("image", base64Image));

            if (pythonResult != null && Boolean.TRUE.equals(pythonResult.get("success"))) {
                String recognizedUsername = (String) pythonResult.get("username");

                Usuario usuario = userDetailsService.findUsuarioByUsername(recognizedUsername);
                if (usuario == null) {
                    return ResponseEntity.badRequest().body(errorResponse("Usuario no encontrado en el sistema"));
                }

                // Crear token de autenticación y persistir en sesión
                List<SimpleGrantedAuthority> authorities = usuario.getRoles().stream()
                        .map(rol -> new SimpleGrantedAuthority("ROLE_" + rol.getNombre()))
                        .collect(Collectors.toList());

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(usuario.getUsername(), null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authToken);

                HttpSession session = request.getSession(true);
                session.setAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                        SecurityContextHolder.getContext());

                // Actualizar último acceso (el login facial bypasea loadUserByUsername)
                usuario.setUltimoAcceso(LocalDateTime.now());
                usuarioRepository.save(usuario);

                String rolesString = usuario.getRoles().stream()
                        .map(rol -> rol.getNombre())
                        .collect(Collectors.joining(", "));

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Reconocimiento exitoso");
                response.put("user", Map.of(
                        "name",     usuario.getNombre() + " " + usuario.getApellidos(),
                        "role",     rolesString,
                        "username", usuario.getUsername()));
                response.put("confidence", pythonResult.get("confidence"));
                response.put("redirectUrl", "/");
                return ResponseEntity.ok(response);

            } else {
                String message = pythonResult != null
                        ? (String) pythonResult.get("message")
                        : "Error en el servicio de reconocimiento facial";
                return ResponseEntity.ok(errorResponse(message));
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(errorResponse("Error procesando imagen: " + e.getMessage()));
        }
    }

    /** Registra una foto del rostro de un usuario en el servicio Python. */
    @PostMapping("/facial-recognition/register")
    public ResponseEntity<Map<String, Object>> registerFace(
            @RequestParam("username") String username,
            @RequestParam("image") MultipartFile image) {

        try {
            Usuario usuario = userDetailsService.findUsuarioByUsername(username);
            if (usuario == null) {
                return ResponseEntity.badRequest().body(errorResponse("Usuario no encontrado en el sistema"));
            }

            String base64Image = Base64.getEncoder().encodeToString(image.getBytes());
            Map<String, String> payload = Map.of("username", username, "image", base64Image);
            Map<String, Object> result = postToPython("/register", payload);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(errorResponse("Error registrando rostro: " + e.getMessage()));
        }
    }

    /** Devuelve cuántas fotos tiene registradas un usuario. */
    @GetMapping("/facial-recognition/status/{username}")
    public ResponseEntity<Map<String, Object>> getFaceStatus(@PathVariable String username) {
        try {
            return ResponseEntity.ok(getFromPython("/status/" + username));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(errorResponse("Error consultando estado: " + e.getMessage()));
        }
    }

    /** Elimina todos los encodings biométricos de un usuario. */
    @DeleteMapping("/facial-recognition/encodings/{username}")
    public ResponseEntity<Map<String, Object>> deleteFaceEncodings(@PathVariable String username) {
        try {
            return ResponseEntity.ok(deleteFromPython("/delete-user/" + username));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(errorResponse("Error eliminando encodings: " + e.getMessage()));
        }
    }
}
