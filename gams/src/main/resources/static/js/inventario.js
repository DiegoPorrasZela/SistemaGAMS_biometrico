/**
 * GAMS S.A.C - Sistema de Inventario
 * JavaScript Completo - Nueva Arquitectura
 * 
 * Flujo:
 * 1. Crear producto (SIN variantes)
 * 2. Gestionar variantes en modal separado (DESPUÉS)
 */

class InventarioManager {
    constructor() {
        this.productos = [];
        this.categorias = [];
        this.marcas = [];
        this.colores = [];
        this.tallas = [];
        this.currentProducto = null;
        this.variantesProductoActual = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Inventario Manager...');
        
        await this.loadInitialData();
        this.initializeEventListeners();
        await this.loadProductos();
        
        console.log('✅ Inventario Manager iniciado correctamente');
    }

    /**
     * Cargar datos iniciales (categorías, marcas, colores, tallas)
     */
    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // Categorías
            const categoriasResponse = await fetch('/api/catalogo/categorias?activo=true');
            if (categoriasResponse.ok) {
                this.categorias = await categoriasResponse.json();
                this.populateSelect('productoCategoria', this.categorias, 'nombre', 'id');
            }

            // Marcas
            const marcasResponse = await fetch('/api/catalogo/marcas?activo=true');
            if (marcasResponse.ok) {
                this.marcas = await marcasResponse.json();
                this.populateSelect('productoMarca', this.marcas, 'nombre', 'id');
                this.populateSelect('filterMarca', this.marcas, 'nombre', 'id');
            }

            // Colores
            const coloresResponse = await fetch('/api/catalogo/colores?activo=true');
            if (coloresResponse.ok) {
                this.colores = await coloresResponse.json();
            }

            // Tallas
            const tallasResponse = await fetch('/api/catalogo/tallas?activo=true');
            if (tallasResponse.ok) {
                this.tallas = await tallasResponse.json();
            }
            
