package com.example.gams.dto;

import com.example.gams.entities.Producto;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductoDTO {
    private Integer id;
    private String codigo;
    private String nombre;
    private String descripcion;
    private String imagenUrl;
    private Integer categoriaId;
    private String categoriaNombre;
    private Integer marcaId;
    private String marcaNombre;
    private String genero;
    private String temporada;
    private BigDecimal precioCompra;
    private BigDecimal precioVenta;
    private BigDecimal porcentajeGanancia;
    private Integer stockMinimo;  // NUEVO
    private Integer stockMaximo;  // NUEVO
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    
    // Campos calculados
    private Long stockTotal;
    private Integer cantidadVariantes;
    
    // Constructor vacío
    public ProductoDTO() {}
    
    // Constructor desde entidad
    public ProductoDTO(Producto producto) {
        this.id = producto.getId();
        this.codigo = producto.getCodigo();
        this.nombre = producto.getNombre();
        this.descripcion = producto.getDescripcion();
        this.imagenUrl = producto.getImagenUrl();
        this.genero = producto.getGenero() != null ? producto.getGenero().name() : null;
        this.temporada = producto.getTemporada() != null ? producto.getTemporada().name() : null;
        this.precioCompra = producto.getPrecioCompra();
        this.precioVenta = producto.getPrecioVenta();
        this.porcentajeGanancia = producto.getPorcentajeGanancia();
        this.stockMinimo = producto.getStockMinimo();  // NUEVO
        this.stockMaximo = producto.getStockMaximo();  // NUEVO
        this.activo = producto.getActivo();
        this.fechaCreacion = producto.getFechaCreacion();
        this.fechaActualizacion = producto.getFechaActualizacion();
        
        if (producto.getCategoria() != null) {
            this.categoriaId = producto.getCategoria().getId();
            this.categoriaNombre = producto.getCategoria().getNombre();
        }
        
        if (producto.getMarca() != null) {
            this.marcaId = producto.getMarca().getId();
            this.marcaNombre = producto.getMarca().getNombre();
        }
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
    
    public String getNombre() {
        return nombre;
    }
    
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    
    public String getDescripcion() {
        return descripcion;
    }
    
    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
    
    public String getImagenUrl() {
        return imagenUrl;
    }
    
    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }
    
    public Integer getCategoriaId() {
        return categoriaId;
    }
    
    public void setCategoriaId(Integer categoriaId) {
        this.categoriaId = categoriaId;
    }
    
    public String getCategoriaNombre() {
        return categoriaNombre;
    }
    
    public void setCategoriaNombre(String categoriaNombre) {
        this.categoriaNombre = categoriaNombre;
    }
    
    public Integer getMarcaId() {
        return marcaId;
    }
    
    public void setMarcaId(Integer marcaId) {
        this.marcaId = marcaId;
    }
    
    public String getMarcaNombre() {
        return marcaNombre;
    }
    
    public void setMarcaNombre(String marcaNombre) {
        this.marcaNombre = marcaNombre;
    }
    
    public String getGenero() {
        return genero;
    }
    
    public void setGenero(String genero) {
        this.genero = genero;
    }
    
    public String getTemporada() {
        return temporada;
    }
    
    public void setTemporada(String temporada) {
        this.temporada = temporada;
    }
    
    public BigDecimal getPrecioCompra() {
        return precioCompra;
    }
    
    public void setPrecioCompra(BigDecimal precioCompra) {
        this.precioCompra = precioCompra;
    }
    
    public BigDecimal getPrecioVenta() {
        return precioVenta;
    }
    
    public void setPrecioVenta(BigDecimal precioVenta) {
        this.precioVenta = precioVenta;
    }
    
    public BigDecimal getPorcentajeGanancia() {
        return porcentajeGanancia;
    }
    
    public void setPorcentajeGanancia(BigDecimal porcentajeGanancia) {
        this.porcentajeGanancia = porcentajeGanancia;
    }
    
    // NUEVOS GETTERS Y SETTERS
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
    
    public Long getStockTotal() {
        return stockTotal;
    }
    
    public void setStockTotal(Long stockTotal) {
        this.stockTotal = stockTotal;
    }
    
    public Integer getCantidadVariantes() {
        return cantidadVariantes;
    }
    
    public void setCantidadVariantes(Integer cantidadVariantes) {
        this.cantidadVariantes = cantidadVariantes;
    }
}