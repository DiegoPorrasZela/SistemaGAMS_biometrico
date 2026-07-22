package com.example.gams.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Sesión de caja (turno): se abre con un monto inicial de efectivo,
 * acumula las ventas del periodo y se cierra contando el efectivo físico.
 * La diferencia entre lo esperado y lo contado es el resultado del arqueo.
 */
@Entity
@Table(name = "cajas_sesiones")
public class CajaSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_apertura_id", nullable = false)
    private Usuario usuarioApertura;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDateTime fechaApertura;

    // Efectivo con el que arranca el turno (sencillo para dar vuelto)
    @Column(name = "monto_inicial", nullable = false, precision = 10, scale = 2)
    private BigDecimal montoInicial;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCaja estado = EstadoCaja.ABIERTA;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_cierre_id")
    private Usuario usuarioCierre;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    // Totales congelados al momento del cierre
    @Column(name = "total_ventas", precision = 10, scale = 2)
    private BigDecimal totalVentas;

    @Column(name = "total_efectivo", precision = 10, scale = 2)
    private BigDecimal totalEfectivo;

    // monto_inicial + total_efectivo: lo que debería haber en el cajón
    @Column(name = "monto_esperado", precision = 10, scale = 2)
    private BigDecimal montoEsperado;

    // Efectivo contado físicamente al cerrar
    @Column(name = "monto_real", precision = 10, scale = 2)
    private BigDecimal montoReal;

    // monto_real - monto_esperado (negativo = faltante, positivo = sobrante)
    @Column(precision = 10, scale = 2)
    private BigDecimal diferencia;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    public enum EstadoCaja {
        ABIERTA,
        CERRADA
    }

    @PrePersist
    protected void onCreate() {
        if (fechaApertura == null) {
            fechaApertura = LocalDateTime.now();
        }
    }

    public boolean estaAbierta() {
        return estado == EstadoCaja.ABIERTA;
    }

    // Constructores
    public CajaSesion() {
    }

    public CajaSesion(Usuario usuarioApertura, BigDecimal montoInicial) {
        this.usuarioApertura = usuarioApertura;
        this.montoInicial = montoInicial;
    }

    // Getters y Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Usuario getUsuarioApertura() {
        return usuarioApertura;
    }

    public void setUsuarioApertura(Usuario usuarioApertura) {
        this.usuarioApertura = usuarioApertura;
    }

    public LocalDateTime getFechaApertura() {
        return fechaApertura;
    }

    public void setFechaApertura(LocalDateTime fechaApertura) {
        this.fechaApertura = fechaApertura;
    }

    public BigDecimal getMontoInicial() {
        return montoInicial;
    }

    public void setMontoInicial(BigDecimal montoInicial) {
        this.montoInicial = montoInicial;
    }

    public EstadoCaja getEstado() {
        return estado;
    }

    public void setEstado(EstadoCaja estado) {
        this.estado = estado;
    }

    public Usuario getUsuarioCierre() {
        return usuarioCierre;
    }

    public void setUsuarioCierre(Usuario usuarioCierre) {
        this.usuarioCierre = usuarioCierre;
    }

    public LocalDateTime getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(LocalDateTime fechaCierre) {
        this.fechaCierre = fechaCierre;
    }

    public BigDecimal getTotalVentas() {
        return totalVentas;
    }

    public void setTotalVentas(BigDecimal totalVentas) {
        this.totalVentas = totalVentas;
    }

    public BigDecimal getTotalEfectivo() {
        return totalEfectivo;
    }

    public void setTotalEfectivo(BigDecimal totalEfectivo) {
        this.totalEfectivo = totalEfectivo;
    }

    public BigDecimal getMontoEsperado() {
        return montoEsperado;
    }

    public void setMontoEsperado(BigDecimal montoEsperado) {
        this.montoEsperado = montoEsperado;
    }

    public BigDecimal getMontoReal() {
        return montoReal;
    }

    public void setMontoReal(BigDecimal montoReal) {
        this.montoReal = montoReal;
    }

    public BigDecimal getDiferencia() {
        return diferencia;
    }

    public void setDiferencia(BigDecimal diferencia) {
        this.diferencia = diferencia;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}