package com.example.gams.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "productos_variantes", uniqueConstraints = @UniqueConstraint(columnNames = { "producto_id", "color_id",
        "talla_id" }))
public class ProductoVariante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "color_id", nullable = false)
    private Color color;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "talla_id", nullable = false)
    private Talla talla;

    @Column(unique = true, length = 100)
    private String sku;

    @Column(name = "codigo_barras", unique = true, length = 100)
    private String codigoBarras;

    @Column(name = "stock_actual", nullable = false)
    private Integer stockActual = 0;

    @Column(name = "stock_minimo")
    private Integer stockMinimo;

    @Column(name = "stock_maximo")
    private Integer stockMaximo;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
        // Generar SKU automático si no existe
        if (sku == null || sku.isEmpty()) {
            generarSku();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }

    // Método para generar SKU automático
    private void generarSku() {
        if (producto != null && color != null && talla != null) {
            String codigoProducto = producto.getCodigo();
            String nombreColor = color.getNombre() != null ? color.getNombre().toUpperCase().replace(" ", "-")
                    : "COLOR";
            String nombreTalla = talla.getNombre() != null ? talla.getNombre().toUpperCase() : "TALLA";

            this.sku = String.format("%s-%s-%s", codigoProducto, nombreColor, nombreTalla);
        }
    }

    // Métodos de utilidad para stock
    public boolean esBajoStock() {
        return stockActual != null && stockMinimo != null && stockActual <= stockMinimo;
    }

    public boolean esSobreStock() {
        return stockActual != null && stockMaximo != null && stockActual >= stockMaximo;
    }

    public boolean tieneStock() {
        return stockActual != null && stockActual > 0;
    }

    // Constructores
    public ProductoVariante() {
    }

    public ProductoVariante(Producto producto, Color color, Talla talla, Integer stockActual) {
        this.producto = producto;
        this.color = color;
        this.talla = talla;
        this.stockActual = stockActual;
        generarSku();
    }

    // Getters y Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }

    public Talla getTalla() {
        return talla;
    }

    public void setTalla(Talla talla) {
        this.talla = talla;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getCodigoBarras() {
        return codigoBarras;
    }

    public void setCodigoBarras(String codigoBarras) {
        this.codigoBarras = codigoBarras;
    }

    public Integer getStockActual() {
        return stockActual;
    }

    public void setStockActual(Integer stockActual) {
        this.stockActual = stockActual;
    }

    public Integer getStockMinimo() {
        return stockMinimo;
    }

    public void setStockMinimo(Integer stockMinimo) {
        this.stockMinimo = stockMinimo;
    }

    public Integer getStockMaximo() {
        return stockMaximo;
    }

    public void setStockMaximo(Integer stockMaximo) {
        this.stockMaximo = stockMaximo;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    @Transient
    public Integer getStock() {
        return stockActual;
    }

    public void setStock(Integer stock) {
        this.stockActual = stock;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }

}