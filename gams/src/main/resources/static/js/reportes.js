/**
 * GAMS S.A.C - Reportes JavaScript
 * Gestión de historial de movimientos de inventario
 */

class ReportesManager {
    constructor() {
        this.movimientos = [];
        this.movimientosFiltrados = [];
        this.init();
    }

    async init() {
        this.initializeEventListeners();
        await this.cargarMovimientos();
        await this.cargarEstadisticas();
    }

    /**
     * Inicializar event listeners
     */
    initializeEventListeners() {
        // Filtros - recargan datos del servidor
        document.getElementById('filtroPeriodo').addEventListener('change', () => {
            // Limpiar búsqueda al cambiar período
            document.getElementById('buscarMovimiento').value = '';
            this.aplicarFiltros();
        });
        
        document.getElementById('filtroTipo').addEventListener('change', () => {
            // Limpiar búsqueda al cambiar tipo
            document.getElementById('buscarMovimiento').value = '';
            this.aplicarFiltros();
        });
        
        // Búsqueda - filtra localmente sobre los datos ya cargados
        document.getElementById('buscarMovimiento').addEventListener('input', (e) => {
            this.buscar(e.target.value);
        });
        
        // Botón refresh
        document.getElementById('btnRefresh').addEventListener('click', () => this.refrescar());
    }

