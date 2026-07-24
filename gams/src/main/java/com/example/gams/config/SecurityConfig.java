package com.example.gams.config;

import com.example.gams.services.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@RequiredArgsConstructor
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final LoginFailureHandler loginFailureHandler;
    private final LoginSuccessHandler loginSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                // Permitir acceso libre a recursos estáticos
                .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico", "/estilos/**").permitAll()
                // Solo la página de login y el endpoint de reconocimiento (para login facial) son públicos
                .requestMatchers("/login").permitAll()
                .requestMatchers("/login-escondido-76159942").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/facial-recognition").permitAll()
                // Páginas por rol
                .requestMatchers("/ventas").hasAnyRole("ADMIN", "VENDEDOR")
                .requestMatchers("/inventario").hasAnyRole("ADMIN", "ALMACEN")
                .requestMatchers("/personal", "/reportes").hasRole("ADMIN")
                // APIs por rol (mismo criterio que las páginas que las consumen)
                .requestMatchers("/api/usuarios/current").authenticated()
                .requestMatchers("/api/usuarios/**").hasRole("ADMIN")
                .requestMatchers("/api/facial-recognition/**").hasRole("ADMIN")
                .requestMatchers("/api/ventas/**", "/api/caja/**", "/api/clientes/**").hasAnyRole("ADMIN", "VENDEDOR")
                // Redistribuir stock entre ubicaciones es tarea de almacén
                .requestMatchers(HttpMethod.PUT, "/api/productos/variantes/*/ubicaciones")
                        .hasAnyRole("ADMIN", "ALMACEN")
                .requestMatchers("/api/productos/**").hasAnyRole("ADMIN", "ALMACEN", "VENDEDOR")
                .requestMatchers("/api/inventario/**", "/api/catalogo/**", "/api/proveedores/**",
                        "/api/movimientos/**").hasAnyRole("ADMIN", "ALMACEN")
                // TODAS las demás rutas requieren autenticación (incluyendo "/")
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                // Ruta sin permiso: mostrar la página 404 (no revelar que la ruta existe)
                .accessDeniedPage("/acceso-denegado")
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .usernameParameter("username")
                .passwordParameter("password")
                .successHandler(loginSuccessHandler)
                .failureHandler(loginFailureHandler)
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .userDetailsService(userDetailsService)  // Usar nuestro servicio personalizado
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

}