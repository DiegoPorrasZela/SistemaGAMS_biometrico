package com.example.gams.config;

import com.example.gams.repositories.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
public class LoginFailureHandler implements AuthenticationFailureHandler {

    private static final int MAX_INTENTOS    = 5;
    private static final int MINUTOS_BLOQUEO = 15;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        // Si la cuenta ya estaba bloqueada no incrementamos el contador
        if (exception instanceof LockedException) {
            response.sendRedirect("/login?error=bloqueado");
            return;
        }

        String username = request.getParameter("username");
        if (username != null && !username.isBlank()) {
            usuarioRepository.findByUsername(username).ifPresent(usuario -> {
                // Tampoco incrementar si ya está bloqueado por tiempo
                if (usuario.getBloqueadoHasta() != null &&
                        usuario.getBloqueadoHasta().isAfter(LocalDateTime.now())) {
                    return;
                }

                int intentos = usuario.getIntentosFallidos() + 1;
                usuario.setIntentosFallidos(intentos);

                if (intentos >= MAX_INTENTOS) {
                    usuario.setBloqueadoHasta(LocalDateTime.now().plusMinutes(MINUTOS_BLOQUEO));
                    usuario.setIntentosFallidos(0); // resetear para el próximo ciclo
                }

                usuarioRepository.save(usuario);
            });
        }

        response.sendRedirect("/login?error=true");
    }
}
