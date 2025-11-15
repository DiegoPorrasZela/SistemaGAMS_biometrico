package com.example.gams.dto;

import com.example.gams.entities.MovimientoInventario;
import java.time.LocalDateTime;

public class MovimientoDTO {
    
    private Integer id;
    private Integer varianteId;
    private String varianteSku;
    private String productoNombre;
    private String colorNombre;
    private String tallaNombre;
    private MovimientoInventario.TipoMovimiento tipo;
    private Integer cantidad;
    private Integer stockAnterior;
    private Integer stockNuevo;
    private String motivo;
    private String referencia;
    private Integer usuarioId;
    private String usuarioNombre;
    private LocalDateTime fecha;
    
    // Constructores
    public MovimientoDTO() {}
    
    public MovimientoDTO(MovimientoInventario movimiento) {
        this.id = movimiento.getId();
        this.tipo = movimiento.getTipo();
        this.cantidad = movimiento.getCantidad();
        this.stockAnterior = movimiento.getStockAnterior();
        this.stockNuevo = movimiento.getStockNuevo();
        this.motivo = movimiento.getMotivo();
        this.referencia = movimiento.getReferencia();
        this.fecha = movimiento.getFecha();
        
        // Usuario siempre existe
        this.usuarioId = movimiento.getUsuario().getId();
        this.usuarioNombre = movimiento.getUsuario().getNombre() + " " + movimiento.getUsuario().getApellidos();
        
        // Si la variante aún existe, usar sus datos
        // Si fue eliminada, usar los datos desnormalizados guardados
        if (movimiento.getVariante() != null) {
            this.varianteId = movimiento.getVariante().getId();
            this.varianteSku = movimiento.getVariante().getSku();
            this.productoNombre = movimiento.getVariante().getProducto().getNombre();
            this.colorNombre = movimiento.getVariante().getColor().getNombre();
            this.tallaNombre = movimiento.getVariante().getTalla().getNombre();
        } else {
            // Variante eliminada - usar datos históricos
            this.varianteId = null;
            this.varianteSku = movimiento.getVarianteSku();
            this.productoNombre = movimiento.getProductoNombre();
            this.colorNombre = movimiento.getColorNombre();
            this.tallaNombre = movimiento.getTallaNombre();
        }
    }
    
    // Getters y Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public Integer getVarianteId() {
        return varianteId;
    }
    
    public void setVarianteId(Integer varianteId) {
        this.varianteId = varianteId;
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
    
    public MovimientoInventario.TipoMovimiento getTipo() {
        return tipo;
    }
    
    public void setTipo(MovimientoInventario.TipoMovimiento tipo) {
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
    
    public Integer getUsuarioId() {
        return usuarioId;
    }
    
    public void setUsuarioId(Integer usuarioId) {
        this.usuarioId = usuarioId;
    }
    
    public String getUsuarioNombre() {
        return usuarioNombre;
    }
    
    public void setUsuarioNombre(String usuarioNombre) {
        this.usuarioNombre = usuarioNombre;
    }
    
    public LocalDateTime getFecha() {
        return fecha;
    }
    
    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}