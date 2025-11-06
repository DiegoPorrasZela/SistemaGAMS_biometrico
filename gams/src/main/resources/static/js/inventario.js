/**
 * GAMS S.A.C - Sistema de Inventario
 * JavaScript COMPLETO Y CORREGIDO
 * Versión: 3.0 - Con edición de variantes + expansión en tabla
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
        // Búsqueda por código/nombre
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.loadProductos(), 300);
            });
        }

        // Búsqueda por código de barras
        const barcodeSearchInput = document.getElementById('barcodeSearchInput');
        if (barcodeSearchInput) {
            // Solo números
            barcodeSearchInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });

            // Buscar cuando se complete el código (13 dígitos) o Enter
            barcodeSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchByBarcode(e.target.value);
                }
            });

            // Auto-buscar cuando tenga 13 dígitos (EAN-13 completo)
            barcodeSearchInput.addEventListener('input', (e) => {
                if (e.target.value.length === 13) {
                    this.searchByBarcode(e.target.value);
                }
            });
        }

        // Botón limpiar búsqueda de código de barras
        const btnClearBarcode = document.getElementById('btnClearBarcode');
        if (btnClearBarcode) {
            btnClearBarcode.addEventListener('click', () => {
                document.getElementById('barcodeSearchInput').value = '';
                this.loadProductos(); // Recargar todos los productos
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
     * Buscar variante por código de barras
     */
    async searchByBarcode(barcode) {
        if (!barcode || barcode.length < 1) {
            this.showToast('warning', 'Atención', 'Ingrese un código de barras válido');
            return;
        }

        try {
            this.showLoading(true);

            const response = await fetch(`/api/productos/variantes/buscar/${barcode}`);

            if (response.status === 404) {
                this.showToast('error', 'No encontrado', `No se encontró ninguna variante con el código de barras: ${barcode}`);
                this.showLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Error en la búsqueda');
            }

            const variante = await response.json();

            // Aplicar animación de match al input
            const input = document.getElementById('barcodeSearchInput');
            if (input) {
                input.classList.add('barcode-match');
                setTimeout(() => input.classList.remove('barcode-match'), 600);
            }

            // Mostrar resultado: expandir el producto y resaltar la variante
            await this.highlightVarianteResult(variante);

            this.showToast('success', '✓ Encontrado', 
                `${variante.productoNombre} - ${variante.colorNombre} / ${variante.tallaNombre}`);

            this.showLoading(false);

        } catch (error) {
            console.error('❌ Error buscando por código de barras:', error);
            this.showToast('error', 'Error', 'Error al buscar por código de barras');
            this.showLoading(false);
        }
    }

    /**
     * Resaltar variante encontrada por código de barras
     */
    async highlightVarianteResult(variante) {
        // Recargar productos para asegurar que está en la lista
        await this.loadProductos();

        // Buscar el producto en la tabla
        const productoRow = document.querySelector(`tr[data-id="${variante.productoId}"]`);
        if (!productoRow) {
            console.warn('Producto no encontrado en la tabla');
            return;
        }

        // Expandir variantes si no está expandido
        const expandBtn = productoRow.querySelector('.btn-expand-variantes');
        if (expandBtn && !expandBtn.classList.contains('expanded')) {
            expandBtn.click(); // Simular click para expandir
            
            // Esperar a que se carguen las variantes
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Buscar la fila de la variante
        const varianteRow = document.querySelector(`tr.variante-row[data-variante-id="${variante.id}"]`);
        if (varianteRow) {
            // Scroll a la variante
            varianteRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Resaltar temporalmente
            varianteRow.style.backgroundColor = '#fef3c7'; // amarillo suave
            varianteRow.style.transition = 'background-color 1s ease';
            
            setTimeout(() => {
                varianteRow.style.backgroundColor = '';
            }, 2000);
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
     * Renderizar productos en tabla CON EXPANSIÓN
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
            
            const hasVariantes = (producto.cantidadVariantes || 0) > 0;
            const expandIcon = hasVariantes ? 
                `<i class="fas fa-chevron-right expand-icon"></i>` : 
                '';
            
            // FILA PRINCIPAL DEL PRODUCTO
            html += `
                <tr class="producto-row" data-producto-id="${producto.id}">
                    <td><input type="checkbox" class="row-checkbox" value="${producto.id}"></td>
                    <td><strong>${producto.codigo}</strong></td>
                    <td ${hasVariantes ? `onclick="inventarioManager.toggleVariantes(${producto.id})" style="cursor: pointer;"` : ''}>
                        ${expandIcon}
                        ${producto.imagenUrl ? `<img src="${producto.imagenUrl}" alt="${producto.nombre}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 8px; vertical-align: middle;">` : ''}
                        <strong>${producto.nombre}</strong>
                        ${producto.descripcion ? `<br><small class="text-muted">${producto.descripcion.substring(0, 50)}${producto.descripcion.length > 50 ? '...' : ''}</small>` : ''}
                    </td>
                    <td>${producto.categoriaNombre || '-'}</td>
                    <td>${producto.marcaNombre || '-'}</td>
                    <td class="text-center">
                        ${hasVariantes ? 
                            `<span class="badge badge-info" onclick="inventarioManager.gestionarVariantes(${producto.id})" style="cursor: pointer;">${producto.cantidadVariantes}</span>` : 
                            '<span class="badge badge-secondary">0</span>'
                        }
                    </td>
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
            
            // FILA EXPANDIBLE (OCULTA POR DEFECTO)
            if (hasVariantes) {
                html += `
                    <tr class="variantes-expansion-row" data-producto-id="${producto.id}" style="display: none;">
                        <td colspan="10" style="padding: 0; background: var(--bg-secondary);">
                            <div class="variantes-expansion-container" style="padding: 1.5rem;">
                                <div class="variantes-expansion-loading">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando variantes...
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });
        
        tbody.innerHTML = html;
    }

    /**
     * Toggle expansión de variantes en la tabla
     */
    async toggleVariantes(productoId) {
        const expansionRow = document.querySelector(`.variantes-expansion-row[data-producto-id="${productoId}"]`);
        const expandIcon = document.querySelector(`.producto-row[data-producto-id="${productoId}"] .expand-icon`);
        const container = expansionRow?.querySelector('.variantes-expansion-container');
        
        if (!expansionRow || !container) return;

        const isExpanded = expansionRow.style.display === 'table-row';
        
        if (isExpanded) {
            // CONTRAER
            expansionRow.style.display = 'none';
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(0deg)';
            }
        } else {
            // EXPANDIR
            expansionRow.style.display = 'table-row';
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(90deg)';
            }
            
            // Cargar variantes si no están cargadas
            if (container.querySelector('.variantes-expansion-loading')) {
                await this.cargarVariantesEnTabla(productoId, container);
            }
        }
    }

    /**
     * Cargar variantes en la expansión de la tabla
     */
    async cargarVariantesEnTabla(productoId, container) {
        try {
            const response = await fetch(`/api/productos/${productoId}/variantes`);
            if (!response.ok) throw new Error('Error al cargar variantes');
            
            const variantes = await response.json();
            
            if (variantes.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                        <p>Este producto no tiene variantes</p>
                    </div>
                `;
                return;
            }
            
            let html = `
                <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-secondary);">
                                <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">SKU</th>
                                <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">TALLA</th>
                                <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">COLOR</th>
                                <th style="padding: 0.75rem; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">STOCK</th>
                                <th style="padding: 0.75rem; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">MIN</th>
                                <th style="padding: 0.75rem; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">MAX</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            variantes.forEach(v => {
                let stockBadge = 'badge-success';
                if (v.stockActual === 0) stockBadge = 'badge-danger';
                else if (v.stockMinimo && v.stockActual < v.stockMinimo) stockBadge = 'badge-warning';
                
                html += `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem; font-family: monospace; font-size: 0.75rem; color: var(--text-secondary);">${v.sku || '-'}</td>
                        <td style="padding: 0.75rem;"><strong>${v.tallaNombre || '-'}</strong></td>
                        <td style="padding: 0.75rem;"><strong>${v.colorNombre || '-'}</strong></td>
                        <td style="padding: 0.75rem; text-align: center;">
                            <span class="badge ${stockBadge}">${v.stockActual || 0}</span>
                        </td>
                        <td style="padding: 0.75rem; text-align: center; color: var(--text-secondary);">${v.stockMinimo || '-'}</td>
                        <td style="padding: 0.75rem; text-align: center; color: var(--text-secondary);">${v.stockMaximo || '-'}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error cargando variantes:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>Error al cargar variantes</p>
                </div>
            `;
        }
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
                    <i class="fas fa-box-open" style="font-size: 4rem; color: var(--text-secondary); margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: var(--text-primary);">No hay productos</h3>
                    <p style="color: var(--text-secondary);">Comienza agregando tu primer producto al inventario</p>
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
            console.log('📝 Editando producto:', producto);
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
        
        // CORREGIDO: Usar categoriaId y marcaId del DTO
        const categoriaValue = producto.categoriaId || producto.categoria?.id || '';
        const marcaValue = producto.marcaId || producto.marca?.id || '';
        
        document.getElementById('productoCategoria').value = categoriaValue;
        document.getElementById('productoMarca').value = marcaValue;
        
        console.log('📋 Preseleccionando categoría:', categoriaValue, 'marca:', marcaValue);
        
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
     * GESTIONAR VARIANTES
     */
    async gestionarVariantes(productoId) {
        try {
            const response = await fetch(`/api/productos/${productoId}`);
            if (!response.ok) throw new Error('Error al cargar producto');

            const producto = await response.json();
            this.currentProducto = producto;

            document.getElementById('variantesProductoId').value = productoId;
            document.getElementById('variantesProductoNombre').textContent = producto.nombre;
            document.getElementById('variantesProductoCodigo').textContent = `Código: ${producto.codigo}`;
            document.getElementById('modalVariantesTitle').textContent = `Gestionar Variantes - ${producto.nombre}`;

            const alertaStock = document.getElementById('variantesStockAlert');
            if (producto.stockMinimo || producto.stockMaximo) {
                alertaStock.style.display = 'flex';
            } else {
                alertaStock.style.display = 'none';
            }

            await this.loadVariantesModal(productoId);
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
     * Renderizar variantes en el modal - CORREGIDO
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
            const isEditMode = variante.editMode || false;
            
            html += `
                <div class="variante-card" data-variante-id="${variante.id}" data-edit-mode="${isEditMode}">
                    <div class="variante-card-header">
                        <div class="variante-card-title">
                            <i class="fas fa-tag"></i>
                            Variante ${index + 1}
                        </div>
                        <div class="variante-card-actions">
                            ${isEditMode ? `
                                <button class="btn-save" onclick="inventarioManager.guardarEdicionVariante(${variante.id})" title="Guardar">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                                <button class="btn-secondary" onclick="inventarioManager.cancelarEdicionVariante(${variante.id})" title="Cancelar">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : `
                                <button class="btn-edit" onclick="inventarioManager.editarVariante(${variante.id})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-delete" onclick="inventarioManager.deleteVariante(${variante.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `}
                        </div>
                    </div>
                    <div class="variante-card-body">
                        <div class="variante-field">
                            <label>Talla</label>
                            ${isEditMode ? `
                                <select class="variante-talla-edit" onchange="inventarioManager.actualizarSkuPreview(${variante.id})">
                                    ${this.tallas.filter(t => t.activo).map(t => {
                                        const varianteTallaId = variante.tallaId || (variante.talla ? variante.talla.id : null);
                                        return `<option value="${t.id}" ${varianteTallaId === t.id ? 'selected' : ''}>${t.nombre}</option>`;
                                    }).join('')}
                                </select>
                            ` : `
                                <input type="text" value="${variante.tallaNombre || ''}" readonly>
                            `}
                        </div>
                        <div class="variante-field">
                            <label>Color</label>
                            ${isEditMode ? `
                                <select class="variante-color-edit" onchange="inventarioManager.actualizarSkuPreview(${variante.id})">
                                    ${this.colores.filter(c => c.activo).map(c => {
                                        const varianteColorId = variante.colorId || (variante.color ? variante.color.id : null);
                                        return `<option value="${c.id}" ${varianteColorId === c.id ? 'selected' : ''}>${c.nombre}</option>`;
                                    }).join('')}
                                </select>
                            ` : `
                                <input type="text" value="${variante.colorNombre || ''}" readonly>
                            `}
                        </div>
                        <div class="variante-field">
                            <label>Stock Actual</label>
                            <input type="number" class="variante-stock-edit" value="${variante.stockActual || 0}" ${!isEditMode ? 'readonly' : ''} min="0">
                        </div>
                        ${!tieneControlGeneral ? `
                        <div class="variante-field">
                            <label>Stock Mínimo</label>
                            <input type="number" class="variante-stock-min-edit" value="${variante.stockMinimo || 0}" ${!isEditMode ? 'readonly' : ''} min="0">
                        </div>
                        <div class="variante-field">
                            <label>Stock Máximo</label>
                            <input type="number" class="variante-stock-max-edit" value="${variante.stockMaximo || 0}" ${!isEditMode ? 'readonly' : ''} min="0">
                        </div>
                        ` : ''}
                        <div class="variante-field">
                            <label>SKU ${isEditMode ? '<span class="sku-preview-label">(se actualizará automáticamente)</span>' : ''}</label>
                            <div class="sku-display ${isEditMode ? 'sku-preview' : ''}" id="sku-preview-${variante.id}">
                                ${this.generarSkuPreview(variante)}
                            </div>
                        </div>
                        <div class="variante-field">
                            <label>Código de Barras ${isEditMode ? `<button type="button" class="btn-generate-barcode" onclick="inventarioManager.generarCodigoBarras(${variante.id})" title="Generar automáticamente"><i class="fas fa-magic"></i></button>` : ''}</label>
                            ${isEditMode ? `
                                <input type="text" class="variante-barcode-edit" value="${variante.codigoBarras || ''}" placeholder="Ej: 7751234567890" maxlength="13">
                            ` : variante.codigoBarras ? `
                                <div class="barcode-visual-container">
                                    <svg class="barcode-svg" id="barcode-${variante.id}"></svg>
                                    <div class="barcode-number">${variante.codigoBarras}</div>
                                    <button class="btn-print-barcode" onclick="inventarioManager.imprimirCodigoBarras(${variante.id}, '${variante.codigoBarras}')" title="Imprimir etiqueta">
                                        <i class="fas fa-print"></i> Imprimir
                                    </button>
                                </div>
                            ` : `
                                <div class="barcode-display">Sin código</div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Renderizar códigos de barras visuales después de insertar el HTML
        this.renderBarcodes();
    }

    /**
     * Renderizar códigos de barras visuales usando JsBarcode
     */
    renderBarcodes() {
        this.variantesProductoActual.forEach(variante => {
            if (variante.codigoBarras && !variante.editMode) {
                const svgElement = document.getElementById(`barcode-${variante.id}`);
                if (svgElement && typeof JsBarcode !== 'undefined') {
                    try {
                        JsBarcode(svgElement, variante.codigoBarras, {
                            format: 'EAN13',
                            width: 2,
                            height: 50,
                            displayValue: false, // No mostrar texto debajo (lo mostramos aparte)
                            margin: 10,
                            background: '#ffffff'
                        });
                    } catch (error) {
                        console.error('Error generando código de barras visual:', error);
                    }
                }
            }
        });
    }

    /**
     * Agregar card de nueva variante
     */
    agregarVarianteCard() {
        const container = document.getElementById('variantesListContainer');
        if (!container) return;

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

            // Generar código de barras automáticamente para nuevas variantes
            const timestamp = Date.now().toString();
            const uniquePart = timestamp.slice(-9).padStart(9, '0');
            const withoutChecksum = '775' + uniquePart;
            const checksum = this.calcularDigitoControlEAN13(withoutChecksum);
            const codigoBarras = withoutChecksum + checksum;

            const varianteData = {
                producto: { id: parseInt(this.currentProducto.id) },
                talla: { id: tallaId },
                color: { id: colorId },
                stockActual: stock,
                activo: true,
                codigoBarras: codigoBarras  // Código de barras generado automáticamente
            };

            if (!this.currentProducto.stockMinimo && !this.currentProducto.stockMaximo) {
                const stockMin = card.querySelector('.variante-stock-min');
                const stockMax = card.querySelector('.variante-stock-max');
                if (stockMin) varianteData.stockMinimo = parseInt(stockMin.value) || null;
                if (stockMax) varianteData.stockMaximo = parseInt(stockMax.value) || null;
            }

            console.log('💾 Guardando variante con código de barras:', varianteData);

            const response = await fetch('/api/productos/variantes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(varianteData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            this.showToast('success', 'Éxito', `Variante guardada con código de barras: ${codigoBarras}`);

            await this.loadVariantesModal(this.currentProducto.id);
            await this.loadProductos();
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
     * EDITAR VARIANTE - Activar modo edición
     */
    editarVariante(varianteId) {
        console.log('✏️ Editando variante ID:', varianteId);
        
        const variante = this.variantesProductoActual.find(v => v.id === varianteId);
        if (!variante) {
            console.error('❌ Variante no encontrada:', varianteId);
            this.showToast('error', 'Error', 'No se encontró la variante');
            return;
        }
        
        console.log('📝 Variante encontrada:', variante);
        
        // Guardar valores originales - usar IDs directamente del DTO
        variante.valoresOriginales = {
            tallaId: variante.tallaId || (variante.talla ? variante.talla.id : null),
            colorId: variante.colorId || (variante.color ? variante.color.id : null),
            stockActual: variante.stockActual,
            stockMinimo: variante.stockMinimo,
            stockMaximo: variante.stockMaximo
        };
        
        variante.editMode = true;
        this.renderVariantesModal();
        
        console.log('✅ Modo edición activado para variante:', varianteId);
    }

    /**
     * GUARDAR EDICIÓN DE VARIANTE
     */
    async guardarEdicionVariante(varianteId) {
        try {
            const card = document.querySelector(`.variante-card[data-variante-id="${varianteId}"]`);
            if (!card) {
                console.error('❌ No se encontró el card de la variante');
                return;
            }

            const variante = this.variantesProductoActual.find(v => v.id === varianteId);
            if (!variante) {
                console.error('❌ No se encontró la variante en el array');
                return;
            }

            const stockActual = parseInt(card.querySelector('.variante-stock-edit').value) || 0;
            
            let tallaId, colorId;
            const tallaSelect = card.querySelector('.variante-talla-edit');
            const colorSelect = card.querySelector('.variante-color-edit');
            
            if (tallaSelect && colorSelect) {
                tallaId = parseInt(tallaSelect.value);
                colorId = parseInt(colorSelect.value);
            } else {
                // Usar los IDs del DTO
                tallaId = variante.tallaId || (variante.talla ? variante.talla.id : null);
                colorId = variante.colorId || (variante.color ? variante.color.id : null);
            }

            // Obtener código de barras si está en modo edición
            const barcodeInput = card.querySelector('.variante-barcode-edit');
            const codigoBarras = barcodeInput ? barcodeInput.value.trim() : (variante.codigoBarras || null);

            const varianteData = {
                producto: { id: parseInt(this.currentProducto.id) },
                talla: { id: tallaId },
                color: { id: colorId },
                stockActual: stockActual,
                activo: variante.activo !== undefined ? variante.activo : true,
                sku: variante.sku || null,
                codigoBarras: codigoBarras || null
            };

            const tieneControlGeneral = this.currentProducto.stockMinimo || this.currentProducto.stockMaximo;
            if (!tieneControlGeneral) {
                const stockMinInput = card.querySelector('.variante-stock-min-edit');
                const stockMaxInput = card.querySelector('.variante-stock-max-edit');
                if (stockMinInput) varianteData.stockMinimo = parseInt(stockMinInput.value) || null;
                if (stockMaxInput) varianteData.stockMaximo = parseInt(stockMaxInput.value) || null;
            } else {
                // Si el producto tiene control general, las variantes no deben tener stock min/max
                varianteData.stockMinimo = null;
                varianteData.stockMaximo = null;
            }

            console.log('💾 Actualizando variante:', varianteData);

            const response = await fetch(`/api/productos/variantes/${varianteId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(varianteData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error del servidor:', errorText);
                throw new Error(errorText);
            }

            const varianteActualizada = await response.json();
            console.log('✅ Variante actualizada:', varianteActualizada);

            this.showToast('success', 'Éxito', 'Variante actualizada correctamente');
            
            await this.loadVariantesModal(this.currentProducto.id);
            await this.loadProductos();
            
        } catch (error) {
            console.error('❌ Error actualizando variante:', error);
            this.showToast('error', 'Error', error.message || 'No se pudo actualizar la variante');
        }
    }

    /**
     * CANCELAR EDICIÓN DE VARIANTE
     */
    cancelarEdicionVariante(varianteId) {
        const variante = this.variantesProductoActual.find(v => v.id === varianteId);
        if (!variante) return;
        
        if (variante.valoresOriginales) {
            // Restaurar usando IDs directamente (DTO usa tallaId y colorId)
            variante.tallaId = variante.valoresOriginales.tallaId;
            variante.colorId = variante.valoresOriginales.colorId;
            if (variante.talla) variante.talla.id = variante.valoresOriginales.tallaId;
            if (variante.color) variante.color.id = variante.valoresOriginales.colorId;
            
            variante.stockActual = variante.valoresOriginales.stockActual;
            variante.stockMinimo = variante.valoresOriginales.stockMinimo;
            variante.stockMaximo = variante.valoresOriginales.stockMaximo;
            delete variante.valoresOriginales;
        }
        
        variante.editMode = false;
        this.renderVariantesModal();
    }

    /**
     * GENERAR SKU PREVIEW - Simula el formato del backend
     * Formato: CODIGO-COLOR-TALLA
     * Ejemplo: U22239413-NEGRO-M
     */
    generarSkuPreview(variante) {
        if (!this.currentProducto) return variante.sku || 'Sin SKU';
        
        const codigoProducto = this.currentProducto.codigo.toUpperCase();
        
        // Obtener nombre de la talla
        const varianteTallaId = variante.tallaId || (variante.talla ? variante.talla.id : null);
        const talla = this.tallas.find(t => t.id === varianteTallaId);
        const nombreTalla = talla ? talla.nombre.toUpperCase() : 'TALLA';
        
        // Obtener nombre del color
        const varianteColorId = variante.colorId || (variante.color ? variante.color.id : null);
        const color = this.colores.find(c => c.id === varianteColorId);
        const nombreColor = color ? color.nombre.toUpperCase().replace(/ /g, '-')
            .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
            .replace(/Ó/g, 'O').replace(/Ú/g, 'U') : 'COLOR';
        
        return `${codigoProducto}-${nombreColor}-${nombreTalla}`;
    }

    /**
     * ACTUALIZAR SKU PREVIEW EN TIEMPO REAL
     */
    actualizarSkuPreview(varianteId) {
        const card = document.querySelector(`.variante-card[data-variante-id="${varianteId}"]`);
        if (!card) return;

        const tallaSelect = card.querySelector('.variante-talla-edit');
        const colorSelect = card.querySelector('.variante-color-edit');
        const skuDisplay = document.getElementById(`sku-preview-${varianteId}`);
        
        if (!tallaSelect || !colorSelect || !skuDisplay) return;

        const tallaId = parseInt(tallaSelect.value);
        const colorId = parseInt(colorSelect.value);
        
        const codigoProducto = this.currentProducto.codigo.toUpperCase();
        
        const talla = this.tallas.find(t => t.id === tallaId);
        const nombreTalla = talla ? talla.nombre.toUpperCase() : 'TALLA';
        
        const color = this.colores.find(c => c.id === colorId);
        const nombreColor = color ? color.nombre.toUpperCase().replace(/ /g, '-')
            .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
            .replace(/Ó/g, 'O').replace(/Ú/g, 'U') : 'COLOR';
        
        const nuevoSku = `${codigoProducto}-${nombreColor}-${nombreTalla}`;
        
        // Actualizar el display con efecto visual
        skuDisplay.classList.add('sku-updating');
        setTimeout(() => {
            skuDisplay.textContent = nuevoSku;
            skuDisplay.classList.remove('sku-updating');
        }, 150);
        
        console.log('🔄 SKU actualizado:', nuevoSku);
    }

    /**
     * GENERAR CÓDIGO DE BARRAS AUTOMÁTICAMENTE
     * Genera un código EAN-13 válido basado en el ID de la variante
     */
    generarCodigoBarras(varianteId) {
        const card = document.querySelector(`.variante-card[data-variante-id="${varianteId}"]`);
        if (!card) return;

        const barcodeInput = card.querySelector('.variante-barcode-edit');
        if (!barcodeInput) return;

        // Generar código EAN-13
        // Formato: 775 (Perú) + 9 dígitos únicos + 1 dígito de control
        const timestamp = Date.now().toString();
        const uniquePart = (varianteId.toString() + timestamp).slice(-9).padStart(9, '0');
        const withoutChecksum = '775' + uniquePart;
        
        // Calcular dígito de control EAN-13
        const checksum = this.calcularDigitoControlEAN13(withoutChecksum);
        const codigoCompleto = withoutChecksum + checksum;
        
        barcodeInput.value = codigoCompleto;
        
        // Efecto visual
        barcodeInput.classList.add('input-highlight');
        setTimeout(() => barcodeInput.classList.remove('input-highlight'), 500);
        
        this.showToast('success', 'Generado', `Código de barras: ${codigoCompleto}`);
        console.log('🏷️ Código de barras generado:', codigoCompleto);
    }

    /**
     * CALCULAR DÍGITO DE CONTROL EAN-13
     * Algoritmo estándar para códigos de barras EAN-13
     */
    calcularDigitoControlEAN13(codigo12digitos) {
        let suma = 0;
        for (let i = 0; i < 12; i++) {
            const digito = parseInt(codigo12digitos[i]);
            // Alternar entre multiplicar por 1 y por 3
            suma += (i % 2 === 0) ? digito : digito * 3;
        }
        const modulo = suma % 10;
        return modulo === 0 ? 0 : 10 - modulo;
    }

    /**
     * IMPRIMIR CÓDIGO DE BARRAS
     * Abre ventana de impresión con el código de barras
     */
    imprimirCodigoBarras(varianteId, codigoBarras) {
        const variante = this.variantesProductoActual.find(v => v.id === varianteId);
        if (!variante) return;

        // Crear ventana de impresión
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiqueta - ${codigoBarras}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .etiqueta {
                        border: 2px solid #000;
                        padding: 20px;
                        text-align: center;
                        background: white;
                    }
                    .producto-nombre {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #333;
                    }
                    .variante-info {
                        font-size: 14px;
                        margin-bottom: 15px;
                        color: #666;
                    }
                    svg {
                        margin: 10px 0;
                    }
                    .codigo-numero {
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        font-weight: bold;
                        margin-top: 10px;
                        letter-spacing: 2px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="etiqueta">
                    <div class="producto-nombre">${variante.productoNombre || 'Producto'}</div>
                    <div class="variante-info">
                        ${variante.colorNombre} / ${variante.tallaNombre}<br>
                        SKU: ${variante.sku || 'N/A'}
                    </div>
                    <svg id="barcode"></svg>
                    <div class="codigo-numero">${codigoBarras}</div>
                </div>
                <script>
                    window.onload = function() {
                        JsBarcode("#barcode", "${codigoBarras}", {
                            format: "EAN13",
                            width: 2,
                            height: 100,
                            displayValue: false,
                            margin: 10
                        });
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
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
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem; font-weight: 600; width: 30%;">Código:</td>
                        <td style="padding: 0.75rem;">${producto.codigo}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem; font-weight: 600;">Nombre:</td>
                        <td style="padding: 0.75rem;">${producto.nombre}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem; font-weight: 600;">Descripción:</td>
                        <td style="padding: 0.75rem;">${producto.descripcion || '-'}</td>
                    </tr>
                </table>
            </div>
            <div class="form-section">
                <h4>Precios</h4>
                <table style="width: 100%;">
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem; font-weight: 600; width: 30%;">Precio Compra:</td>
                        <td style="padding: 0.75rem;">S/ ${parseFloat(producto.precioCompra).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
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