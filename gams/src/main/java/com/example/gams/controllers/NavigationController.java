package com.example.gams.controllers;

import com.example.gams.entities.Rol;
import com.example.gams.entities.Usuario;
import com.example.gams.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.stream.Collectors;

@RequiredArgsConstructor
@Controller
public class NavigationController {

    private final UsuarioRepository usuarioRepository;

    @GetMapping("/")
    public String index(Model model, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            if (usuario != null) {
                model.addAttribute("userName", usuario.getNombreCompleto());
                model.addAttribute("userRole", usuario.getRoles().stream()
                        .map(Rol::getNombre)
                        .collect(Collectors.joining(", ")));
            }
        }
        return "index";
    }

    /** true si hay una sesión real (no anónima) iniciada. */
    private boolean isLoggedIn(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }

    @GetMapping("/login")
    public String login(@RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "logout", required = false) String logout,
            Model model, Authentication authentication) {

        // Si ya hay sesión activa, el login no tiene sentido: volver al panel
        if (isLoggedIn(authentication)) {
            return "redirect:/";
        }

        if ("bloqueado".equals(error)) {
            model.addAttribute("error",
                    "Cuenta bloqueada por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.");
        } else if (error != null) {
            model.addAttribute("error",
                    "Credenciales inválidas o acceso no autorizado. Solo administradores pueden usar login tradicional.");
        }
        if (logout != null) {
            model.addAttribute("logout", "Has cerrado sesión correctamente");
        }

        return "login";
    }

    @GetMapping("/login-escondido-76159942")
    public String loginAdmin(@RequestParam(value = "error", required = false) String error,
                             @RequestParam(value = "logout", required = false) String logout,
                             Model model, Authentication authentication) {
        if (isLoggedIn(authentication)) {
            return "redirect:/";
        }
        if ("bloqueado".equals(error)) {
            model.addAttribute("error",
                    "Cuenta bloqueada por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.");
        } else if (error != null) {
            model.addAttribute("error",
                    "Credenciales inválidas. Verifica tu usuario y contraseña.");
        }
        if (logout != null) {
            model.addAttribute("logout", "Has cerrado sesión correctamente");
        }
        return "login-emergencia";
    }

    /**
     * Destino del accessDeniedPage de Spring Security: se muestra la misma
     * página 404 para no revelar que la ruta existe pero está restringida.
     */
    @GetMapping("/acceso-denegado")
    public String accesoDenegado() {
        return "error/404";
    }

    @GetMapping("/personal")
    public String personal(Model model, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            if (usuario != null) {
                model.addAttribute("userName", usuario.getNombreCompleto());
                model.addAttribute("userRole", usuario.getRoles().stream()
                        .map(Rol::getNombre)
                        .collect(Collectors.joining(", ")));
            }
        }
        return "personal";
    }

    @GetMapping("/inventario")
    public String inventario(Model model, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            if (usuario != null) {
                model.addAttribute("userName", usuario.getNombreCompleto());
                model.addAttribute("userRole", usuario.getRoles().stream()
                        .map(Rol::getNombre)
                        .collect(Collectors.joining(", ")));
            }
        }
        return "inventario";
    }

    @GetMapping("/ventas")
    public String ventas(Model model, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            if (usuario != null) {
                model.addAttribute("userName", usuario.getNombreCompleto());
                model.addAttribute("userRole", usuario.getRoles().stream()
                        .map(Rol::getNombre)
                        .collect(Collectors.joining(", ")));
            }
        }
        return "ventas";
    }

    @GetMapping("/reportes")
    public String reportes(Model model, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            if (usuario != null) {
                model.addAttribute("userName", usuario.getNombreCompleto());
                model.addAttribute("userRole", usuario.getRoles().stream()
                        .map(Rol::getNombre)
                        .collect(Collectors.joining(", ")));
            }
        }
        return "reportes";
    }

}