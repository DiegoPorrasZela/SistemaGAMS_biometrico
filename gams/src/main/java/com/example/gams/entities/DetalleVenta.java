package com.example.gams.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "detalles_venta")
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    // Permitir NULL para conservar el historial si se elimina la variante
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variante_id", nullable = true)
    private ProductoVariante variante;

    // Snapshot de la variante al momento de la venta: el historial no se
    // corrompe si luego cambia el precio o se elimina la variante
    @Column(name = "variante_sku", length = 100)
    private String varianteSku;

    @Column(name = "producto_nombre", nullable = false, length = 200)
    private String productoNombre;

    @Column(name = "color_nombre", length = 50)
    private String colorNombre;

    @Column(name = "talla_nombre", length = 20)
    private String tallaNombre;

    @Column(nullable = false)
    private Integer cantidad;

    // Precio congelado al momento de la venta
    @Column(name = "precio_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    // Métodos de utilidad

    // Copia los datos descriptivos de la variante y calcula el subtotal
    public void aplicarSnapshot(ProductoVariante variante, BigDecimal precioUnitario, Integer cantidad) {
        this.variante = variante;
        this.varianteSku = variante.getSku();
        this.productoNombre = variante.getProducto().getNombre();
        this.colorNombre = variante.getColor() != null ? variante.getColor().getNombre() : null;
        this.tallaNombre = variante.getTalla() != null ? variante.getTalla().getNombre() : null;
        this.precioUnitario = precioUnitario;
        this.cantidad = cantidad;
        calcularSubtotal();
    }

    public void calcularSubtotal() {
        if (precioUnitario != null && cantidad != null) {
            this.subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
        } else {
            this.subtotal = BigDecimal.ZERO;
        }
    }

    // Descripción legible de la línea, ej. "Polo Básico (Rojo / M)"
    @Transient
    public String getDescripcion() {
        StringBuilder sb = new StringBuilder(productoNombre != null ? productoNombre : "");
        if (colorNombre != null || tallaNombre != null) {
            sb.append(" (");
            if (colorNombre != null) {
                sb.append(colorNombre);
            }
            if (colorNombre != null && tallaNombre != null) {
                sb.append(" / ");
            }
            if (tallaNombre != null) {
                sb.append(tallaNombre);
            }
            sb.append(")");
        }
        return sb.toString();
    }

    // Constructores
    public DetalleVenta() {
    }

    public DetalleVenta(ProductoVariante variante, BigDecimal precioUnitario, Integer cantidad) {
        aplicarSnapshot(variante, precioUnitario, cantidad);
    }

    // Getters y Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Venta getVenta() {
        return venta;
    }

    public void setVenta(Venta venta) {
        this.venta = venta;
    }

    public ProductoVariante getVariante() {
        return variante;
    }

    public void setVariante(ProductoVariante variante) {
        this.variante = variante;
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

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }
}