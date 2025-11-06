package com.example.gams.dto;

import com.example.gams.entities.ProductoVariante;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class VarianteDTO {
    
    private Integer id;
    private Integer productoId;
    private String productoCodigo;
    private String productoNombre;
    private String categoriaNombre;
    private String marcaNombre;
    private Integer colorId;
    private String colorNombre;
    private String colorCodigoHex;
    private Integer tallaId;
    private String tallaNombre;
    private String sku;
    private String codigoBarras;
    private Integer stockActual;
    private Integer stockMinimo;
    private Integer stockMaximo;
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private BigDecimal precioVenta;
    private BigDecimal precioCompra;
    private Boolean bajoStock; // Indica si está bajo stock
    private Boolean sinStock; // Indica si no tiene stock
    
    // Constructores
    public VarianteDTO() {}
    
    public VarianteDTO(ProductoVariante variante) {
        this.id = variante.getId();
        this.productoId = variante.getProducto().getId();
        this.productoCodigo = variante.getProducto().getCodigo();
        this.productoNombre = variante.getProducto().getNombre();
        this.categoriaNombre = variante.getProducto().getCategoria().getNombre();
        this.marcaNombre = variante.getProducto().getMarca() != null ? 
                          variante.getProducto().getMarca().getNombre() : null;
        this.colorId = variante.getColor().getId();
        this.colorNombre = variante.getColor().getNombre();
        this.colorCodigoHex = variante.getColor().getCodigoHex();
        this.tallaId = variante.getTalla().getId();
        this.tallaNombre = variante.getTalla().getNombre();
        this.sku = variante.getSku();
        this.codigoBarras = variante.getCodigoBarras();
        this.stockActual = variante.getStockActual();
        this.stockMinimo = variante.getStockMinimo();
        this.stockMaximo = variante.getStockMaximo();
        this.activo = variante.getActivo();
        this.fechaCreacion = variante.getFechaCreacion();
        this.fechaActualizacion = variante.getFechaActualizacion();
        this.precioVenta = variante.getProducto().getPrecioVenta();
        this.precioCompra = variante.getProducto().getPrecioCompra();
        this.bajoStock = variante.esBajoStock();
        this.sinStock = !variante.tieneStock();
    }
    
    // Getters y Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public Integer getProductoId() {
        return productoId;
    }
    
    public void setProductoId(Integer productoId) {
        this.productoId = productoId;
    }
    
    public String getProductoCodigo() {
        return productoCodigo;
    }
    
    public void setProductoCodigo(String productoCodigo) {
        this.productoCodigo = productoCodigo;
    }
    
    public String getProductoNombre() {
        return productoNombre;
    }
    
    public void setProductoNombre(String productoNombre) {
        this.productoNombre = productoNombre;
    }
    
    public String getCategoriaNombre() {
        return categoriaNombre;
    }
    
    public void setCategoriaNombre(String categoriaNombre) {
        this.categoriaNombre = categoriaNombre;
    }
    
    public String getMarcaNombre() {
        return marcaNombre;
    }
    
    public void setMarcaNombre(String marcaNombre) {
        this.marcaNombre = marcaNombre;
    }
    
    public Integer getColorId() {
        return colorId;
    }
    
    public void setColorId(Integer colorId) {
        this.colorId = colorId;
    }
    
    public String getColorNombre() {
        return colorNombre;
    }
    
    public void setColorNombre(String colorNombre) {
        this.colorNombre = colorNombre;
    }
    
    public String getColorCodigoHex() {
        return colorCodigoHex;
    }
    
    public void setColorCodigoHex(String colorCodigoHex) {
        this.colorCodigoHex = colorCodigoHex;
    }
    
    public Integer getTallaId() {
        return tallaId;
    }
    
    public void setTallaId(Integer tallaId) {
        this.tallaId = tallaId;
    }
    
    public String getTallaNombre() {
        return tallaNombre;
    }
    
    public void setTallaNombre(String tallaNombre) {
        this.tallaNombre = tallaNombre;
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
    
    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }
    
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }
    
    public BigDecimal getPrecioVenta() {
        return precioVenta;
    }
    
    public void setPrecioVenta(BigDecimal precioVenta) {
        this.precioVenta = precioVenta;
    }
    
    public BigDecimal getPrecioCompra() {
        return precioCompra;
    }
    
    public void setPrecioCompra(BigDecimal precioCompra) {
        this.precioCompra = precioCompra;
    }
    
    public Boolean getBajoStock() {
        return bajoStock;
    }
    
    public void setBajoStock(Boolean bajoStock) {
        this.bajoStock = bajoStock;
    }
    
    public Boolean getSinStock() {
        return sinStock;
    }
    
    public void setSinStock(Boolean sinStock) {
        this.sinStock = sinStock;
    }
}