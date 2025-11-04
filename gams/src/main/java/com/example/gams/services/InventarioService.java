package com.example.gams.services;

import com.example.gams.entities.MovimientoInventario;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.entities.Usuario;
import com.example.gams.repositories.MovimientoInventarioRepository;
import com.example.gams.repositories.ProductoVarianteRepository;
import com.example.gams.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class InventarioService {

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private ProductoVarianteRepository varianteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    // ============================================
    // MOVIMIENTOS DE INVENTARIO
    // ============================================

    public List<MovimientoInventario> listarMovimientos() {
        return movimientoRepository.findAll();
    }

    public List<MovimientoInventario> listarUltimosMovimientos() {
        return movimientoRepository.findUltimosMovimientos();
    }

    public List<MovimientoInventario> listarMovimientosPorVariante(Integer varianteId) {
        return movimientoRepository.findByVarianteIdOrderByFechaDesc(varianteId);
    }

    public List<MovimientoInventario> listarMovimientosPorProducto(Integer productoId) {
        return movimientoRepository.findByProductoId(productoId);
    }

    public List<MovimientoInventario> listarMovimientosPorTipo(MovimientoInventario.TipoMovimiento tipo) {
        return movimientoRepository.findByTipoOrderByFechaDesc(tipo);
    }

    public List<MovimientoInventario> listarMovimientosPorUsuario(Integer usuarioId) {
        return movimientoRepository.findByUsuarioIdOrderByFechaDesc(usuarioId);
    }

    public List<MovimientoInventario> listarMovimientosPorReferencia(String referencia) {
        return movimientoRepository.findByReferenciaOrderByFechaDesc(referencia);
    }

    public List<MovimientoInventario> listarMovimientosPorFechas(LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        return movimientoRepository.findByFechaBetweenOrderByFechaDesc(fechaInicio, fechaFin);
    }

    public List<MovimientoInventario> listarMovimientosHoy() {
        return movimientoRepository.findMovimientosHoy();
    }

    public List<MovimientoInventario> listarEntradasEntreFechas(LocalDateTime inicio, LocalDateTime fin) {
        return movimientoRepository.findEntradasBetween(inicio, fin);
    }

    public List<MovimientoInventario> listarSalidasEntreFechas(LocalDateTime inicio, LocalDateTime fin) {
        return movimientoRepository.findSalidasBetween(inicio, fin);
    }

    public Optional<MovimientoInventario> buscarMovimientoPorId(Integer id) {
        return movimientoRepository.findById(id);
    }

    // ============================================
    // OPERACIONES DE INVENTARIO
    // ============================================

    /**
     * Registra una ENTRADA de inventario
     */
    public MovimientoInventario registrarEntrada(Integer varianteId, Integer cantidad, String motivo, 
                                                  String referencia, Integer usuarioId) {
        return registrarMovimiento(varianteId, MovimientoInventario.TipoMovimiento.ENTRADA, 
                                  cantidad, motivo, referencia, usuarioId);
    }

    /**
     * Registra una SALIDA de inventario
     */
    public MovimientoInventario registrarSalida(Integer varianteId, Integer cantidad, String motivo, 
                                                String referencia, Integer usuarioId) {
        return registrarMovimiento(varianteId, MovimientoInventario.TipoMovimiento.SALIDA, 
                                  cantidad, motivo, referencia, usuarioId);
    }

    /**
     * Registra un AJUSTE de inventario (puede ser positivo o negativo)
     */
    public MovimientoInventario registrarAjuste(Integer varianteId, Integer cantidad, String motivo, 
                                                Integer usuarioId) {
        return registrarMovimiento(varianteId, MovimientoInventario.TipoMovimiento.AJUSTE, 
                                  cantidad, motivo, null, usuarioId);
    }

    /**
     * Registra una DEVOLUCIÓN de inventario
     */
    public MovimientoInventario registrarDevolucion(Integer varianteId, Integer cantidad, String motivo, 
                                                    String referencia, Integer usuarioId) {
        return registrarMovimiento(varianteId, MovimientoInventario.TipoMovimiento.DEVOLUCION, 
                                  cantidad, motivo, referencia, usuarioId);
    }

    /**
     * Método genérico para registrar movimientos
     */
    private MovimientoInventario registrarMovimiento(Integer varianteId, MovimientoInventario.TipoMovimiento tipo,
                                                     Integer cantidad, String motivo, String referencia, 
                                                     Integer usuarioId) {
        // Buscar variante
        ProductoVariante variante = varianteRepository.findById(varianteId)
            .orElseThrow(() -> new RuntimeException("Variante no encontrada con id: " + varianteId));

        // Buscar usuario
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado con id: " + usuarioId));

        // Obtener stock actual
        Integer stockAnterior = variante.getStockActual();
        Integer stockNuevo = stockAnterior;

        // Calcular nuevo stock según tipo de movimiento
        switch (tipo) {
            case ENTRADA:
            case DEVOLUCION:
                stockNuevo = stockAnterior + cantidad;
                break;
            case SALIDA:
                if (stockAnterior < cantidad) {
                    throw new RuntimeException("Stock insuficiente. Disponible: " + stockAnterior + ", Solicitado: " + cantidad);
                }
                stockNuevo = stockAnterior - cantidad;
                break;
            case AJUSTE:
                // Para ajustes, la cantidad puede ser el nuevo stock total o el delta
                stockNuevo = cantidad;
                cantidad = Math.abs(stockNuevo - stockAnterior); // Calcular la diferencia para el registro
                break;
        }

        // Actualizar stock de la variante
        variante.setStockActual(stockNuevo);
        varianteRepository.save(variante);

        // Crear movimiento
        MovimientoInventario movimiento = new MovimientoInventario();
        movimiento.setVariante(variante);
        movimiento.setTipo(tipo);
        movimiento.setCantidad(cantidad);
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(stockNuevo);
        movimiento.setMotivo(motivo);
        movimiento.setReferencia(referencia);
        movimiento.setUsuario(usuario);
        movimiento.setFecha(LocalDateTime.now());

        return movimientoRepository.save(movimiento);
    }

    // ============================================
    // REPORTES Y ESTADÍSTICAS
    // ============================================

    /**
     * Obtiene el historial completo de una variante
     */
    public List<MovimientoInventario> obtenerHistorialVariante(Integer varianteId) {
        return movimientoRepository.findByVarianteIdOrderByFechaDesc(varianteId);
    }

    /**
     * Valida si hay stock suficiente para una venta
     */
    public boolean validarStockParaVenta(Integer varianteId, Integer cantidad) {
        Optional<ProductoVariante> varianteOpt = varianteRepository.findById(varianteId);
        if (varianteOpt.isPresent()) {
            ProductoVariante variante = varianteOpt.get();
            return variante.getStockActual() >= cantidad;
        }
        return false;
    }

    /**
     * Obtiene alertas de stock bajo
     */
    public List<ProductoVariante> obtenerAlertasStockBajo() {
        return varianteRepository.findStockBajo();
    }

    /**
     * Obtiene variantes sin stock
     */
    public List<ProductoVariante> obtenerVariantesSinStock() {
        return varianteRepository.findSinStock();
    }

    /**
     * Obtiene variantes con stock
     */
    public List<ProductoVariante> obtenerVariantesConStock() {
        return varianteRepository.findConStock();
    }

    /**
     * Cuenta movimientos por tipo
     */
    public long contarMovimientosPorTipo(MovimientoInventario.TipoMovimiento tipo) {
        return movimientoRepository.countByTipo(tipo);
    }

    /**
     * Cuenta movimientos de hoy
     */
    public long contarMovimientosHoy() {
        return movimientoRepository.countMovimientosHoy();
    }

    /**
     * Cuenta variantes con stock bajo
     */
    public long contarVariantesStockBajo() {
        return varianteRepository.countStockBajo();
    }

    /**
     * Obtiene el stock total del sistema
     */
    public Long obtenerStockTotal() {
        return varianteRepository.sumStockTotal();
    }

    /**
     * Obtiene el stock total de un producto (todas sus variantes)
     */
    public Long obtenerStockTotalProducto(Integer productoId) {
        return varianteRepository.sumStockByProducto(productoId);
    }
}