    /**
     * Cargar todos los movimientos
     */
    async cargarMovimientos() {
        try {
            const response = await fetch('/api/movimientos');
            if (!response.ok) throw new Error('Error al cargar movimientos');
            
            const data = await response.json();
            
            if (data.success) {
                this.movimientos = data.movimientos;
                this.movimientosFiltrados = [...this.movimientos];
                this.renderizarMovimientos();
                console.log(`✅ ${data.total} movimientos cargados`);
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('Error cargando movimientos:', error);
            this.mostrarError('No se pudieron cargar los movimientos');
        }
    }

    /**
     * Cargar estadísticas
     */
    async cargarEstadisticas() {
        try {
            const periodo = document.getElementById('filtroPeriodo').value;
            let url = '/api/movimientos/estadisticas';
            
            if (periodo === 'hoy') {
                url += '?hoy=true';
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al cargar estadísticas');
            
            const data = await response.json();
            
            if (data.success) {
                const stats = data.estadisticas;
                document.getElementById('statTotal').textContent = stats.totalMovimientos || 0;
                document.getElementById('statEntradas').textContent = stats.totalEntradas || 0;
                document.getElementById('statSalidas').textContent = stats.totalSalidas || 0;
                document.getElementById('statAjustes').textContent = stats.totalAjustes || 0;
            }
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    /**
     * Aplicar filtros
     */
    async aplicarFiltros() {
        const periodo = document.getElementById('filtroPeriodo').value;
        const tipo = document.getElementById('filtroTipo').value;
        const busqueda = document.getElementById('buscarMovimiento').value.trim();
        
        try {
            let url = '/api/movimientos?';
            const params = [];
            
            // Filtro por período
            if (periodo === 'hoy') {
                params.push('hoy=true');
            } else if (periodo !== 'todos') {
                const fechas = this.calcularFechas(periodo);
                params.push(`fechaInicio=${fechas.inicio}`);
                params.push(`fechaFin=${fechas.fin}`);
            }
            
            // Filtro por tipo
            if (tipo) {
                params.push(`tipo=${tipo}`);
            }
            
            // Construir URL
            if (params.length > 0) {
                url += params.join('&');
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al filtrar movimientos');
            
            const data = await response.json();
            
            if (data.success) {
                this.movimientos = data.movimientos;
                
                // Aplicar búsqueda local si hay término
                if (busqueda) {
                    this.buscar(busqueda);
                } else {
                    this.movimientosFiltrados = [...this.movimientos];
                    this.renderizarMovimientos();
                }
                
                await this.cargarEstadisticas();
            }
            
        } catch (error) {
            console.error('Error aplicando filtros:', error);
            this.mostrarError('Error al aplicar filtros');
        }
    }

    /**
     * Calcular fechas según período
     */
    calcularFechas(periodo) {
        const ahora = new Date();
        let inicio = new Date();
        
        switch(periodo) {
            case 'ayer':
                inicio.setDate(ahora.getDate() - 1);
                inicio.setHours(0, 0, 0, 0);
                ahora.setDate(ahora.getDate() - 1);
                ahora.setHours(23, 59, 59, 999);
                break;
            case 'semana':
                inicio.setDate(ahora.getDate() - 7);
                break;
            case 'mes':
                inicio.setMonth(ahora.getMonth() - 1);
                break;
        }
        
        return {
            inicio: inicio.toISOString(),
            fin: ahora.toISOString()
        };
    }

    /**
     * Buscar en movimientos (respeta los filtros actuales)
     */
    buscar(termino) {
        if (!termino || termino.trim() === '') {
            // Si no hay término, mostrar todos los movimientos cargados
            this.movimientosFiltrados = [...this.movimientos];
        } else {
            termino = termino.toLowerCase().trim();
            // Buscar solo en los movimientos ya filtrados por período/tipo
            this.movimientosFiltrados = this.movimientos.filter(m => 
                m.productoNombre.toLowerCase().includes(termino) ||
                m.varianteSku.toLowerCase().includes(termino) ||
                m.usuarioNombre.toLowerCase().includes(termino) ||
                m.colorNombre.toLowerCase().includes(termino) ||
                m.tallaNombre.toLowerCase().includes(termino) ||
                (m.motivo && m.motivo.toLowerCase().includes(termino)) ||
                (m.referencia && m.referencia.toLowerCase().includes(termino))
            );
        }
        this.renderizarMovimientos();
    }

    /**
     * Renderizar tabla de movimientos
     */
    renderizarMovimientos() {
        const tbody = document.getElementById('movimientosTableBody');
        
        if (this.movimientosFiltrados.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="10">
                        <i class="fas fa-inbox"></i> No hay movimientos para mostrar
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.movimientosFiltrados.map((m, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.formatearFecha(m.fecha)}</td>
                <td>${this.renderBadgeTipo(m.tipo)}</td>
                <td><strong>${m.productoNombre}</strong></td>
                <td>
                    <span class="text-muted">${m.colorNombre} - ${m.tallaNombre}</span><br>
                    <small class="text-muted">SKU: ${m.varianteSku}</small>
                </td>
                <td><strong>${m.cantidad}</strong></td>
                <td>${m.stockAnterior}</td>
                <td>
                    <span class="stock-change ${m.stockNuevo > m.stockAnterior ? 'stock-increase' : 'stock-decrease'}">
                        ${m.stockNuevo}
                        ${m.stockNuevo > m.stockAnterior ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>'}
                    </span>
                </td>
                <td class="text-muted">${m.motivo || '-'}</td>
                <td>${m.usuarioNombre}</td>
            </tr>
        `).join('');
    }

    /**
     * Renderizar badge de tipo
     */
    renderBadgeTipo(tipo) {
        const badges = {
            'ENTRADA': '<span class="badge badge-entrada"><i class="fas fa-arrow-down"></i> Entrada</span>',
            'SALIDA': '<span class="badge badge-salida"><i class="fas fa-arrow-up"></i> Salida</span>',
            'AJUSTE': '<span class="badge badge-ajuste"><i class="fas fa-sliders-h"></i> Ajuste</span>',
            'DEVOLUCION': '<span class="badge badge-devolucion"><i class="fas fa-undo"></i> Devolución</span>'
        };
        return badges[tipo] || tipo;
    }

    /**
     * Formatear fecha
     */
    formatearFecha(fechaISO) {
        const fecha = new Date(fechaISO);
        const opciones = { 
            year: 'numeric', 
            month: 'short', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        return fecha.toLocaleDateString('es-PE', opciones);
    }

    /**
     * Refrescar datos (mantiene los filtros actuales)
     */
    async refrescar() {
        const btn = document.getElementById('btnRefresh');
        const icon = btn.querySelector('i');
        
        icon.classList.add('fa-spin');
        btn.disabled = true;
        
        // Guardar término de búsqueda
        const terminoBusqueda = document.getElementById('buscarMovimiento').value;
        
        // Reaplicar filtros (esto recarga desde el servidor)
        await this.aplicarFiltros();
        
        // Restaurar término de búsqueda si había uno
        if (terminoBusqueda) {
            document.getElementById('buscarMovimiento').value = terminoBusqueda;
            this.buscar(terminoBusqueda);
        }
        
        setTimeout(() => {
            icon.classList.remove('fa-spin');
            btn.disabled = false;
        }, 500);
    }

    /**
     * Mostrar error
     */
    mostrarError(mensaje) {
        const tbody = document.getElementById('movimientosTableBody');
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10" style="color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle"></i> ${mensaje}
                </td>
            </tr>
        `;
    }
}

// Inicializar cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    window.reportesManager = new ReportesManager();
});
