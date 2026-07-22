package com.example.gams.repositories;

import com.example.gams.entities.Venta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VentaRepository extends JpaRepository<Venta, Integer> {

    // Buscar por código de comprobante
    Optional<Venta> findByCodigo(String codigo);

    // Historial paginado con filtros opcionales combinables (NULL = sin filtro)
    @Query("SELECT v FROM Venta v WHERE " +
           "(:desde IS NULL OR v.fecha >= :desde) AND " +
           "(:hasta IS NULL OR v.fecha <= :hasta) AND " +
           "(:vendedorId IS NULL OR v.vendedor.id = :vendedorId) AND " +
           "(:estado IS NULL OR v.estado = :estado) " +
           "ORDER BY v.fecha DESC")
    Page<Venta> buscarVentas(@Param("desde") LocalDateTime desde,
                             @Param("hasta") LocalDateTime hasta,
                             @Param("vendedorId") Integer vendedorId,
                             @Param("estado") Venta.EstadoVenta estado,
                             Pageable pageable);

    // Última venta registrada (para generar el siguiente correlativo)
    Optional<Venta> findTopByOrderByIdDesc();

    // Historial ordenado por fecha (más recientes primero)
    List<Venta> findAllByOrderByFechaDesc();

    // Ventas en un rango de fechas (para "ventas del día" y reportes)
    List<Venta> findByFechaBetweenOrderByFechaDesc(LocalDateTime desde, LocalDateTime hasta);

    // Ventas de un vendedor
    List<Venta> findByVendedorIdOrderByFechaDesc(Integer vendedorId);

    // Ventas de un vendedor en un rango de fechas
    List<Venta> findByVendedorIdAndFechaBetweenOrderByFechaDesc(
            Integer vendedorId, LocalDateTime desde, LocalDateTime hasta);

    // Ventas por estado
    List<Venta> findByEstadoOrderByFechaDesc(Venta.EstadoVenta estado);

    // Ventas de un cliente
    List<Venta> findByClienteIdOrderByFechaDesc(Integer clienteId);

    // Total vendido (solo COMPLETADAS) en un rango de fechas
    @Query("SELECT COALESCE(SUM(v.total), 0) FROM Venta v " +
           "WHERE v.estado = 'COMPLETADA' AND v.fecha BETWEEN :desde AND :hasta")
    BigDecimal sumTotalVendido(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    // Cantidad de ventas COMPLETADAS en un rango de fechas
    @Query("SELECT COUNT(v) FROM Venta v " +
           "WHERE v.estado = 'COMPLETADA' AND v.fecha BETWEEN :desde AND :hasta")
    long countVentasCompletadas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    // Total vendido por un vendedor (solo COMPLETADAS) en un rango de fechas
    @Query("SELECT COALESCE(SUM(v.total), 0) FROM Venta v " +
           "WHERE v.estado = 'COMPLETADA' AND v.vendedor.id = :vendedorId " +
           "AND v.fecha BETWEEN :desde AND :hasta")
    BigDecimal sumTotalVendidoPorVendedor(@Param("vendedorId") Integer vendedorId,
                                          @Param("desde") LocalDateTime desde,
                                          @Param("hasta") LocalDateTime hasta);

    // Resumen por método de pago en un rango de fechas (para cierre de caja futuro)
    @Query("SELECT v.metodoPago, COALESCE(SUM(v.total), 0) FROM Venta v " +
           "WHERE v.estado = 'COMPLETADA' AND v.fecha BETWEEN :desde AND :hasta " +
           "GROUP BY v.metodoPago")
    List<Object[]> sumTotalPorMetodoPago(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}