            // Poblar filtro de categorías
            this.populateSelect('filterCategoria', this.categorias, 'nombre', 'id');
            
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            this.showToast('error', 'Error', 'No se pudieron cargar los datos iniciales');
            this.showLoading(false);
        }
    }

    /**
     * Poblar select con opciones
     */
    populateSelect(selectId, items, textKey, valueKey) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const firstOption = select.options[0];
        select.innerHTML = '';
        
        if (firstOption) {
            select.appendChild(firstOption);
        }
        
        items.forEach(item => {
            if (item.activo !== false) {
                const option = document.createElement('option');
                option.value = item[valueKey];
                option.textContent = item[textKey];
                select.appendChild(option);
            }
        });
    }

    /**
     * Inicializar event listeners
     */
    initializeEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.loadProductos(), 300);
            });
        }

        // Filtros
        ['filterCategoria', 'filterMarca', 'filterEstado'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.loadProductos());
            }
        });

        // Botones principales
        const btnNuevoProducto = document.getElementById('btnNuevoProducto');
        if (btnNuevoProducto) {
            btnNuevoProducto.addEventListener('click', () => this.openProductoModal());
        }

        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadProductos());
        }

        const btnExport = document.getElementById('btnExport');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportToExcel());
        }

        // Form producto
        const formProducto = document.getElementById('formProducto');
        if (formProducto) {
            formProducto.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProducto();
            });
        }

        // Calcular ganancia
        const precioCompra = document.getElementById('productoPrecioCompra');
        const precioVenta = document.getElementById('productoPrecioVenta');
        if (precioCompra && precioVenta) {
            precioCompra.addEventListener('input', () => this.calculateGanancia());
            precioVenta.addEventListener('input', () => this.calculateGanancia());
        }

        // Botón agregar variante en modal
        const btnAgregarVarianteModal = document.getElementById('btnAgregarVarianteModal');
        if (btnAgregarVarianteModal) {
            btnAgregarVarianteModal.addEventListener('click', () => this.agregarVarianteCard());
        }
    }

    /**
     * Cargar productos
     */
    async loadProductos() {
        try {
            this.showLoading(true);
            
            const params = new URLSearchParams();
            
            const search = document.getElementById('searchInput').value;
            if (search) params.append('buscar', search);
            
            const categoria = document.getElementById('filterCategoria').value;
            if (categoria) params.append('categoriaId', categoria);
            
            const marca = document.getElementById('filterMarca').value;
            if (marca) params.append('marcaId', marca);
            
            const estado = document.getElementById('filterEstado').value;
            if (estado === 'activo') params.append('activo', 'true');

            const response = await fetch(`/api/productos?${params}`);
            
            if (!response.ok) throw new Error('Error al cargar productos');

            this.productos = await response.json();
            
            // Filtros manuales
            if (estado === 'inactivo') {
                this.productos = this.productos.filter(p => !p.activo);
            } else if (estado === 'stock_bajo') {
                this.productos = this.productos.filter(p => p.stockTotal > 0 && p.stockTotal < 10);
            } else if (estado === 'sin_stock') {
                this.productos = this.productos.filter(p => p.stockTotal === 0);
            }
            
            this.renderProductos();
            await this.updateStats();
            
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            this.showToast('error', 'Error', 'No se pudieron cargar los productos');
            this.renderEmptyState();
            this.showLoading(false);
        }
    }

    /**
     * Renderizar productos en tabla
     */
    renderProductos() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (this.productos.length === 0) {
            this.renderEmptyState();
            return;
        }

        let html = '';
        
        this.productos.forEach(producto => {
            const statusClass = producto.activo ? 'badge-success' : 'badge-secondary';
            const statusText = producto.activo ? 'Activo' : 'Inactivo';
            
            let stockClass = 'badge-success';
            if (producto.stockTotal === 0) {
                stockClass = 'badge-danger';
            } else if (producto.stockTotal < 10) {
                stockClass = 'badge-warning';
            }
            
            html += `
                <tr>
                    <td><input type="checkbox" class="row-checkbox" value="${producto.id}"></td>
                    <td><strong>${producto.codigo}</strong></td>
                    <td>
                        ${producto.imagenUrl ? `<img src="${producto.imagenUrl}" alt="${producto.nombre}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 8px; vertical-align: middle;">` : ''}
                        <strong>${producto.nombre}</strong>
                        ${producto.descripcion ? `<br><small class="text-muted">${producto.descripcion.substring(0, 50)}${producto.descripcion.length > 50 ? '...' : ''}</small>` : ''}
                    </td>
                    <td>${producto.categoriaNombre || '-'}</td>
                    <td>${producto.marcaNombre || '-'}</td>
                    <td class="text-center">${producto.cantidadVariantes || 0}</td>
                    <td>
                        <span class="badge ${stockClass}">
                            ${producto.stockTotal || 0} unidades
                        </span>
                    </td>
                    <td>
                        <small class="text-muted">Compra:</small> <strong>S/ ${parseFloat(producto.precioCompra || 0).toFixed(2)}</strong><br>
                        <small class="text-muted">Venta:</small> <strong>S/ ${parseFloat(producto.precioVenta || 0).toFixed(2)}</strong>
                    </td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="inventarioManager.gestionarVariantes(${producto.id})" title="Gestionar variantes">
                                <i class="fas fa-layer-group"></i>
                            </button>
                            <button onclick="inventarioManager.viewProducto(${producto.id})" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="inventarioManager.editProducto(${producto.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="inventarioManager.deleteProducto(${producto.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    /**
     * Renderizar estado vacío
     */
    renderEmptyState() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 3rem;">
                    <i class="fas fa-box-open" style="font-size: 4rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--gray-600);">No hay productos</h3>
                    <p style="color: var(--gray-500);">Comienza agregando tu primer producto al inventario</p>
                    <button class="btn-primary" style="margin-top: 1rem;" onclick="inventarioManager.openProductoModal()">
                        <i class="fas fa-plus"></i> Agregar Producto
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Actualizar estadísticas
     */
    async updateStats() {
        try {
            const response = await fetch('/api/productos/estadisticas');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalProductos').textContent = stats.totalProductos || 0;
                document.getElementById('totalVariantes').textContent = stats.totalVariantes || 0;
                
                const stockBajo = this.productos.filter(p => p.stockTotal > 0 && p.stockTotal < 10).length;
                const sinStock = this.productos.filter(p => p.stockTotal === 0).length;
                
                document.getElementById('stockBajo').textContent = stockBajo;
                document.getElementById('sinStock').textContent = sinStock;
            }
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    /**
     * Abrir modal de producto
     */
    openProductoModal(producto = null) {
        const modal = document.getElementById('modalProducto');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('formProducto');
        
        if (!modal || !form) return;

        form.reset();
        this.currentProducto = producto;

        if (producto) {
            title.textContent = 'Editar Producto';
            this.fillProductoForm(producto);
        } else {
            title.textContent = 'Nuevo Producto';
        }

        openModal('modalProducto');
    }

    /**
     * Llenar formulario con datos del producto
     */
    fillProductoForm(producto) {
        document.getElementById('productoId').value = producto.id;
        document.getElementById('productoCodigo').value = producto.codigo;
        document.getElementById('productoNombre').value = producto.nombre;
        document.getElementById('productoDescripcion').value = producto.descripcion || '';
        document.getElementById('productoImagenUrl').value = producto.imagenUrl || '';
        document.getElementById('productoCategoria').value = producto.categoria?.id || '';
        document.getElementById('productoMarca').value = producto.marca?.id || '';
        document.getElementById('productoGenero').value = producto.genero || 'UNISEX';
        document.getElementById('productoTemporada').value = producto.temporada || 'TODO_ANO';
        document.getElementById('productoPrecioCompra').value = producto.precioCompra;
        document.getElementById('productoPrecioVenta').value = producto.precioVenta;
        document.getElementById('productoStockMinimo').value = producto.stockMinimo || '';
        document.getElementById('productoStockMaximo').value = producto.stockMaximo || '';
        document.getElementById('activo').checked = producto.activo;
        
        this.calculateGanancia();
    }

    /**
     * Calcular ganancia porcentual
     */
    calculateGanancia() {
        const precioCompra = parseFloat(document.getElementById('productoPrecioCompra').value) || 0;
        const precioVenta = parseFloat(document.getElementById('productoPrecioVenta').value) || 0;
        
        if (precioCompra > 0) {
            const ganancia = ((precioVenta - precioCompra) / precioCompra) * 100;
            document.getElementById('productoGanancia').value = ganancia.toFixed(2);
        } else {
            document.getElementById('productoGanancia').value = '0.00';
        }
    }

    /**
     * Guardar producto (SIN variantes)
     */
    async saveProducto() {
        try {
            const productoData = {
                codigo: document.getElementById('productoCodigo').value,
                nombre: document.getElementById('productoNombre').value,
                descripcion: document.getElementById('productoDescripcion').value,
                genero: document.getElementById('productoGenero').value,
                temporada: document.getElementById('productoTemporada').value,
                precioCompra: parseFloat(document.getElementById('productoPrecioCompra').value),
                precioVenta: parseFloat(document.getElementById('productoPrecioVenta').value),
                imagenUrl: document.getElementById('productoImagenUrl').value || null,
                stockMinimo: parseInt(document.getElementById('productoStockMinimo').value) || null,
                stockMaximo: parseInt(document.getElementById('productoStockMaximo').value) || null,
                activo: document.getElementById('activo').checked,
                categoria: {
                    id: parseInt(document.getElementById('productoCategoria').value)
                }
            };

            const marcaId = document.getElementById('productoMarca').value;
            if (marcaId) {
                productoData.marca = { id: parseInt(marcaId) };
            }

            const productoId = document.getElementById('productoId').value;
            const isEdit = productoId !== '';
            
            const url = isEdit ? `/api/productos/${productoId}` : '/api/productos';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(productoData)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            const productoGuardado = await response.json();

            this.showToast('success', 'Éxito', isEdit ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
            closeModal('modalProducto');
            this.loadProductos();
        } catch (error) {
            console.error('❌ Error guardando producto:', error);
            this.showToast('error', 'Error', error.message || 'No se pudo guardar el producto');
        }
    }

    /**
     * NUEVA FUNCIÓN: Gestionar variantes de un producto
     */
    async gestionarVariantes(productoId) {
        try {
            // Cargar producto
            const response = await fetch(`/api/productos/${productoId}`);
            if (!response.ok) throw new Error('Error al cargar producto');
            
            const producto = await response.json();
            this.currentProducto = producto;

            // Mostrar info del producto
            document.getElementById('variantesProductoId').value = productoId;
            document.getElementById('variantesProductoNombre').textContent = producto.nombre;
            document.getElementById('variantesProductoCodigo').textContent = `Código: ${producto.codigo}`;
            document.getElementById('modalVariantesTitle').textContent = `Gestionar Variantes - ${producto.nombre}`;

            // Mostrar alerta si tiene control de stock general
            const alertaStock = document.getElementById('variantesStockAlert');
            if (producto.stockMinimo || producto.stockMaximo) {
                alertaStock.style.display = 'flex';
            } else {
                alertaStock.style.display = 'none';
            }

            // Cargar variantes existentes
            await this.loadVariantesModal(productoId);

            // Abrir modal
            openModal('modalVariantes');
        } catch (error) {
            console.error('❌ Error:', error);
            this.showToast('error', 'Error', 'No se pudo cargar el producto');
        }
    }

    /**
     * Cargar variantes en el modal
     */
    async loadVariantesModal(productoId) {
        try {
            const response = await fetch(`/api/productos/${productoId}/variantes`);
            if (!response.ok) throw new Error('Error al cargar variantes');
            
            this.variantesProductoActual = await response.json();
            this.renderVariantesModal();
        } catch (error) {
            console.error('❌ Error cargando variantes:', error);
            this.variantesProductoActual = [];
            this.renderVariantesModal();
        }
    }

    /**
     * Renderizar variantes en el modal
     */
    renderVariantesModal() {
        const container = document.getElementById('variantesListContainer');
        if (!container) return;

        if (this.variantesProductoActual.length === 0) {
            container.innerHTML = `
                <div class="variantes-empty">
                    <i class="fas fa-layer-group"></i>
                    <h4>No hay variantes</h4>
                    <p>Haz clic en "Agregar Variante" para crear la primera</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.variantesProductoActual.forEach((variante, index) => {
            const tieneControlGeneral = this.currentProducto.stockMinimo || this.currentProducto.stockMaximo;
            
            html += `
                <div class="variante-card" data-variante-id="${variante.id}">
                    <div class="variante-card-header">
                        <div class="variante-card-title">
                            <i class="fas fa-tag"></i>
                            Variante ${index + 1}
                        </div>
                        <div class="variante-card-actions">
                            <button class="btn-delete" onclick="inventarioManager.deleteVariante(${variante.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="variante-card-body">
                        <div class="variante-field">
                            <label>Talla</label>
                            <input type="text" value="${variante.tallaNombre || ''}" readonly>
                        </div>
                        <div class="variante-field">
                            <label>Color</label>
                            <input type="text" value="${variante.colorNombre || ''}" readonly>
                        </div>
                        <div class="variante-field">
                            <label>Stock Actual</label>
                            <input type="number" value="${variante.stock || 0}" readonly>
                        </div>
                        ${!tieneControlGeneral ? `
                        <div class="variante-field">
                            <label>Stock Mínimo</label>
                            <input type="number" value="${variante.stockMinimo || 0}" readonly>
                        </div>
                        <div class="variante-field">
                            <label>Stock Máximo</label>
                            <input type="number" value="${variante.stockMaximo || 0}" readonly>
                        </div>
                        ` : ''}
                        <div class="variante-field">
                            <label>SKU</label>
                            <div class="sku-display">${variante.sku || 'Sin SKU'}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * Agregar card de nueva variante
     */
    agregarVarianteCard() {
        const container = document.getElementById('variantesListContainer');
        if (!container) return;

        // Limpiar empty state si existe
        if (container.querySelector('.variantes-empty')) {
            container.innerHTML = '';
        }

        const tieneControlGeneral = this.currentProducto.stockMinimo || this.currentProducto.stockMaximo;
        const nuevoId = 'new_' + Date.now();

        const card = document.createElement('div');
        card.className = 'variante-card';
        card.dataset.varianteId = nuevoId;
        card.innerHTML = `
            <div class="variante-card-header">
                <div class="variante-card-title">
                    <i class="fas fa-tag"></i>
                    Nueva Variante
                </div>
                <div class="variante-card-actions">
                    <button class="btn-save" onclick="inventarioManager.guardarVarianteCard('${nuevoId}')">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn-delete" onclick="inventarioManager.eliminarVarianteCard('${nuevoId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="variante-card-body">
                <div class="variante-field">
                    <label>Talla *</label>
                    <select class="variante-talla" required>
                        <option value="">Seleccionar...</option>
                        ${this.tallas.filter(t => t.activo).map(t => 
                            `<option value="${t.id}">${t.nombre}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="variante-field">
                    <label>Color *</label>
                    <select class="variante-color" required>
                        <option value="">Seleccionar...</option>
                        ${this.colores.filter(c => c.activo).map(c => 
                            `<option value="${c.id}">${c.nombre}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="variante-field">
                    <label>Stock Inicial *</label>
                    <input type="number" class="variante-stock" min="0" value="0" required>
                </div>
                ${!tieneControlGeneral ? `
                <div class="variante-field">
                    <label>Stock Mínimo</label>
                    <input type="number" class="variante-stock-min" min="0" value="5">
                </div>
                <div class="variante-field">
                    <label>Stock Máximo</label>
                    <input type="number" class="variante-stock-max" min="0" value="100">
                </div>
                ` : ''}
            </div>
        `;
        
        container.insertBefore(card, container.firstChild);
    }

    /**
     * Guardar variante desde card
     */
    async guardarVarianteCard(cardId) {
        try {
            const card = document.querySelector(`.variante-card[data-variante-id="${cardId}"]`);
            if (!card) return;

            const tallaId = parseInt(card.querySelector('.variante-talla').value);
            const colorId = parseInt(card.querySelector('.variante-color').value);
            const stock = parseInt(card.querySelector('.variante-stock').value) || 0;

            if (!tallaId || !colorId) {
                this.showToast('warning', 'Atención', 'Debes seleccionar talla y color');
                return;
            }

            const varianteData = {
                producto: { id: parseInt(this.currentProducto.id) },
                talla: { id: tallaId },
                color: { id: colorId },
                stock: stock,
                activo: true
            };

            // Si el producto NO tiene control general, agregar stock min/max de variante
            if (!this.currentProducto.stockMinimo && !this.currentProducto.stockMaximo) {
                const stockMin = card.querySelector('.variante-stock-min');
                const stockMax = card.querySelector('.variante-stock-max');
                if (stockMin) varianteData.stockMinimo = parseInt(stockMin.value) || null;
                if (stockMax) varianteData.stockMaximo = parseInt(stockMax.value) || null;
            }

            console.log('💾 Guardando variante:', varianteData);

            const response = await fetch('/api/productos/variantes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(varianteData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            this.showToast('success', 'Éxito', 'Variante guardada correctamente');
            
            // Recargar variantes
            await this.loadVariantesModal(this.currentProducto.id);
            await this.loadProductos(); // Actualizar tabla principal
        } catch (error) {
            console.error('❌ Error guardando variante:', error);
            this.showToast('error', 'Error', error.message || 'No se pudo guardar la variante');
        }
    }

    /**
     * Eliminar card de variante (sin guardar)
     */
    eliminarVarianteCard(cardId) {
        const card = document.querySelector(`.variante-card[data-variante-id="${cardId}"]`);
        if (card) {
            card.remove();
        }
    }

    /**
     * Eliminar variante guardada
     */
    async deleteVariante(varianteId) {
        if (!confirm('¿Eliminar esta variante?')) return;

        try {
            const response = await fetch(`/api/productos/variantes/${varianteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar');

            this.showToast('success', 'Éxito', 'Variante eliminada');
            
            await this.loadVariantesModal(this.currentProducto.id);
            await this.loadProductos();
        } catch (error) {
            console.error('❌ Error:', error);
            this.showToast('error', 'Error', 'No se pudo eliminar');
        }
    }

    /**
     * Ver detalles del producto
     */
    async viewProducto(id) {
        try {
            const response = await fetch(`/api/productos/${id}`);
            if (!response.ok) throw new Error('Error al cargar producto');
            
            const producto = await response.json();
            this.showDetallesModal(producto);
        } catch (error) {
            console.error('❌ Error:', error);
            this.showToast('error', 'Error', 'No se pudo cargar el producto');
        }
    }

    /**
     * Mostrar modal de detalles
     */
    async showDetallesModal(producto) {
        const body = document.getElementById('detallesBody');
        if (!body) return;

        body.innerHTML = `
            <div class="form-section">
                <h4>Información General</h4>
                <table style="width: 100%;">
                    <tr style="border-bottom: 1px solid var(--gray-200);">
                        <td style="padding: 0.75rem; font-weight: 600; width: 30%;">Código:</td>
                        <td style="padding: 0.75rem;">${producto.codigo}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--gray-200);">
                        <td style="padding: 0.75rem; font-weight: 600;">Nombre:</td>
                        <td style="padding: 0.75rem;">${producto.nombre}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--gray-200);">
                        <td style="padding: 0.75rem; font-weight: 600;">Descripción:</td>
                        <td style="padding: 0.75rem;">${producto.descripcion || '-'}</td>
                    </tr>
                </table>
            </div>
            <div class="form-section">
                <h4>Precios</h4>
                <table style="width: 100%;">
                    <tr style="border-bottom: 1px solid var(--gray-200);">
                        <td style="padding: 0.75rem; font-weight: 600; width: 30%;">Precio Compra:</td>
                        <td style="padding: 0.75rem;">S/ ${parseFloat(producto.precioCompra).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--gray-200);">
                        <td style="padding: 0.75rem; font-weight: 600;">Precio Venta:</td>
                        <td style="padding: 0.75rem;">S/ ${parseFloat(producto.precioVenta).toFixed(2)}</td>
                    </tr>
                </table>
            </div>
        `;

        openModal('modalDetalles');
    }

    /**
     * Editar producto
     */
    async editProducto(id) {
        try {
            const response = await fetch(`/api/productos/${id}`);
            if (!response.ok) throw new Error('Error al cargar producto');
            
            const producto = await response.json();
            this.openProductoModal(producto);
        } catch (error) {
            console.error('❌ Error:', error);
            this.showToast('error', 'Error', 'No se pudo cargar el producto');
        }
    }

    /**
     * Eliminar producto
     */
    async deleteProducto(id) {
        if (!confirm('¿Eliminar este producto?')) return;

        try {
            const response = await fetch(`/api/productos/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar');

            this.showToast('success', 'Éxito', 'Producto eliminado');
            this.loadProductos();
        } catch (error) {
            console.error('❌ Error:', error);
            this.showToast('error', 'Error', 'No se pudo eliminar');
        }
    }

    /**
     * Exportar a Excel
     */
    exportToExcel() {
        this.showToast('info', 'Exportando', 'Generando archivo...');
    }

    /**
     * Mostrar/ocultar loading
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('active', show);
        }
    }

    /**
     * Toast notification
     */
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <h4 class="toast-title">${title}</h4>
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.remove(), 5000);
    }
}

// Funciones globales para modales
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Inicializar
let inventarioManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Iniciando aplicación...');
    inventarioManager = new InventarioManager();
});