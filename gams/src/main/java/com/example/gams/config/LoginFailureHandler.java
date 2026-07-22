package com.example.gams.config;

import com.example.gams.repositories.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@RequiredArgsConstructor
@Component
public class LoginFailureHandler implements AuthenticationFailureHandler {

    private static final int MAX_INTENTOS    = 5;
    private static final int MINUTOS_BLOQUEO = 15;

    private final UsuarioRepository usuarioRepository;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        boolean desdeAdmin = "admin".equals(request.getParameter("from"));

        // Si la cuenta ya estaba bloqueada no incrementamos el contador
        if (exception instanceof LockedException) {
            response.sendRedirect(desdeAdmin
                    ? "/login-escondido-76159942?error=bloqueado"
                    : "/login?error=bloqueado");
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

        response.sendRedirect(desdeAdmin
                ? "/login-escondido-76159942?error=true"
                : "/login?error=true");
    }
}
