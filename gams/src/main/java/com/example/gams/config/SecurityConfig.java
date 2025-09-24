package com.example.gams.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                // Permitir acceso libre a recursos estáticos
                .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico", "/estilos/**").permitAll()
                // Permitir acceso libre a la página de login
                .requestMatchers("/", "/login", "/api/facial-recognition/**").permitAll()
                // Todas las demás rutas requieren autenticación
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")  // Página personalizada de login
                .loginProcessingUrl("/login")  // Procesar el formulario en la misma ruta
                .usernameParameter("username")  // Nombre del campo username
                .passwordParameter("password")   // Nombre del campo password
                .defaultSuccessUrl("/dashboard", true)  // Redirigir al dashboard tras login exitoso
                .failureUrl("/login?error=true")  // Redirigir al login con error si falla
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")  // Deshabilitar CSRF para APIs
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails admin = User.builder()
                .username("admin")
                .password(passwordEncoder().encode("admin123"))
                .roles("ADMIN")
                .build();

        UserDetails vendedor = User.builder()
                .username("vendedor1")
                .password(passwordEncoder().encode("vend123"))
                .roles("VENDEDOR")
                .build();

        UserDetails almacen = User.builder()
                .username("almacen1")
                .password(passwordEncoder().encode("alm123"))
                .roles("ALMACEN")
                .build();

        return new InMemoryUserDetailsManager(admin, vendedor, almacen);
    }
}