package com.example.gams.controllers;

import com.example.gams.entities.Rol;
import com.example.gams.entities.Usuario;
import com.example.gams.repositories.RolRepository;
import com.example.gams.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import java.util.Arrays;

import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarUsuarios() {
        try {
            List<Usuario> usuarios = usuarioRepository.findAll();
            
            List<Map<String, Object>> usuariosDTO = new ArrayList<>();
            for (Usuario usuario : usuarios) {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", usuario.getId());
                dto.put("username", usuario.getUsername());
                dto.put("email", usuario.getEmail());
                dto.put("nombre", usuario.getNombre());
                dto.put("apellidos", usuario.getApellidos());
                dto.put("telefono", usuario.getTelefono());
                dto.put("activo", usuario.getActivo());
                dto.put("fechaCreacion", usuario.getFechaCreacion());
                dto.put("ultimoAcceso", usuario.getUltimoAcceso());
                
                // Obtener roles
                List<String> roles = new ArrayList<>();
                for (Rol rol : usuario.getRoles()) {
                    roles.add(rol.getNombre());
                }
                dto.put("roles", roles);
                
                usuariosDTO.add(dto);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("usuarios", usuariosDTO);
            response.put("total", usuariosDTO.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error al listar usuarios: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerUsuario(@PathVariable Integer id) {
        try {
            Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
            
            if (usuarioOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Usuario no encontrado");
                return ResponseEntity.notFound().build();
            }
            
            Usuario usuario = usuarioOpt.get();
            
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", usuario.getId());
            dto.put("username", usuario.getUsername());
            dto.put("email", usuario.getEmail());
            dto.put("nombre", usuario.getNombre());
            dto.put("apellidos", usuario.getApellidos());
            dto.put("telefono", usuario.getTelefono());
            dto.put("activo", usuario.getActivo());
            
            List<String> roles = new ArrayList<>();
            for (Rol rol : usuario.getRoles()) {
                roles.add(rol.getNombre());
            }
            dto.put("roles", roles);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("usuario", dto);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error al obtener usuario: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crearUsuario(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String username = (String) request.get("username");
            String email = (String) request.get("email");
            String password = (String) request.get("password");
            String nombre = (String) request.get("nombre");
            String apellidos = (String) request.get("apellidos");
            String telefono = (String) request.get("telefono");
            @SuppressWarnings("unchecked")
            List<String> rolesNombres = (List<String>) request.get("roles");
            
            // Validaciones
            if (username == null || username.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "El username es requerido");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (usuarioRepository.existsByUsername(username)) {
                response.put("success", false);
                response.put("message", "El username ya existe");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (usuarioRepository.existsByEmail(email)) {
                response.put("success", false);
                response.put("message", "El email ya está registrado");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Crear usuario
            Usuario usuario = new Usuario();
            usuario.setUsername(username);
            usuario.setEmail(email);
            usuario.setContraseña(passwordEncoder.encode(password));
            usuario.setNombre(nombre);
            usuario.setApellidos(apellidos);
            usuario.setTelefono(telefono);
            usuario.setActivo(true);
            usuario.setFechaCreacion(LocalDateTime.now());
            usuario.setFechaActualizacion(LocalDateTime.now());
            usuario.setIntentosFallidos(0);
            
            // Asignar roles
            Set<Rol> roles = new HashSet<>();
            if (rolesNombres != null && !rolesNombres.isEmpty()) {
                for (String rolNombre : rolesNombres) {
                    Optional<Rol> rolOpt = rolRepository.findByNombre(rolNombre);
                    if (rolOpt.isPresent()) {
                        roles.add(rolOpt.get());
                    }
                }
            }
            usuario.setRoles(roles);
            
            // Guardar
            Usuario usuarioGuardado = usuarioRepository.save(usuario);
            
            response.put("success", true);
            response.put("message", "Usuario creado exitosamente");
            response.put("usuarioId", usuarioGuardado.getId());
            response.put("username", usuarioGuardado.getUsername());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error al crear usuario: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizarUsuario(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
            
            if (usuarioOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "Usuario no encontrado");
                return ResponseEntity.notFound().build();
            }
            
            Usuario usuario = usuarioOpt.get();
            
            // Actualizar campos
            if (request.containsKey("email")) {
                String nuevoEmail = (String) request.get("email");
                if (!usuario.getEmail().equals(nuevoEmail) && 
                    usuarioRepository.existsByEmail(nuevoEmail)) {
                    response.put("success", false);
                    response.put("message", "El email ya está registrado");
                    return ResponseEntity.badRequest().body(response);
                }
                usuario.setEmail(nuevoEmail);
            }
            
            if (request.containsKey("nombre")) {
                usuario.setNombre((String) request.get("nombre"));
            }
            
            if (request.containsKey("apellidos")) {
                usuario.setApellidos((String) request.get("apellidos"));
            }
            
            if (request.containsKey("telefono")) {
                usuario.setTelefono((String) request.get("telefono"));
            }
            
            if (request.containsKey("activo")) {
                usuario.setActivo((Boolean) request.get("activo"));
            }
            
            // Actualizar contraseña si se proporciona
            if (request.containsKey("password") && 
                request.get("password") != null && 
                !((String) request.get("password")).isEmpty()) {
                usuario.setContraseña(passwordEncoder.encode((String) request.get("password")));
            }
            
            // Actualizar roles
            if (request.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                List<String> rolesNombres = (List<String>) request.get("roles");
                Set<Rol> roles = new HashSet<>();
                for (String rolNombre : rolesNombres) {
                    Optional<Rol> rolOpt = rolRepository.findByNombre(rolNombre);
                    if (rolOpt.isPresent()) {
                        roles.add(rolOpt.get());
                    }
                }
                usuario.setRoles(roles);
            }
            
            usuario.setFechaActualizacion(LocalDateTime.now());
            
            usuarioRepository.save(usuario);
            
            response.put("success", true);
            response.put("message", "Usuario actualizado exitosamente");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error al actualizar usuario: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminarUsuario(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
            
            if (usuarioOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "Usuario no encontrado");
                return ResponseEntity.notFound().build();
            }
            
            usuarioRepository.deleteById(id);
            
            response.put("success", true);
            response.put("message", "Usuario eliminado exitosamente");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error al eliminar usuario: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/roles")
    public ResponseEntity<Map<String, Object>> listarRoles() {
        try {
            List<Rol> roles = rolRepository.findAll();
            
            List<Map<String, Object>> rolesDTO = new ArrayList<>();
            for (Rol rol : roles) {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", rol.getId());
                dto.put("nombre", rol.getNombre());
                dto.put("descripcion", rol.getDescripcion());
                rolesDTO.add(dto);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("roles", rolesDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error al listar roles: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    @GetMapping("/current")
public ResponseEntity<Map<String, Object>> obtenerUsuarioActual(Authentication authentication) {
    Map<String, Object> response = new HashMap<>();
    
    try {
        if (authentication == null || !authentication.isAuthenticated()) {
            response.put("success", false);
            response.put("message", "No autenticado");
            return ResponseEntity.status(401).body(response);
        }
        
        String username = authentication.getName();
        Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);
        
        if (usuario == null) {
            response.put("success", false);
            response.put("message", "Usuario no encontrado");
            return ResponseEntity.notFound().build();
        }
        
        // Determinar permisos según roles
        List<String> rolesNombres = usuario.getRoles().stream()
            .map(Rol::getNombre)
            .collect(Collectors.toList());
        
        List<String> permissions = new ArrayList<>();
        for (String rol : rolesNombres) {
            switch (rol) {
                case "ADMIN":
                    permissions.addAll(Arrays.asList("inventario", "ventas", "personal", "reportes", "configuracion", "auditoria"));
                    break;
                case "VENDEDOR":
                    permissions.addAll(Arrays.asList("ventas", "configuracion"));
                    break;
                case "ALMACEN":
                    permissions.addAll(Arrays.asList("inventario", "configuracion"));
                    break;
            }
        }
        
        Map<String, Object> userData = new HashMap<>();
        userData.put("name", usuario.getNombre() + " " + usuario.getApellidos());
        userData.put("username", usuario.getUsername());
        userData.put("email", usuario.getEmail());
        userData.put("role", rolesNombres.isEmpty() ? "usuario" : rolesNombres.get(0).toLowerCase());
        userData.put("displayRole", rolesNombres.stream().collect(Collectors.joining(", ")));
        userData.put("permissions", permissions.stream().distinct().collect(Collectors.toList()));
        userData.put("avatar", null);
        
        response.put("success", true);
        response.put("user", userData);
        
        return ResponseEntity.ok(response);
        
    } catch (Exception e) {
        e.printStackTrace();
        response.put("success", false);
        response.put("message", "Error al obtener usuario: " + e.getMessage());
        return ResponseEntity.internalServerError().body(response);
    }
}
}