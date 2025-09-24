package com.example.gams.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class NavigationController {
    
    @GetMapping("/")
    public String index() {
        // Redirigir directamente al login
        return "redirect:/login";
    }
    
    @GetMapping("/login")
    public String login(@RequestParam(value = "error", required = false) String error,
                       @RequestParam(value = "logout", required = false) String logout,
                       Model model) {
        
        if (error != null) {
            model.addAttribute("error", "Credenciales inválidas");
        }
        if (logout != null) {
            model.addAttribute("logout", "Has cerrado sesión correctamente");
        }
        
        return "login"; // Renderiza login.html
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return "dashboard";
    }
}