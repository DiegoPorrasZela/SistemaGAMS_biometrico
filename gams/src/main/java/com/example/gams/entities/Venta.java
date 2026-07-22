package com.example.gams.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ventas")
public class Venta {

    // Tasa de IGV vigente en Perú (18%). Solo se usa para el desglose
    // informativo del comprobante: los precios de venta ya incluyen IGV.
    private static final BigDecimal FACTOR_IGV = new BigDecimal("1.18");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Correlativo interno del comprobante, ej. V-2026-00001
    @Column(unique = true, nullable = false, length = 20)
    private String codigo;

    @Column(nullable = false)
    private LocalDateTime fecha;

    // Vendedor que registró la venta
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendedor_id", nullable = false)
    private Usuario vendedor;

    // Cliente opcional: NULL representa la venta rápida de mostrador ("Cliente Varios")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoVenta estado = EstadoVenta.COMPLETADA;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 20)
    private MetodoPago metodoPago;

    // Suma de los subtotales de las líneas, antes del descuento
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal descuento = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    // Solo para pagos en efectivo: con cuánto pagó el cliente y su vuelto
    @Column(name = "monto_recibido", precision = 10, scale = 2)
    private BigDecimal montoRecibido;

    @Column(precision = 10, scale = 2)
    private BigDecimal vuelto;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    // Datos de anulación (la venta nunca se elimina, se anula)
    @Column(name = "fecha_anulacion")
    private LocalDateTime fechaAnulacion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_anulacion_id")
    private Usuario usuarioAnulacion;

    @Column(name = "motivo_anulacion", columnDefinition = "TEXT")
    private String motivoAnulacion;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<DetalleVenta> detalles = new ArrayList<>();

    public enum EstadoVenta {
        COMPLETADA,   // Venta registrada y stock descontado
        ANULADA       // Venta revertida: el stock fue devuelto
    }

    public enum MetodoPago {
        EFECTIVO,
        TARJETA,
        YAPE,
        PLIN,
        TRANSFERENCIA
    }

    @PrePersist
    protected void onCreate() {
        if (fecha == null) {
            fecha = LocalDateTime.now();
        }
    }

    // Métodos de utilidad

    // Agrega una línea manteniendo la relación bidireccional
    public void agregarDetalle(DetalleVenta detalle) {
        detalle.setVenta(this);
        this.detalles.add(detalle);
    }

    // Recalcula subtotal y total a partir de las líneas y el descuento
    public void recalcularTotales() {
        this.subtotal = detalles.stream()
                .map(DetalleVenta::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal desc = descuento != null ? descuento : BigDecimal.ZERO;
        this.total = subtotal.subtract(desc);
    }

    public boolean esAnulada() {
        return estado == EstadoVenta.ANULADA;
    }

    // Desglose informativo del IGV: el total ya lo incluye
    @Transient
    public BigDecimal getOperacionGravada() {
        if (total == null || total.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return total.divide(FACTOR_IGV, 2, RoundingMode.HALF_UP);
    }

    @Transient
    public BigDecimal getIgv() {
        if (total == null) {
            return BigDecimal.ZERO;
        }
        return total.subtract(getOperacionGravada());
    }

    @Transient
    public int getTotalUnidades() {
        return detalles.stream()
                .mapToInt(d -> d.getCantidad() != null ? d.getCantidad() : 0)
                .sum();
    }

    // Nombre a mostrar en el ticket cuando no se registró cliente
    @Transient
    public String getNombreCliente() {
        return cliente != null ? cliente.getNombre() : "Cliente Varios";
    }

    // Constructores
    public Venta() {
    }

    public Venta(String codigo, Usuario vendedor, MetodoPago metodoPago) {
        this.codigo = codigo;
        this.vendedor = vendedor;
        this.metodoPago = metodoPago;
    }

    // Getters y Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public Usuario getVendedor() {
        return vendedor;
    }

    public void setVendedor(Usuario vendedor) {
        this.vendedor = vendedor;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public EstadoVenta getEstado() {
        return estado;
    }

    public void setEstado(EstadoVenta estado) {
        this.estado = estado;
    }

    public MetodoPago getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(MetodoPago metodoPago) {
        this.metodoPago = metodoPago;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getDescuento() {
        return descuento;
    }

    public void setDescuento(BigDecimal descuento) {
        this.descuento = descuento;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public BigDecimal getMontoRecibido() {
        return montoRecibido;
    }

    public void setMontoRecibido(BigDecimal montoRecibido) {
        this.montoRecibido = montoRecibido;
    }

    public BigDecimal getVuelto() {
        return vuelto;
    }

    public void setVuelto(BigDecimal vuelto) {
        this.vuelto = vuelto;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public LocalDateTime getFechaAnulacion() {
        return fechaAnulacion;
    }

    public void setFechaAnulacion(LocalDateTime fechaAnulacion) {
        this.fechaAnulacion = fechaAnulacion;
    }

    public Usuario getUsuarioAnulacion() {
        return usuarioAnulacion;
    }

    public void setUsuarioAnulacion(Usuario usuarioAnulacion) {
        this.usuarioAnulacion = usuarioAnulacion;
    }

    public String getMotivoAnulacion() {
        return motivoAnulacion;
    }

    public void setMotivoAnulacion(String motivoAnulacion) {
        this.motivoAnulacion = motivoAnulacion;
    }

    public List<DetalleVenta> getDetalles() {
        return detalles;
    }

    public void setDetalles(List<DetalleVenta> detalles) {
        this.detalles = detalles;
    }
}