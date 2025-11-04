package com.example.gams.repositories;

import com.example.gams.entities.MovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Integer> {
    
    // Listar movimientos de una variante
    List<MovimientoInventario> findByVarianteIdOrderByFechaDesc(Integer varianteId);
    
    // Listar movimientos por tipo
    List<MovimientoInventario> findByTipoOrderByFechaDesc(MovimientoInventario.TipoMovimiento tipo);
    
    // Listar movimientos por usuario
    List<MovimientoInventario> findByUsuarioIdOrderByFechaDesc(Integer usuarioId);
    
    // Listar movimientos por referencia (número de venta, compra, etc.)
    List<MovimientoInventario> findByReferenciaOrderByFechaDesc(String referencia);
    
    // Movimientos entre fechas
    List<MovimientoInventario> findByFechaBetweenOrderByFechaDesc(
        LocalDateTime fechaInicio, LocalDateTime fechaFin);
    
    // Movimientos de hoy
    @Query("SELECT m FROM MovimientoInventario m WHERE DATE(m.fecha) = CURRENT_DATE ORDER BY m.fecha DESC")
    List<MovimientoInventario> findMovimientosHoy();
    
    // Últimos movimientos
    @Query("SELECT m FROM MovimientoInventario m ORDER BY m.fecha DESC")
    List<MovimientoInventario> findUltimosMovimientos();
    
    // Movimientos por producto (todas sus variantes)
    @Query("SELECT m FROM MovimientoInventario m WHERE m.variante.producto.id = :productoId ORDER BY m.fecha DESC")
    List<MovimientoInventario> findByProductoId(@Param("productoId") Integer productoId);
    
    // Entradas entre fechas
    @Query("SELECT m FROM MovimientoInventario m WHERE m.tipo = 'ENTRADA' AND m.fecha BETWEEN :inicio AND :fin ORDER BY m.fecha DESC")
    List<MovimientoInventario> findEntradasBetween(
        @Param("inicio") LocalDateTime inicio, 
        @Param("fin") LocalDateTime fin);
    
    // Salidas entre fechas
    @Query("SELECT m FROM MovimientoInventario m WHERE m.tipo = 'SALIDA' AND m.fecha BETWEEN :inicio AND :fin ORDER BY m.fecha DESC")
    List<MovimientoInventario> findSalidasBetween(
        @Param("inicio") LocalDateTime inicio, 
        @Param("fin") LocalDateTime fin);
    
    // Contar movimientos por tipo
    long countByTipo(MovimientoInventario.TipoMovimiento tipo);
    
    // Contar movimientos de hoy
    @Query("SELECT COUNT(m) FROM MovimientoInventario m WHERE DATE(m.fecha) = CURRENT_DATE")
    long countMovimientosHoy();
}