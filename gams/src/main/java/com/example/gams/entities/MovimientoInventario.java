package com.example.gams.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimientos_inventario")
public class MovimientoInventario {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variante_id", nullable = true)  // Permitir NULL para conservar historial
    private ProductoVariante variante;
    
    // Campos adicionales para mantener información incluso si se elimina la variante
    @Column(name = "variante_sku", length = 50)
    private String varianteSku;
    
    @Column(name = "producto_nombre", length = 200)
    private String productoNombre;
    
    @Column(name = "color_nombre", length = 50)
    private String colorNombre;
    
    @Column(name = "talla_nombre", length = 20)
    private String tallaNombre;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimiento tipo;
    
    @Column(nullable = false)
    private Integer cantidad;
    
    @Column(name = "stock_anterior", nullable = false)
    private Integer stockAnterior;
    
    @Column(name = "stock_nuevo", nullable = false)
    private Integer stockNuevo;
    
    @Column(columnDefinition = "TEXT")
    private String motivo;
    
    @Column(length = 100)
    private String referencia;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
    
    @Column(nullable = false)
    private LocalDateTime fecha;
    
    public enum TipoMovimiento {
        ENTRADA,      // Compra o ingreso de mercadería
        SALIDA,       // Venta, salida o eliminación de variante
        AJUSTE,       // Corrección de inventario
        DEVOLUCION    // Devolución de cliente
    }
    
    @PrePersist
    protected void onCreate() {
        fecha = LocalDateTime.now();
    }
    
    // Constructores
    public MovimientoInventario() {}
    
    public MovimientoInventario(ProductoVariante variante, TipoMovimiento tipo, 
                               Integer cantidad, Integer stockAnterior, 
                               Integer stockNuevo, Usuario usuario) {
        this.variante = variante;
        this.tipo = tipo;
        this.cantidad = cantidad;
        this.stockAnterior = stockAnterior;
        this.stockNuevo = stockNuevo;
        this.usuario = usuario;
    }
    
    // Getters y Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public ProductoVariante getVariante() {
        return variante;
    }
    
    public void setVariante(ProductoVariante variante) {
        this.variante = variante;
    }
    
    public TipoMovimiento getTipo() {
        return tipo;
    }
    
    public void setTipo(TipoMovimiento tipo) {
        this.tipo = tipo;
    }
    
    public Integer getCantidad() {
        return cantidad;
    }
    
    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }
    
    public Integer getStockAnterior() {
        return stockAnterior;
    }
    
    public void setStockAnterior(Integer stockAnterior) {
        this.stockAnterior = stockAnterior;
    }
    
    public Integer getStockNuevo() {
        return stockNuevo;
    }
    
    public void setStockNuevo(Integer stockNuevo) {
        this.stockNuevo = stockNuevo;
    }
    
    public String getMotivo() {
        return motivo;
    }
    
    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }
    
    public String getReferencia() {
        return referencia;
    }
    
    public void setReferencia(String referencia) {
        this.referencia = referencia;
    }
    
    public Usuario getUsuario() {
        return usuario;
    }
    
    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }
    
    public LocalDateTime getFecha() {
        return fecha;
    }
    
    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
    
    public String getVarianteSku() {
        return varianteSku;
    }
    
    public void setVarianteSku(String varianteSku) {
        this.varianteSku = varianteSku;
    }
    
    public String getProductoNombre() {
        return productoNombre;
    }
    
    public void setProductoNombre(String productoNombre) {
        this.productoNombre = productoNombre;
    }
    
    public String getColorNombre() {
        return colorNombre;
    }
    
    public void setColorNombre(String colorNombre) {
        this.colorNombre = colorNombre;
    }
    
    public String getTallaNombre() {
        return tallaNombre;
    }
    
    public void setTallaNombre(String tallaNombre) {
        this.tallaNombre = tallaNombre;
    }
}