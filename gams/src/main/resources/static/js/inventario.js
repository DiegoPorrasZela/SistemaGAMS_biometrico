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
        this.currentPage = 1;
        this.itemsPerPage = 8;
        this.resizeTimeout = null;
        this.sortField = null;
        this.sortDir = 1;
        this.variantesExpandidas = {};
        this.variantesModalOrden = { sortField: 'color', sortDir: 1, filtroTalla: '', filtroColor: '' };

        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Inventario Manager...');
        
        await this.loadInitialData();
        this.initializeEventListeners();
        await this.loadProductos();
        this.updateItemsPerPage();
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.updateItemsPerPage(), 200);
        });

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

            // Proveedores
            const proveedoresResponse = await fetch('/api/proveedores?activo=true');
            if (proveedoresResponse.ok) {
                this.proveedores = await proveedoresResponse.json();
                this.populateSelect('productoProveedor', this.proveedores, 'nombre', 'id');
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
     * Parsear un campo numérico de stock: '' → null, '0' → 0
     * (parseInt(x) || null convertía el 0 en null y se perdía el control)
     */
    parseStockValue(value) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Estado de stock de un producto según su modo de control:
     * - Control GENERAL (min/max en el producto): el stock se evalúa como la
     *   suma de todas las variantes; una variante en 0 no alerta por sí sola.
     * - Control INDIVIDUAL (min/max por variante): cada variante cuenta por sí
     *   misma; una variante agotada marca el producto como sin stock y una
     *   bajo su mínimo lo marca como stock bajo.
     * Un producto sin variantes aún no participa del inventario: se reporta
     * como 'sin_variantes' (necesita configuración, no reposición).
     * Devuelve: 'sin_variantes' | 'sin_stock' | 'stock_bajo' | 'normal'
     */
    getEstadoStock(producto) {
        if ((producto.cantidadVariantes || 0) === 0) return 'sin_variantes';
        if ((producto.stockTotal || 0) === 0) return 'sin_stock';

        const tieneControlGeneral = producto.stockMinimo != null || producto.stockMaximo != null;
        if (tieneControlGeneral) {
            if (producto.stockMinimo != null && producto.stockTotal <= producto.stockMinimo) return 'stock_bajo';
            return 'normal';
        }

        // Control individual por variantes
        if ((producto.variantesSinStock || 0) > 0) return 'sin_stock';
        if ((producto.variantesConStockBajo || 0) > 0) return 'stock_bajo';
        return 'normal';
    }

    /**
     * Escapar HTML en datos ingresados por el usuario antes de inyectarlos
     * con innerHTML (nombres, descripciones, etc.)
     */
    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Formatear fecha para mostrar; null/inválida → '-'
     */
    formatFecha(fecha) {
        if (!fecha) return '-';
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    /**
     * Modal de confirmación estilizado (reemplaza al confirm() nativo).
     * Devuelve una Promise<boolean>: true = aceptar, false = cancelar.
     * type: 'warning' | 'danger' | 'success' | 'info'
     */
    showConfirm({ title = '¿Confirmar?', message = '', type = 'warning', confirmText = 'Aceptar', cancelText = 'Cancelar' }) {
        return new Promise(resolve => {
            const modal = document.getElementById('modalConfirm');
            if (!modal) { resolve(confirm(message)); return; }

            const icons = {
                warning: 'fa-exclamation-triangle',
                danger:  'fa-trash-alt',
                success: 'fa-toggle-on',
                info:    'fa-question-circle'
            };

            const iconEl = document.getElementById('confirmIcon');
            iconEl.className = `confirm-icon confirm-${type}`;
            iconEl.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i>`;

            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;

            const okBtn = document.getElementById('confirmOkBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');
            okBtn.textContent = confirmText;
            cancelBtn.textContent = cancelText;
            okBtn.className = `btn-confirm btn-confirm-${type}`;

            const cerrar = (resultado) => {
                closeModal('modalConfirm');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                resolve(resultado);
            };
            okBtn.onclick = () => cerrar(true);
            cancelBtn.onclick = () => cerrar(false);

            openModal('modalConfirm');
        });
    }

    /**
     * Modal de entrada de texto (reemplaza al prompt() nativo).
     * Devuelve Promise<string|null>: el texto ingresado o null si canceló.
     */
    showPrompt({ title = 'Nuevo', subtitle = '', placeholder = '', confirmText = 'Crear', initialValue = '' }) {
        return new Promise(resolve => {
            const modal = document.getElementById('modalPrompt');
            if (!modal) { resolve(window.prompt(title) || null); return; }

            document.getElementById('promptTitle').textContent = title;
            document.getElementById('promptSubtitle').textContent = subtitle;

            const input = document.getElementById('promptInput');
            const okBtn = document.getElementById('promptOkBtn');
            const cancelBtn = document.getElementById('promptCancelBtn');
            input.value = initialValue;
            input.placeholder = placeholder;
            okBtn.textContent = confirmText;

            const cerrar = (resultado) => {
                closeModal('modalPrompt');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                input.onkeydown = null;
                resolve(resultado);
            };

            okBtn.onclick = () => {
                const valor = input.value.trim();
                if (!valor) { input.focus(); return; }
                cerrar(valor);
            };
            cancelBtn.onclick = () => cerrar(null);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); okBtn.onclick(); }
                if (e.key === 'Escape') { cerrar(null); }
            };

            openModal('modalPrompt');
            setTimeout(() => input.focus(), 50);
        });
    }

    /**
     * Inicializar event listeners
     */
    initializeEventListeners() {
        // Búsqueda unificada: nombre, código o código de barras
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                clearTimeout(searchTimeout);
                // Si es todo dígitos y ≥ 8 caracteres → buscar como código de barras
                if (/^\d{8,}$/.test(val)) {
                    if (val.length === 13) {
                        // EAN-13 completo: busca inmediatamente
                        this.searchByBarcode(val);
                    }
                    // < 13 dígitos: esperar a que termine de escribir o presione Enter
                } else {
                    searchTimeout = setTimeout(() => this.loadProductos(), 300);
                }
            });
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const val = e.target.value.trim();
                    if (/^\d{8,}$/.test(val)) {
                        this.searchByBarcode(val);
                    } else {
                        this.loadProductos();
                    }
                }
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

        const btnExport = document.getElementById('btnExport');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportToExcel());
        }

        // Modal de catálogos
        const btnCatalogos = document.getElementById('btnCatalogos');
        if (btnCatalogos) {
            btnCatalogos.addEventListener('click', () => this.openCatalogosModal());
        }

        // Limpiar filtros
        const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiarFiltros) {
            btnLimpiarFiltros.addEventListener('click', () => this.limpiarFiltros());
        }

        // Ordenamiento por columna
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.addEventListener('click', () => this.sortBy(th.dataset.sort));
        });

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

        // Preview de imagen
        const imagenUrlInput = document.getElementById('productoImagenUrl');
        if (imagenUrlInput) {
            imagenUrlInput.addEventListener('input', () => this.updateImagenPreview());
        }

        // Validación: error al salir (blur), limpia error al escribir (input)
        ['productoCodigo', 'productoNombre', 'productoPrecioCompra', 'productoPrecioVenta'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('blur',  () => this.validateProductoField(id));
                el.addEventListener('input', () => { if (el.value.trim()) this.clearProductoFieldError(id); });
            }
        });
        ['productoCategoria', 'productoMarca'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.validateProductoField(id));
        });

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

            // Limpiar el campo para que loadProductos (dentro de highlightVarianteResult)
            // cargue la lista completa y el producto aparezca en la tabla
            const input = document.getElementById('searchInput');
            if (input) input.value = '';

            // Mostrar resultado: expandir el producto y resaltar la variante
            await this.highlightVarianteResult(variante);

            // Animación de match después de que la tabla ya cargó
            if (input) {
                input.classList.add('barcode-match');
                setTimeout(() => input.classList.remove('barcode-match'), 600);
            }

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
        // Recargar productos para asegurar que está en la lista completa
        await this.loadProductos();

        // Encontrar en qué índice está el producto dentro del array filtrado
        const productoIndex = this.productos.findIndex(p => p.id === variante.productoId);
        if (productoIndex === -1) {
            console.warn('Producto no encontrado en la lista:', variante.productoId);
            return;
        }

        // Calcular en qué página está y navegar a ella
        const paginaDestino = Math.floor(productoIndex / this.itemsPerPage) + 1;
        if (this.currentPage !== paginaDestino) {
            this.goToPage(paginaDestino);
        }

        // Verificar que el producto existe en el DOM (ya en la página correcta)
        const expansionRow = document.querySelector(`.variantes-expansion-row[data-producto-id="${variante.productoId}"]`);
        if (!expansionRow) {
            console.warn('Producto no encontrado en la tabla:', variante.productoId);
            return;
        }

        // Si no está expandido, expandirlo
        const isExpanded = expansionRow.style.display === 'table-row';
        if (!isExpanded) {
            await this.toggleVariantes(variante.productoId);
        }

        // Buscar la celda/fila de la variante y resaltarla (matriz o tabla)
        const varianteRow = document.querySelector(`[data-variante-id="${variante.id}"]`);
        if (varianteRow) {
            varianteRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            varianteRow.style.backgroundColor = '#fef3c7';
            varianteRow.style.transition = 'background-color 1.5s ease';
            setTimeout(() => { varianteRow.style.backgroundColor = ''; }, 2500);
        } else {
            console.warn('Fila de variante no encontrada en la expansión, id:', variante.id);
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
                this.productos = this.productos.filter(p => p.activo && this.getEstadoStock(p) === 'stock_bajo');
            } else if (estado === 'sin_stock') {
                this.productos = this.productos.filter(p => p.activo && this.getEstadoStock(p) === 'sin_stock');
            } else if (estado === 'sin_variantes') {
                this.productos = this.productos.filter(p => p.activo && this.getEstadoStock(p) === 'sin_variantes');
            }

            // Mostrar el botón "Limpiar" solo cuando hay filtros activos
            const btnLimpiar = document.getElementById('btnLimpiarFiltros');
            if (btnLimpiar) {
                btnLimpiar.style.display = (search || categoria || marca || estado) ? 'inline-flex' : 'none';
            }

            this.currentPage = 1;
            this.renderPage();
            this.refreshStats();

            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            this.showToast('error', 'Error', 'No se pudieron cargar los productos');
            this.renderEmptyState();
            this.showLoading(false);
        }
    }

    /**
     * Ordenar por columna: clic alterna asc/desc, nueva columna empieza asc
     */
    sortBy(campo) {
        if (this.sortField === campo) {
            this.sortDir = -this.sortDir;
        } else {
            this.sortField = campo;
            this.sortDir = 1;
        }
        this.currentPage = 1;
        this.renderPage();
    }

    aplicarOrdenamiento() {
        if (!this.sortField) return;
        const campo = this.sortField;
        const dir = this.sortDir;

        this.productos.sort((a, b) => {
            let va = a[campo];
            let vb = b[campo];
            if (typeof va === 'string' || typeof vb === 'string') {
                va = (va || '').toString().toLowerCase();
                vb = (vb || '').toString().toLowerCase();
                return va.localeCompare(vb) * dir;
            }
            return ((va || 0) - (vb || 0)) * dir;
        });
    }

    updateSortIcons() {
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            const icon = th.querySelector('.sort-icon');
            if (!icon) return;
            if (th.dataset.sort === this.sortField) {
                icon.className = `fas ${this.sortDir === 1 ? 'fa-sort-up' : 'fa-sort-down'} sort-icon sort-icon-active`;
            } else {
                icon.className = 'fas fa-sort sort-icon';
            }
        });
    }

    /**
     * Limpiar todos los filtros y recargar
     */
    limpiarFiltros() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategoria').value = '';
        document.getElementById('filterMarca').value = '';
        document.getElementById('filterEstado').value = '';
        this.loadProductos();
    }

    renderPage() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        this.updateSortIcons();

        if (this.productos.length === 0) {
            this.renderEmptyState();
            document.getElementById('paginationBar').classList.add('hidden');
            return;
        }

        this.aplicarOrdenamiento();

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pageProductos = this.productos.slice(start, start + this.itemsPerPage);

        let html = '';

        pageProductos.forEach(producto => {
            const statusClass = producto.activo ? 'badge-success' : 'badge-secondary';
            const statusText = producto.activo ? 'Activo' : 'Inactivo';
            
            const estadoStockProducto = this.getEstadoStock(producto);

            let stockClass = 'badge-success';
            if (estadoStockProducto === 'sin_stock') {
                stockClass = 'badge-danger';
            } else if (estadoStockProducto === 'stock_bajo') {
                stockClass = 'badge-warning';
            } else if (estadoStockProducto === 'sin_variantes') {
                stockClass = 'badge-secondary';
            }

            const hasVariantes = (producto.cantidadVariantes || 0) > 0;
            const expandIcon = hasVariantes ?
                `<i class="fas fa-chevron-right expand-icon"></i>` :
                '';

            const rowAlertClass = producto.activo && estadoStockProducto === 'sin_stock'
                ? 'row-sin-stock'
                : (producto.activo && estadoStockProducto === 'stock_bajo')
                    ? 'row-stock-bajo'
                    : '';

            // FILA PRINCIPAL DEL PRODUCTO
            html += `
                <tr class="producto-row ${rowAlertClass}" data-producto-id="${producto.id}">
                    <td ${hasVariantes ? `onclick="inventarioManager.toggleVariantes(${producto.id})" style="cursor: pointer;"` : ''}>
                        ${expandIcon}
                        ${producto.imagenUrl ? `<img src="${this.escapeHtml(producto.imagenUrl)}" alt="${this.escapeHtml(producto.nombre)}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; margin-right: 8px; vertical-align: middle;">` : ''}
                        <strong>${this.escapeHtml(producto.nombre)}</strong>
                        ${producto.descripcion ? `<br><small class="text-muted">${this.escapeHtml(producto.descripcion.substring(0, 50))}${producto.descripcion.length > 50 ? '...' : ''}</small>` : ''}
                    </td>
                    <td>${this.escapeHtml(producto.categoriaNombre) || '-'}</td>
                    <td>${this.escapeHtml(producto.marcaNombre) || '-'}</td>
                    <td class="text-center">
                        ${hasVariantes ?
                            `<span class="badge badge-info" onclick="inventarioManager.gestionarVariantes(${producto.id})" style="cursor: pointer;">${producto.cantidadVariantes}</span>` :
                            '<span class="badge badge-secondary">0</span>'
                        }
                    </td>
                    <td>
                        ${estadoStockProducto === 'sin_variantes' ?
                            `<span class="badge ${stockClass} badge-clickeable" onclick="inventarioManager.gestionarVariantes(${producto.id})" title="Crear variantes para este producto">
                                <i class="fas fa-layer-group"></i> Sin variantes
                            </span>` :
                            `<span class="badge ${stockClass}">
                                ${producto.stockTotal || 0} unidades
                            </span>`
                        }
                        ${producto.stockMinimo == null && producto.stockMaximo == null &&
                          (producto.variantesSinStock || 0) > 0 && (producto.stockTotal || 0) > 0 ?
                            `<br><small class="stock-nota-agotada"><i class="fas fa-exclamation-circle"></i> ${producto.variantesSinStock} variante(s) agotada(s)</small>` :
                            ''
                        }
                    </td>
                    <td>
                        <strong>S/ ${parseFloat(producto.precioVenta || 0).toFixed(2)}</strong>
                    </td>
                    <td class="text-center">
                        <label class="toggle-switch" title="${producto.activo ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}">
                            <input type="checkbox" class="toggle-input" ${producto.activo ? 'checked' : ''}
                                   onchange="inventarioManager.toggleEstado(${producto.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </td>
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
                        </div>
                    </td>
                </tr>
            `;

            // FILA EXPANDIBLE (OCULTA POR DEFECTO)
            if (hasVariantes) {
                html += `
                    <tr class="variantes-expansion-row" data-producto-id="${producto.id}" style="display: none;">
                        <td colspan="8" style="padding: 0; background: var(--bg-secondary);">
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
        this.renderPagination();
    }

    renderPagination() {
        const total = this.productos.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        const bar = document.getElementById('paginationBar');

        if (totalPages <= 1) {
            bar.classList.add('hidden');
            return;
        }

        bar.classList.remove('hidden');

        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, total);
        document.getElementById('paginationInfo').textContent = `${start}–${end} de ${total} productos`;
        document.getElementById('btnPrevPage').disabled = this.currentPage === 1;
        document.getElementById('btnNextPage').disabled = this.currentPage === totalPages;

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        document.getElementById('pageNumbers').innerHTML = pages.map(p => {
            if (p === '...') return `<span class="page-ellipsis">…</span>`;
            if (p === this.currentPage) return `<span class="page-num active">${p}</span>`;
            return `<button class="page-num" onclick="inventarioManager.goToPage(${p})">${p}</button>`;
        }).join('');
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.productos.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderPage();
    }

    async toggleEstado(id, nuevoEstado) {
        const producto = this.productos.find(p => p.id === id);
        if (!producto) return;

        // Confirmar: el cambio afecta también a las variantes del producto
        const numVariantes = producto.cantidadVariantes || 0;
        const detalleVariantes = numVariantes > 0 ? ` y sus ${numVariantes} variante(s)` : '';
        const confirmado = await this.showConfirm({
            title: nuevoEstado ? 'Activar producto' : 'Desactivar producto',
            message: nuevoEstado
                ? `Se activará "${producto.nombre}"${detalleVariantes} y volverá a estar disponible en el inventario.`
                : `Se desactivará "${producto.nombre}"${detalleVariantes} y dejará de estar disponible en el inventario.`,
            type: nuevoEstado ? 'success' : 'warning',
            confirmText: nuevoEstado ? 'Sí, activar' : 'Sí, desactivar'
        });

        if (!confirmado) {
            this.renderPage(); // restaurar el toggle a su posición original
            return;
        }

        try {
            const response = await fetch(`/api/productos/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: nuevoEstado })
            });
            if (!response.ok) throw new Error('Error al cambiar estado');

            this.showToast('success', 'Estado actualizado',
                nuevoEstado ? 'Producto y variantes activados' : 'Producto y variantes desactivados');

            // Recargar desde el servidor: el cambio afecta variantes y stock,
            // así la fila refleja la realidad sin necesidad de refrescar la página
            await this.loadProductos();
        } catch (error) {
            this.renderPage(); // restaurar el toggle
            this.refreshStats();
            this.showToast('error', 'Error', 'No se pudo cambiar el estado');
        }
    }

    calculateItemsPerPage() {
        const vh = window.innerHeight;
        const headerEl    = document.querySelector('.main-header');
        const statsEl     = document.querySelector('.stats-grid');
        const filtersEl   = document.querySelector('.filters-container');
        const tableHeadEl = document.querySelector('.data-table thead');

        const headerH    = headerEl    ? headerEl.offsetHeight    : 80;
        const mainPadV   = 48;
        const statsH     = statsEl     ? statsEl.offsetHeight + 24 : 110;
        const filtersH   = filtersEl   ? filtersEl.offsetHeight + 24 : 80;
        const tableHeadH = tableHeadEl ? tableHeadEl.offsetHeight   : 42;
        const paginationH = 52;

        const fixed     = headerH + mainPadV + statsH + filtersH + tableHeadH + paginationH;
        const rowHeight = 68;

        return Math.max(3, Math.floor((vh - fixed) / rowHeight));
    }

    updateItemsPerPage() {
        const newCount = this.calculateItemsPerPage();
        if (newCount !== this.itemsPerPage) {
            this.itemsPerPage = newCount;
            this.currentPage  = 1;
            this.renderPage();
        }
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

            this.variantesExpandidas[productoId] = { variantes };

            this.renderVariantesTabla(productoId, container);

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
     * Renderizar la expansión como matriz talla × color.
     * Encabezado: ubicación principal del producto (la que concentra más
     * unidades). Celdas con unidades fuera de ella llevan un marcador y se
     * detallan en la lista de excepciones bajo la matriz.
     */
    renderVariantesTabla(productoId, container = null) {
        if (!container) {
            container = document.querySelector(`.variantes-expansion-row[data-producto-id="${productoId}"] .variantes-expansion-container`);
        }
        const estado = this.variantesExpandidas[productoId];
        if (!container || !estado) return;

        const variantes = estado.variantes;

        if (variantes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>Este producto no tiene variantes</p>
                </div>
            `;
            return;
        }

        // Ubicación principal: la que concentra más unidades entre todas las variantes
        const unidadesPorUbicacion = {};
        variantes.forEach(v => (v.ubicaciones || []).forEach(u => {
            const nombre = u.ubicacion || 'Sin ubicación';
            unidadesPorUbicacion[nombre] = (unidadesPorUbicacion[nombre] || 0) + (u.cantidad || 0);
        }));
        let principal = null;
        let maxUnidades = -1;
        Object.entries(unidadesPorUbicacion).forEach(([nombre, unidades]) => {
            if (unidades > maxUnidades) { maxUnidades = unidades; principal = nombre; }
        });
        if (!principal) {
            const conUbicacion = variantes.find(v => v.ubicacion);
            principal = conUbicacion ? conUbicacion.ubicacion : 'Sin ubicación';
        }

        // Ejes de la matriz
        const tallas = [...new Set(variantes.map(v => v.tallaNombre).filter(Boolean))]
            .sort((a, b) => this.compararTallas(a, b));
        const colores = [...new Set(variantes.map(v => v.colorNombre).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
        const porCelda = {};
        variantes.forEach(v => { porCelda[`${v.colorNombre}|${v.tallaNombre}`] = v; });

        // Excepciones: unidades fuera de la ubicación principal, o variantes
        // sin stock cuya ubicación asignada no es la principal
        const fueraDePrincipal = (v) => (v.ubicaciones || []).filter(u =>
            (u.cantidad || 0) > 0 &&
            (u.ubicacion || '').toLowerCase() !== principal.toLowerCase());
        const asignadaFuera = (v) => (v.stockActual || 0) === 0 && v.ubicacion &&
            v.ubicacion.toLowerCase() !== principal.toLowerCase();
        const excepciones = variantes
            .map(v => ({ variante: v, fuera: fueraDePrincipal(v), sinUnidades: asignadaFuera(v) }))
            .filter(e => e.fuera.length > 0 || e.sinUnidades);
        const unidadesFuera = excepciones.reduce((sum, e) => sum + e.fuera.reduce((s, u) => s + u.cantidad, 0), 0);

        const celdaTh = 'padding: 0.6rem 0.9rem; font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; text-align: center; white-space: nowrap;';
        const celdaTd = 'padding: 0.55rem 0.9rem; text-align: center; border-top: 1px solid var(--border-color);';

        let html = `
            <div class="variantes-toolbar">
                <div class="variantes-toolbar-grupo">
                    <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                    <strong>${this.escapeHtml(principal)}</strong>
                    ${unidadesFuera > 0 ? `<span style="color: var(--warning-color); font-weight: 600;">· ${unidadesFuera} unidad${unidadesFuera !== 1 ? 'es' : ''} en otra ubicación</span>` : ''}
                </div>
                <span class="variantes-toolbar-contador">${variantes.length} variante${variantes.length !== 1 ? 's' : ''}</span>
            </div>
            <div style="background: white; border-radius: 8px; overflow-x: auto; box-shadow: var(--shadow-sm);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-secondary);">
                            <th style="${celdaTh} text-align: left;">Color</th>
                            ${tallas.map(t => `<th style="${celdaTh}">${this.escapeHtml(t)}</th>`).join('')}
                            <th style="${celdaTh} border-left: 2px solid var(--border-color);">Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const totalesPorTalla = {};
        let granTotal = 0;

        colores.forEach(color => {
            let totalColor = 0;
            let fila = `<td style="${celdaTd} text-align: left; font-weight: 600;">${this.escapeHtml(color)}</td>`;

            tallas.forEach(talla => {
                const v = porCelda[`${color}|${talla}`];
                if (!v) {
                    fila += `<td style="${celdaTd} color: var(--text-secondary); opacity: 0.4;">·</td>`;
                    return;
                }
                const stock = v.stockActual || 0;
                totalColor += stock;
                totalesPorTalla[talla] = (totalesPorTalla[talla] || 0) + stock;
                granTotal += stock;

                let badge = 'badge-success';
                if (stock === 0) badge = 'badge-danger';
                else if (v.stockMinimo != null && stock <= v.stockMinimo) badge = 'badge-warning';

                const fuera = fueraDePrincipal(v);
                const desglose = (v.ubicaciones || []).filter(u => (u.cantidad || 0) > 0)
                    .map(u => `${u.cantidad} en ${u.ubicacion}`).join(' · ')
                    || (asignadaFuera(v) ? `Se ubica en ${v.ubicacion} (sin unidades)` : 'Sin unidades');
                const marcador = (fuera.length > 0 || asignadaFuera(v))
                    ? `<i class="fas fa-map-marker-alt" style="font-size: 0.65rem; color: var(--warning-color); margin-left: 0.25rem;"></i>`
                    : '';

                fila += `
                    <td style="${celdaTd} cursor: pointer;" data-variante-id="${v.id}"
                        title="${this.escapeHtml(v.sku || '')}: ${this.escapeHtml(desglose)}"
                        onclick="inventarioManager.gestionarVariantes(${productoId})">
                        <span class="badge ${badge}">${stock}</span>${marcador}
                    </td>`;
            });

            fila += `<td style="${celdaTd} font-weight: 700; border-left: 2px solid var(--border-color);">${totalColor}</td>`;
            html += `<tr>${fila}</tr>`;
        });

        html += `
                        <tr style="background: var(--bg-secondary);">
                            <td style="${celdaTd} text-align: left; font-weight: 700;">Total</td>
                            ${tallas.map(t => `<td style="${celdaTd} font-weight: 700;">${totalesPorTalla[t] || 0}</td>`).join('')}
                            <td style="${celdaTd} font-weight: 700; border-left: 2px solid var(--border-color);">${granTotal}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        if (excepciones.length > 0) {
            html += `
                <div style="margin-top: 0.75rem; padding: 0.75rem 1rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 0.85rem;">
                    <div style="font-weight: 700; color: #92400e; margin-bottom: 0.35rem;">
                        <i class="fas fa-map-marker-alt"></i> Fuera de la ubicación principal
                    </div>
                    ${excepciones.map(e => {
                        const v = e.variante;
                        const detalle = e.fuera.length > 0
                            ? e.fuera.map(u => `${u.cantidad} en ${this.escapeHtml(u.ubicacion)}`).join(' · ')
                            : `se ubica en ${this.escapeHtml(v.ubicacion)} (sin unidades)`;
                        return `<div style="color: #92400e;">${this.escapeHtml(v.colorNombre)}/${this.escapeHtml(v.tallaNombre)} → ${detalle}</div>`;
                    }).join('')}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // ==================== EDITOR DE UBICACIONES ====================

    /** Resumen legible del desglose: "2 en Vitrina A · 1 en Exhibición" */
    resumenUbicaciones(variante) {
        const filas = (variante.ubicaciones || []).filter(u => (u.cantidad || 0) > 0);
        if (filas.length === 0) return variante.ubicacion || '—';
        if (filas.length === 1) return filas[0].ubicacion;
        return filas.map(u => `${u.cantidad} en ${u.ubicacion}`).join(' · ');
    }

    /** Abre el mini-modal para redistribuir el stock de una variante entre ubicaciones */
    abrirEditorUbicaciones(varianteId) {
        const variante = this.variantesProductoActual.find(v => v.id === varianteId);
        if (!variante) return;

        this.ubicacionesEditando = {
            varianteId,
            stockTotal: variante.stockActual || 0,
            filas: (variante.ubicaciones && variante.ubicaciones.length > 0)
                ? variante.ubicaciones.map(u => ({ ubicacion: u.ubicacion, cantidad: u.cantidad }))
                : [{ ubicacion: variante.ubicacion || '', cantidad: variante.stockActual || 0 }]
        };

        let overlay = document.getElementById('ubicacionesEditorOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ubicacionesEditorOverlay';
            overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(3px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;';
            document.body.appendChild(overlay);
        }

        // Cerrar con clic fuera del modal o con Escape
        overlay.onclick = (e) => {
            if (e.target === overlay) this.cerrarEditorUbicaciones();
        };
        this._ubicacionesEscHandler = (e) => {
            if (e.key === 'Escape') this.cerrarEditorUbicaciones();
        };
        document.addEventListener('keydown', this._ubicacionesEscHandler);

        overlay.innerHTML = `
            <div style="background: white; border-radius: 12px; box-shadow: var(--shadow-lg); width: 100%; max-width: 480px; max-height: 90vh; display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <h4 style="margin: 0; font-size: 1rem;">
                            <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                            Distribuir stock
                        </h4>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
                            ${this.escapeHtml(variante.colorNombre)}/${this.escapeHtml(variante.tallaNombre)} · ${this.escapeHtml(variante.sku || '')} · Stock: ${this.ubicacionesEditando.stockTotal}
                        </div>
                    </div>
                    <button type="button" onclick="inventarioManager.cerrarEditorUbicaciones()" title="Cerrar" style="background: none; border: none; font-size: 1.1rem; color: var(--text-secondary); cursor: pointer; padding: 0.4rem 0.55rem; border-radius: 6px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="display: flex; gap: 0.5rem; padding: 0.9rem 1.25rem 0; font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em;">
                    <span style="flex: 1;">Ubicación</span>
                    <span style="width: 80px; text-align: center;">Cantidad</span>
                    <span style="width: 22px;"></span>
                </div>
                <div id="ubicacionesEditorFilas" style="padding: 0.5rem 1.25rem 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;"></div>
                <div style="padding: 0 1.25rem 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="inventarioManager.agregarFilaUbicacion()" style="flex: 1; background: none; border: 1px dashed var(--border-color); border-radius: 8px; padding: 0.5rem; color: var(--primary-color); cursor: pointer; font-size: 0.85rem;">
                            <i class="fas fa-plus"></i> Agregar ubicación
                        </button>
                        <button type="button" onclick="inventarioManager.agregarFilaExhibicion()" title="Unidades colgadas o en vitrina de muestra" style="flex: 1; background: none; border: 1px dashed var(--warning-color); border-radius: 8px; padding: 0.5rem; color: var(--warning-color); cursor: pointer; font-size: 0.85rem;">
                            <i class="fas fa-store"></i> + Exhibición
                        </button>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        La ubicación es texto libre. Ejemplo: 2 en "Vitrina A" y 1 en "Exhibición" para la unidad colgada.
                    </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.9rem 1.25rem; border-top: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: 0 0 12px 12px;">
                    <span id="ubicacionesEditorContador" style="font-size: 0.85rem; font-weight: 600;"></span>
                    <div style="display: flex; gap: 0.6rem;">
                        <button type="button" onclick="inventarioManager.cerrarEditorUbicaciones()"
                                style="padding: 0.55rem 1.1rem; background: white; border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="button" id="ubicacionesEditorGuardar" onclick="inventarioManager.guardarUbicaciones()"
                                style="padding: 0.55rem 1.25rem; background: var(--primary-color); border: none; border-radius: 8px; color: white; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
        this.renderFilasUbicaciones();

        const primerInput = document.querySelector('#ubicacionesEditorFilas input[type="text"]');
        if (primerInput) primerInput.focus();
    }

    renderFilasUbicaciones() {
        const contenedor = document.getElementById('ubicacionesEditorFilas');
        if (!contenedor || !this.ubicacionesEditando) return;

        contenedor.innerHTML = this.ubicacionesEditando.filas.map((fila, i) => `
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" value="${this.escapeHtml(fila.ubicacion)}" placeholder="Ej: Vitrina A, Exhibición" maxlength="100"
                       style="flex: 1; min-width: 0; padding: 0.45rem 0.6rem; border: 1px solid var(--border-color); border-radius: 6px;"
                       oninput="inventarioManager.actualizarFilaUbicacion(${i}, 'ubicacion', this.value)">
                <input type="number" value="${fila.cantidad}" min="0"
                       style="width: 80px; padding: 0.45rem 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; text-align: center;"
                       oninput="inventarioManager.actualizarFilaUbicacion(${i}, 'cantidad', this.value)">
                <button type="button" onclick="inventarioManager.eliminarFilaUbicacion(${i})" title="Quitar ubicación"
                        style="background: none; border: none; color: var(--danger-color); cursor: pointer; width: 22px; padding: 0; ${this.ubicacionesEditando.filas.length === 1 ? 'visibility: hidden;' : ''}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        this.actualizarContadorUbicaciones();
    }

    actualizarFilaUbicacion(indice, campo, valor) {
        const fila = this.ubicacionesEditando?.filas[indice];
        if (!fila) return;
        fila[campo] = campo === 'cantidad' ? (parseInt(valor) || 0) : valor;
        this.actualizarContadorUbicaciones();
    }

    agregarFilaUbicacion() {
        if (!this.ubicacionesEditando) return;
        this.ubicacionesEditando.filas.push({ ubicacion: '', cantidad: 0 });
        this.renderFilasUbicaciones();
    }

    eliminarFilaUbicacion(indice) {
        if (!this.ubicacionesEditando || this.ubicacionesEditando.filas.length <= 1) return;
        this.ubicacionesEditando.filas.splice(indice, 1);
        this.renderFilasUbicaciones();
    }

    /** Atajo: agrega la fila "Exhibición" para las unidades colgadas/de muestra */
    agregarFilaExhibicion() {
        if (!this.ubicacionesEditando) return;
        const existe = this.ubicacionesEditando.filas.some(f => {
            const nombre = (f.ubicacion || '').trim().toLowerCase();
            return nombre === 'exhibición' || nombre === 'exhibicion';
        });
        if (existe) {
            this.showToast('info', 'Exhibición', 'Ya hay una fila de Exhibición: ajusta su cantidad');
            return;
        }
        this.ubicacionesEditando.filas.push({ ubicacion: 'Exhibición', cantidad: 0 });
        this.renderFilasUbicaciones();
    }

    /** Muestra "Distribuidas X de Y" y habilita Guardar solo cuando cuadran */
    actualizarContadorUbicaciones() {
        const contador = document.getElementById('ubicacionesEditorContador');
        const btnGuardar = document.getElementById('ubicacionesEditorGuardar');
        if (!contador || !this.ubicacionesEditando) return;

        const { filas, stockTotal } = this.ubicacionesEditando;
        const suma = filas.reduce((s, f) => s + (f.cantidad || 0), 0);
        const cuadra = suma === stockTotal;

        if (stockTotal === 0 && cuadra) {
            contador.style.color = 'var(--text-secondary)';
            contador.innerHTML = `<i class="fas fa-info-circle"></i> Sin unidades: la ubicación indica dónde se guardará`;
        } else if (cuadra) {
            contador.style.color = 'var(--success-color)';
            contador.innerHTML = `<i class="fas fa-check-circle"></i> Distribuidas ${suma} de ${stockTotal}`;
        } else {
            contador.style.color = 'var(--danger-color)';
            contador.innerHTML = `<i class="fas fa-exclamation-circle"></i> Distribuidas ${suma} de ${stockTotal} (${suma > stockTotal ? 'sobran' : 'faltan'} ${Math.abs(stockTotal - suma)})`;
        }

        if (btnGuardar) {
            btnGuardar.disabled = !cuadra;
            btnGuardar.style.opacity = cuadra ? '1' : '0.5';
            btnGuardar.style.cursor = cuadra ? 'pointer' : 'not-allowed';
        }
    }

    async guardarUbicaciones() {
        if (!this.ubicacionesEditando) return;
        const { varianteId, filas, stockTotal } = this.ubicacionesEditando;

        const limpias = filas
            .map(f => ({ ubicacion: (f.ubicacion || '').trim(), cantidad: f.cantidad || 0 }))
            .filter(f => f.ubicacion || f.cantidad > 0);

        if (limpias.some(f => !f.ubicacion)) {
            this.showToast('warning', 'Atención', 'Hay una ubicación sin nombre');
            return;
        }
        const nombres = limpias.map(f => f.ubicacion.toLowerCase());
        if (new Set(nombres).size !== nombres.length) {
            this.showToast('warning', 'Atención', 'Hay ubicaciones repetidas');
            return;
        }
        const suma = limpias.reduce((s, f) => s + f.cantidad, 0);
        if (suma !== stockTotal) {
            this.showToast('warning', 'Atención', `La suma (${suma}) debe ser igual al stock (${stockTotal})`);
            return;
        }
        if (limpias.length === 0) {
            this.showToast('warning', 'Atención', 'Agrega al menos una ubicación');
            return;
        }

        try {
            const response = await fetch(`/api/productos/variantes/${varianteId}/ubicaciones`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(limpias)
            });
            if (!response.ok) {
                throw new Error(await response.text() || 'No se pudo guardar la distribución');
            }

            this.showToast('success', 'Éxito', 'Distribución de stock guardada');
            this.cerrarEditorUbicaciones();

            // Refrescar modal, expansión (matriz) y lista de productos
            const productoId = this.currentProducto?.id;
            if (productoId) {
                await this.loadVariantesModal(productoId);
                if (this.variantesExpandidas[productoId]) {
                    const container = document.querySelector(`.variantes-expansion-row[data-producto-id="${productoId}"] .variantes-expansion-container`);
                    if (container) await this.cargarVariantesEnTabla(productoId, container);
                }
            }
        } catch (error) {
            console.error('❌ Error guardando ubicaciones:', error);
            this.showToast('error', 'Error', error.message || 'No se pudo guardar la distribución');
        }
    }

    cerrarEditorUbicaciones() {
        const overlay = document.getElementById('ubicacionesEditorOverlay');
        if (overlay) overlay.style.display = 'none';
        if (this._ubicacionesEscHandler) {
            document.removeEventListener('keydown', this._ubicacionesEscHandler);
            this._ubicacionesEscHandler = null;
        }
        this.ubicacionesEditando = null;
    }

    /**
     * Filtrar lista de variantes por talla y/o color
     */
    filtrarVariantes(lista, filtroTalla, filtroColor) {
        return lista.filter(v =>
            (!filtroTalla || v.tallaNombre === filtroTalla) &&
            (!filtroColor || v.colorNombre === filtroColor)
        );
    }

    /**
     * Ordenar variantes por un campo; desempata por talla y luego color
     */
    ordenarVariantes(lista, campo, dir) {
        return [...lista].sort((a, b) => {
            let r;
            switch (campo) {
                case 'talla': r = this.compararTallas(a.tallaNombre, b.tallaNombre); break;
                case 'stock': r = (a.stockActual || 0) - (b.stockActual || 0); break;
                case 'sku': r = (a.sku || '').localeCompare(b.sku || ''); break;
                case 'ubicacion': r = (a.ubicacion || '').localeCompare(b.ubicacion || ''); break;
                case 'color':
                default: r = (a.colorNombre || '').localeCompare(b.colorNombre || ''); break;
            }
            if (r === 0 && campo !== 'talla') r = this.compararTallas(a.tallaNombre, b.tallaNombre);
            if (r === 0) r = (a.colorNombre || '').localeCompare(b.colorNombre || '');
            return r * dir;
        });
    }

    /**
     * Comparar tallas con orden lógico (XS < S < M < L < XL...), numérico si aplica
     */
    compararTallas(a, b) {
        const ordenTallas = { 'XXS': 0, 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7 };
        const na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        const oa = ordenTallas[(a || '').toUpperCase().trim()];
        const ob = ordenTallas[(b || '').toUpperCase().trim()];
        if (oa != null && ob != null) return oa - ob;
        if (oa != null) return -1;
        if (ob != null) return 1;
        return (a || '').localeCompare(b || '');
    }

    /**
     * Renderizar estado vacío
     */
    renderEmptyState() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        // Ocultar la paginación de un render anterior para no mostrar
        // "No hay productos" junto a "1–4 de N productos"
        const paginationBar = document.getElementById('paginationBar');
        if (paginationBar) paginationBar.classList.add('hidden');

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
     * Actualizar las tarjetas de estadísticas a partir de una lista de productos
     */
    updateStats(productos = this.productos) {
        const total = productos.length;
        const totalVariantes = productos.reduce((sum, p) => sum + (p.cantidadVariantes || 0), 0);
        const stockBajo = productos.filter(p => p.activo && this.getEstadoStock(p) === 'stock_bajo').length;
        const sinStock = productos.filter(p => p.activo && this.getEstadoStock(p) === 'sin_stock').length;

        document.getElementById('totalProductos').textContent = total;
        document.getElementById('totalVariantes').textContent = totalVariantes;
        document.getElementById('stockBajo').textContent = stockBajo;
        document.getElementById('sinStock').textContent  = sinStock;
    }

    /**
     * Refrescar estadísticas GLOBALES: si hay filtros activos, consulta la
     * lista completa para que las tarjetas no reflejen solo lo filtrado
     */
    async refreshStats() {
        const hayFiltros =
            document.getElementById('searchInput').value.trim() !== '' ||
            document.getElementById('filterCategoria').value !== '' ||
            document.getElementById('filterMarca').value !== '' ||
            document.getElementById('filterEstado').value !== '';

        if (!hayFiltros) {
            this.updateStats();
            return;
        }

        try {
            const response = await fetch('/api/productos');
            if (response.ok) {
                this.updateStats(await response.json());
            }
        } catch (error) {
            console.error('❌ Error refrescando estadísticas:', error);
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
        this.clearImagenPreview();
        this.clearAllProductoErrors();
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
        this.updateImagenPreview();

        // CORREGIDO: Usar categoriaId y marcaId del DTO
        const categoriaValue = producto.categoriaId || producto.categoria?.id || '';
        const marcaValue = producto.marcaId || producto.marca?.id || '';
        
        document.getElementById('productoCategoria').value = categoriaValue;
        document.getElementById('productoMarca').value = marcaValue;
        document.getElementById('productoProveedor').value = producto.proveedorId || '';
        
        console.log('📋 Preseleccionando categoría:', categoriaValue, 'marca:', marcaValue);
        
        document.getElementById('productoGenero').value = producto.genero || 'UNISEX';
        document.getElementById('productoTemporada').value = producto.temporada || 'TODO_ANO';
        document.getElementById('productoPrecioCompra').value = producto.precioCompra;
        document.getElementById('productoPrecioVenta').value = producto.precioVenta;
        document.getElementById('productoStockMinimo').value = producto.stockMinimo != null ? producto.stockMinimo : '';
        document.getElementById('productoStockMaximo').value = producto.stockMaximo != null ? producto.stockMaximo : '';
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

    // ── Validación del formulario de producto ─────────────────────────────────

    showProductoFieldError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        if (input) input.classList.add('field-error');
        if (errorSpan) { errorSpan.textContent = message; errorSpan.classList.add('visible'); }
    }

    clearProductoFieldError(fieldId) {
        const input = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        if (input) input.classList.remove('field-error');
        if (errorSpan) { errorSpan.textContent = ''; errorSpan.classList.remove('visible'); }
    }

    clearAllProductoErrors() {
        ['productoCodigo', 'productoNombre', 'productoCategoria', 'productoMarca',
         'productoPrecioCompra', 'productoPrecioVenta', 'productoStockMinimo', 'productoStockMaximo']
            .forEach(id => this.clearProductoFieldError(id));
    }

    validateProductoField(fieldId) {
        const el = document.getElementById(fieldId);
        const value = el ? el.value.trim() : '';
        const labels = {
            productoCodigo:       'El código es obligatorio',
            productoNombre:       'El nombre es obligatorio',
            productoCategoria:    'La categoría es obligatoria',
            productoMarca:        'La marca es obligatoria',
            productoPrecioCompra: 'El precio de inversión es obligatorio',
            productoPrecioVenta:  'El precio de venta es obligatorio',
        };
        if (!value) {
            this.showProductoFieldError(fieldId, labels[fieldId] || 'Campo obligatorio');
            return false;
        }
        this.clearProductoFieldError(fieldId);
        return true;
    }

    validateProductoForm() {
        let valid = true;
        ['productoCodigo', 'productoNombre', 'productoCategoria', 'productoMarca', 'productoPrecioCompra', 'productoPrecioVenta']
            .forEach(id => { if (!this.validateProductoField(id)) valid = false; });

        // Coherencia de precios: no vender por debajo de la inversión
        const compra = parseFloat(document.getElementById('productoPrecioCompra').value);
        const venta = parseFloat(document.getElementById('productoPrecioVenta').value);
        if (!isNaN(compra) && !isNaN(venta) && venta < compra) {
            this.showProductoFieldError('productoPrecioVenta',
                'El precio de venta no puede ser menor al precio de inversión');
            valid = false;
        }

        // Coherencia de stock: mínimo no puede superar al máximo
        const stockMin = this.parseStockValue(document.getElementById('productoStockMinimo').value);
        const stockMax = this.parseStockValue(document.getElementById('productoStockMaximo').value);
        if (stockMin != null && stockMax != null && stockMin > stockMax) {
            this.showProductoFieldError('productoStockMaximo',
                'El stock máximo debe ser mayor o igual al mínimo');
            valid = false;
        }

        return valid;
    }

    updateImagenPreview() {
        const url = document.getElementById('productoImagenUrl').value.trim();
        const container = document.getElementById('imagenPreviewContainer');
        const img = document.getElementById('imagenPreview');
        if (!url) {
            container.style.display = 'none';
            img.src = '';
            return;
        }
        img.onload = () => { container.style.display = 'flex'; };
        img.onerror = () => { container.style.display = 'none'; };
        img.src = url;
    }

    clearImagenPreview() {
        const container = document.getElementById('imagenPreviewContainer');
        const img = document.getElementById('imagenPreview');
        const input = document.getElementById('productoImagenUrl');
        if (container) container.style.display = 'none';
        if (img) img.src = '';
        if (input) input.value = '';
    }

    generarCodigoProducto() {
        const nombre = document.getElementById('productoNombre').value.trim();
        let prefijo;
        if (nombre) {
            // Tomar las primeras letras de cada palabra (máx 4 palabras)
            prefijo = nombre.split(/\s+/).slice(0, 4)
                .map(w => w[0].toUpperCase()).join('');
        } else {
            prefijo = 'PRD';
        }
        // Sufijo numérico de 4 dígitos basado en timestamp
        const sufijo = String(Date.now()).slice(-4);
        const codigo = `${prefijo}-${sufijo}`;
        document.getElementById('productoCodigo').value = codigo;
        // Pequeña animación de feedback
        const input = document.getElementById('productoCodigo');
        input.classList.add('input-generated');
        setTimeout(() => input.classList.remove('input-generated'), 800);
    }

    /**
     * Guardar producto (SIN variantes)
     */
    async saveProducto() {
        if (!this.validateProductoForm()) return;

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
                stockMinimo: this.parseStockValue(document.getElementById('productoStockMinimo').value),
                stockMaximo: this.parseStockValue(document.getElementById('productoStockMaximo').value),
                // Al editar se conserva el estado actual; solo los productos nuevos nacen activos
                activo: this.currentProducto ? this.currentProducto.activo : true,
                categoria: {
                    id: parseInt(document.getElementById('productoCategoria').value)
                }
            };

            const marcaId = document.getElementById('productoMarca').value;
            if (marcaId) {
                productoData.marca = { id: parseInt(marcaId) };
            }

            const proveedorId = document.getElementById('productoProveedor').value;
            productoData.proveedor = proveedorId ? { id: parseInt(proveedorId) } : null;

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
            if (producto.stockMinimo != null || producto.stockMaximo != null) {
                alertaStock.style.display = 'flex';
            } else {
                alertaStock.style.display = 'none';
            }

            this.variantesModalOrden = { sortField: 'color', sortDir: 1, filtroTalla: '', filtroColor: '' };

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
        const toolbarContainer = document.getElementById('variantesToolbar');
        if (!container) return;

        if (this.variantesProductoActual.length === 0) {
            if (toolbarContainer) toolbarContainer.innerHTML = '';
            container.innerHTML = `
                <div class="variantes-empty">
                    <i class="fas fa-layer-group"></i>
                    <h4>No hay variantes</h4>
                    <p>Haz clic en "Agregar Variante" para crear la primera</p>
                </div>
            `;
            return;
        }

        const { sortField, sortDir, filtroTalla, filtroColor } = this.variantesModalOrden;
        const todas = this.variantesProductoActual;

        const visibles = this.ordenarVariantes(
            this.filtrarVariantes(todas, filtroTalla, filtroColor),
            sortField, sortDir
        );

        if (toolbarContainer) {
            const tallasUnicas = [...new Set(todas.map(v => v.tallaNombre).filter(Boolean))]
                .sort((a, b) => this.compararTallas(a, b));
            const coloresUnicos = [...new Set(todas.map(v => v.colorNombre).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b));
            const hayFiltros = filtroTalla || filtroColor;
            const camposOrden = [
                ['color', 'Color'],
                ['talla', 'Talla'],
                ['stock', 'Stock'],
                ['ubicacion', 'Ubicación'],
                ['sku', 'SKU']
            ];

            toolbarContainer.innerHTML = `
                <div class="variantes-toolbar">
                    <div class="variantes-toolbar-grupo">
                        <i class="fas fa-sort-amount-down"></i>
                        <span>Ordenar:</span>
                        <select onchange="inventarioManager.setOrdenVariantesModal(this.value)">
                            ${camposOrden.map(([valor, texto]) => `<option value="${valor}" ${sortField === valor ? 'selected' : ''}>${texto}</option>`).join('')}
                        </select>
                        <button type="button" class="variantes-toolbar-dir" onclick="inventarioManager.toggleDirVariantesModal()" title="${sortDir === 1 ? 'Ascendente (clic para descendente)' : 'Descendente (clic para ascendente)'}">
                            <i class="fas ${sortDir === 1 ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'}"></i>
                        </button>
                    </div>
                    <div class="variantes-toolbar-grupo">
                        <i class="fas fa-filter"></i>
                        <select onchange="inventarioManager.setFiltroVariantesModal('filtroTalla', this.value)">
                            <option value="">Todas las tallas</option>
                            ${tallasUnicas.map(t => `<option value="${this.escapeHtml(t)}" ${filtroTalla === t ? 'selected' : ''}>${this.escapeHtml(t)}</option>`).join('')}
                        </select>
                        <select onchange="inventarioManager.setFiltroVariantesModal('filtroColor', this.value)">
                            <option value="">Todos los colores</option>
                            ${coloresUnicos.map(c => `<option value="${this.escapeHtml(c)}" ${filtroColor === c ? 'selected' : ''}>${this.escapeHtml(c)}</option>`).join('')}
                        </select>
                        ${hayFiltros ? `
                        <button type="button" class="variantes-toolbar-limpiar" onclick="inventarioManager.limpiarFiltrosVariantesModal()">
                            <i class="fas fa-times"></i> Limpiar
                        </button>` : ''}
                    </div>
                    <span class="variantes-toolbar-contador">${visibles.length} de ${todas.length} variante${todas.length !== 1 ? 's' : ''}</span>
                </div>
            `;
        }

        if (visibles.length === 0) {
            container.innerHTML = `
                <div class="variantes-empty">
                    <i class="fas fa-filter"></i>
                    <h4>Sin coincidencias</h4>
                    <p>Ninguna variante coincide con los filtros seleccionados</p>
                </div>
            `;
            return;
        }

        let html = '';
        visibles.forEach((variante, index) => {
            const tieneControlGeneral = this.currentProducto.stockMinimo != null || this.currentProducto.stockMaximo != null;
            const isEditMode = variante.editMode || false;
            
            html += `
                <div class="variante-card" data-variante-id="${variante.id}" data-edit-mode="${isEditMode}" data-barcode="${this.escapeHtml(variante.codigoBarras)}">
                    <div class="variante-num" title="Variante ${index + 1}">${index + 1}</div>
                    <div class="variante-card-body">
                        <div class="variante-field">
                            <label>Talla${isEditMode ? `
                                <button type="button" class="btn-add-mini" onclick="inventarioManager.quickAddCatalogoVarianteEdit('tallas', this, ${variante.id})" title="Crear nueva talla">
                                    <i class="fas fa-plus"></i>
                                </button>` : ''}
                            </label>
                            ${isEditMode ? `
                                <select class="variante-talla-edit" onchange="inventarioManager.actualizarSkuPreview(${variante.id})">
                                    ${this.tallas.filter(t => t.activo).map(t => {
                                        const varianteTallaId = variante.tallaId || (variante.talla ? variante.talla.id : null);
                                        return `<option value="${t.id}" ${varianteTallaId === t.id ? 'selected' : ''}>${this.escapeHtml(t.nombre)}</option>`;
                                    }).join('')}
                                </select>
                            ` : `
                                <input type="text" value="${this.escapeHtml(variante.tallaNombre)}" readonly>
                            `}
                        </div>
                        <div class="variante-field">
                            <label>Color${isEditMode ? `
                                <button type="button" class="btn-add-mini" onclick="inventarioManager.quickAddCatalogoVarianteEdit('colores', this, ${variante.id})" title="Crear nuevo color">
                                    <i class="fas fa-plus"></i>
                                </button>` : ''}
                            </label>
                            ${isEditMode ? `
                                <select class="variante-color-edit" onchange="inventarioManager.actualizarSkuPreview(${variante.id})">
                                    ${this.colores.filter(c => c.activo).map(c => {
                                        const varianteColorId = variante.colorId || (variante.color ? variante.color.id : null);
                                        return `<option value="${c.id}" ${varianteColorId === c.id ? 'selected' : ''}>${this.escapeHtml(c.nombre)}</option>`;
                                    }).join('')}
                                </select>
                            ` : `
                                <input type="text" value="${this.escapeHtml(variante.colorNombre)}" readonly>
                            `}
                        </div>
                        <div class="variante-field variante-field-num">
                            <label>Stock</label>
                            <input type="number" class="variante-stock-edit" value="${variante.stockActual || 0}" ${!isEditMode ? 'readonly' : ''} min="0">
                        </div>
                        ${!tieneControlGeneral ? `
                        <div class="variante-field variante-field-num">
                            <label>Mínimo</label>
                            <input type="number" class="variante-stock-min-edit" value="${variante.stockMinimo != null ? variante.stockMinimo : ''}" placeholder="—" ${!isEditMode ? 'readonly' : ''} min="0">
                        </div>
                        <div class="variante-field variante-field-num">
                            <label>Máximo</label>
                            <input type="number" class="variante-stock-max-edit" value="${variante.stockMaximo != null ? variante.stockMaximo : ''}" placeholder="—" ${!isEditMode ? 'readonly' : ''} min="0">
                        </div>
                        ` : ''}
                        <div class="variante-field">
                            <label>Ubicación</label>
                            ${isEditMode ? `
                                <input type="text" class="variante-ubicacion-edit" value="${this.escapeHtml(variante.ubicacion)}" placeholder="—" maxlength="100">
                            ` : `
                                <div style="display: flex; gap: 0.35rem; align-items: center;">
                                    <input type="text" value="${this.escapeHtml(this.resumenUbicaciones(variante))}" readonly title="${this.escapeHtml(this.resumenUbicaciones(variante))}" style="flex: 1; min-width: 0;">
                                    <button type="button" class="btn-add-mini" onclick="inventarioManager.abrirEditorUbicaciones(${variante.id})" title="Distribuir stock entre ubicaciones">
                                        <i class="fas fa-map-marker-alt"></i>
                                    </button>
                                </div>
                            `}
                        </div>
                        <div class="variante-field variante-field-sku">
                            <label>SKU ${isEditMode ? '<span class="sku-preview-label">(auto)</span>' : ''}</label>
                            <div class="sku-display ${isEditMode ? 'sku-preview' : ''}" id="sku-preview-${variante.id}">
                                ${this.escapeHtml(this.generarSkuPreview(variante))}
                            </div>
                        </div>
                        <div class="variante-field variante-field-barcode">
                            <label>Código de Barras ${isEditMode ? `<button type="button" class="btn-generate-barcode" onclick="inventarioManager.generarCodigoBarras(${variante.id})" title="Generar automáticamente"><i class="fas fa-magic"></i></button>` : ''}</label>
                            ${isEditMode ? `
                                <input type="text" class="variante-barcode-edit" value="${this.escapeHtml(variante.codigoBarras)}" placeholder="Ej: 7751234567890" maxlength="13">
                            ` : variante.codigoBarras ? `
                                <div class="barcode-visual-container">
                                    <svg class="barcode-svg" id="barcode-${variante.id}"></svg>
                                    <span class="barcode-number">${this.escapeHtml(variante.codigoBarras)}</span>
                                    <button class="btn-print-barcode" onclick="inventarioManager.imprimirCodigoBarras(${variante.id}, this.closest('.variante-card').dataset.barcode)" title="Imprimir etiqueta">
                                        <i class="fas fa-print"></i>
                                    </button>
                                </div>
                            ` : `
                                <div class="barcode-display">Sin código</div>
                            `}
                        </div>
                    </div>
                    <div class="variante-card-actions">
                        ${isEditMode ? `
                            <button class="btn-save" onclick="inventarioManager.guardarEdicionVariante(${variante.id})" title="Guardar cambios">
                                <i class="fas fa-save"></i>
                            </button>
                            <button class="btn-cancel-edit" onclick="inventarioManager.cancelarEdicionVariante(${variante.id})" title="Cancelar">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : `
                            <button class="btn-edit" onclick="inventarioManager.editarVariante(${variante.id})" title="Editar variante">
                                <i class="fas fa-edit"></i>
                            </button>
                        `}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;

        // Renderizar códigos de barras visuales después de insertar el HTML
        this.renderBarcodes();
    }

    setOrdenVariantesModal(campo) {
        this.variantesModalOrden.sortField = campo;
        this.renderVariantesModal();
    }

    toggleDirVariantesModal() {
        this.variantesModalOrden.sortDir = -this.variantesModalOrden.sortDir;
        this.renderVariantesModal();
    }

    setFiltroVariantesModal(campo, valor) {
        this.variantesModalOrden[campo] = valor;
        this.renderVariantesModal();
    }

    limpiarFiltrosVariantesModal() {
        this.variantesModalOrden.filtroTalla = '';
        this.variantesModalOrden.filtroColor = '';
        this.renderVariantesModal();
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
                            width: 1.5,
                            height: 32,
                            displayValue: false, // No mostrar texto debajo (lo mostramos aparte)
                            margin: 4,
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

        const tieneControlGeneral = this.currentProducto.stockMinimo != null || this.currentProducto.stockMaximo != null;
        const nuevoId = 'new_' + Date.now();

        const card = document.createElement('div');
        card.className = 'variante-card variante-card-nueva';
        card.dataset.varianteId = nuevoId;
        card.innerHTML = `
            <div class="variante-num variante-num-nueva" title="Nueva variante"><i class="fas fa-plus"></i></div>
            <div class="variante-card-body">
                <div class="variante-field">
                    <label>Talla *
                        <button type="button" class="btn-add-mini" onclick="inventarioManager.quickAddCatalogoVariante('tallas', this)" title="Crear nueva talla">
                            <i class="fas fa-plus"></i>
                        </button>
                    </label>
                    <select class="variante-talla" required>
                        <option value="">Seleccionar...</option>
                        ${this.tallas.filter(t => t.activo).map(t =>
                            `<option value="${t.id}">${this.escapeHtml(t.nombre)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="variante-field">
                    <label>Color *
                        <button type="button" class="btn-add-mini" onclick="inventarioManager.quickAddCatalogoVariante('colores', this)" title="Crear nuevo color">
                            <i class="fas fa-plus"></i>
                        </button>
                    </label>
                    <select class="variante-color" required>
                        <option value="">Seleccionar...</option>
                        ${this.colores.filter(c => c.activo).map(c =>
                            `<option value="${c.id}">${this.escapeHtml(c.nombre)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="variante-field variante-field-num">
                    <label>Stock *</label>
                    <input type="number" class="variante-stock" min="0" value="0" required>
                </div>
                ${!tieneControlGeneral ? `
                <div class="variante-field variante-field-num">
                    <label>Mínimo</label>
                    <input type="number" class="variante-stock-min" min="0" value="5">
                </div>
                <div class="variante-field variante-field-num">
                    <label>Máximo</label>
                    <input type="number" class="variante-stock-max" min="0" value="100">
                </div>
                ` : ''}
                <div class="variante-field">
                    <label>Ubicación</label>
                    <input type="text" class="variante-ubicacion" placeholder="Ej: Almacén A, Estante 3" maxlength="100">
                </div>
            </div>
            <div class="variante-card-actions">
                <button class="btn-save btn-save-text" onclick="inventarioManager.guardarVarianteCard('${nuevoId}')" title="Guardar variante">
                    <i class="fas fa-save"></i> Guardar
                </button>
                <button class="btn-cancel-edit" onclick="inventarioManager.eliminarVarianteCard('${nuevoId}')" title="Descartar">
                    <i class="fas fa-times"></i>
                </button>
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

            const ubicacionInput = card.querySelector('.variante-ubicacion');
            const varianteData = {
                producto: { id: parseInt(this.currentProducto.id) },
                talla: { id: tallaId },
                color: { id: colorId },
                stockActual: stock,
                activo: true,
                codigoBarras: codigoBarras,  // Código de barras generado automáticamente
                ubicacion: ubicacionInput ? (ubicacionInput.value.trim() || null) : null
            };

            if (this.currentProducto.stockMinimo == null && this.currentProducto.stockMaximo == null) {
                const stockMin = card.querySelector('.variante-stock-min');
                const stockMax = card.querySelector('.variante-stock-max');
                if (stockMin) varianteData.stockMinimo = this.parseStockValue(stockMin.value);
                if (stockMax) varianteData.stockMaximo = this.parseStockValue(stockMax.value);
            }

            if (varianteData.stockMinimo != null && varianteData.stockMaximo != null &&
                varianteData.stockMinimo > varianteData.stockMaximo) {
                this.showToast('warning', 'Atención', 'El stock mínimo no puede ser mayor al máximo');
                return;
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
        const confirmado = await this.showConfirm({
            title: 'Eliminar variante',
            message: 'Esta acción no se puede deshacer. El stock de la variante saldrá del inventario.',
            type: 'danger',
            confirmText: 'Sí, eliminar'
        });
        if (!confirmado) return;

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

            const ubicacionInput = card.querySelector('.variante-ubicacion-edit');
            const ubicacion = ubicacionInput ? (ubicacionInput.value.trim() || null) : (variante.ubicacion || null);

            const varianteData = {
                producto: { id: parseInt(this.currentProducto.id) },
                talla: { id: tallaId },
                color: { id: colorId },
                stockActual: stockActual,
                activo: variante.activo !== undefined ? variante.activo : true,
                sku: variante.sku || null,
                codigoBarras: codigoBarras || null,
                ubicacion: ubicacion
            };

            const tieneControlGeneral = this.currentProducto.stockMinimo != null || this.currentProducto.stockMaximo != null;
            if (!tieneControlGeneral) {
                const stockMinInput = card.querySelector('.variante-stock-min-edit');
                const stockMaxInput = card.querySelector('.variante-stock-max-edit');
                if (stockMinInput) varianteData.stockMinimo = this.parseStockValue(stockMinInput.value);
                if (stockMaxInput) varianteData.stockMaximo = this.parseStockValue(stockMaxInput.value);
            } else {
                // Si el producto tiene control general, las variantes no deben tener stock min/max
                varianteData.stockMinimo = null;
                varianteData.stockMaximo = null;
            }

            if (varianteData.stockMinimo != null && varianteData.stockMaximo != null &&
                varianteData.stockMinimo > varianteData.stockMaximo) {
                this.showToast('warning', 'Atención', 'El stock mínimo no puede ser mayor al máximo');
                return;
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

        // Solo se imprimen códigos EAN-13 válidos (evita inyectar texto arbitrario)
        if (!/^\d{13}$/.test(codigoBarras)) {
            this.showToast('error', 'Error', 'El código de barras no es válido para imprimir');
            return;
        }

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
                    <div class="producto-nombre">${this.escapeHtml(variante.productoNombre) || 'Producto'}</div>
                    <div class="variante-info">
                        ${this.escapeHtml(variante.colorNombre)} / ${this.escapeHtml(variante.tallaNombre)}<br>
                        SKU: ${this.escapeHtml(variante.sku) || 'N/A'}
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

        // Calcular margen de ganancia
        const precioCompraNum = parseFloat(producto.precioCompra) || 0;
        const margenGanancia = precioCompraNum > 0
            ? ((producto.precioVenta - precioCompraNum) / precioCompraNum * 100).toFixed(2)
            : '0.00';
        const gananciaTotal = (producto.precioVenta - precioCompraNum).toFixed(2);
        
        // Determinar estado del stock (control general o por variante)
        let estadoStock = { texto: 'Normal', clase: 'success', icono: 'check-circle' };
        const estadoStockProducto = this.getEstadoStock(producto);
        if (estadoStockProducto === 'sin_stock') {
            estadoStock = { texto: 'Sin Stock', clase: 'danger', icono: 'times-circle' };
        } else if (estadoStockProducto === 'stock_bajo') {
            estadoStock = { texto: 'Stock Bajo', clase: 'warning', icono: 'exclamation-triangle' };
        } else if (estadoStockProducto === 'sin_variantes') {
            estadoStock = { texto: 'Sin variantes', clase: 'secondary', icono: 'layer-group' };
        }

        body.innerHTML = `
            <div class="detalles-container">
                <!-- Header con imagen, título y badges -->
                <div class="detalles-header">
                    <div class="detalles-imagen">
                        ${producto.imagenUrl ?
                            `<img src="${this.escapeHtml(producto.imagenUrl)}" alt="${this.escapeHtml(producto.nombre)}" class="producto-imagen-detalle">` :
                            `<div class="producto-sin-imagen"><i class="fas fa-box-open"></i></div>`
                        }
                    </div>
                    <div class="detalles-titulo">
                        <h2>${this.escapeHtml(producto.nombre)}</h2>
                        <div class="detalles-badges">
                            <span class="badge badge-secondary"><i class="fas fa-barcode"></i> ${this.escapeHtml(producto.codigo)}</span>
                            <span class="badge badge-${estadoStock.clase}">
                                <i class="fas fa-${estadoStock.icono}"></i> ${estadoStock.texto}
                            </span>
                            <span class="badge ${producto.activo ? 'badge-success' : 'badge-secondary'}">
                                <i class="fas fa-${producto.activo ? 'check' : 'ban'}"></i>
                                ${producto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        ${producto.descripcion ? `<p class="detalles-descripcion">${this.escapeHtml(producto.descripcion)}</p>` : ''}
                    </div>
                </div>

                <!-- Cifras clave -->
                <div class="detalles-stats">
                    <div class="detalle-stat">
                        <div class="detalle-stat-icon stat-stock"><i class="fas fa-boxes"></i></div>
                        <div class="detalle-stat-info">
                            <span class="detalle-stat-valor">${producto.stockTotal || 0}</span>
                            <span class="detalle-stat-label">Stock total</span>
                        </div>
                    </div>
                    <div class="detalle-stat">
                        <div class="detalle-stat-icon stat-venta"><i class="fas fa-cash-register"></i></div>
                        <div class="detalle-stat-info">
                            <span class="detalle-stat-valor">S/ ${parseFloat(producto.precioVenta).toFixed(2)}</span>
                            <span class="detalle-stat-label">Precio de venta</span>
                        </div>
                    </div>
                    <div class="detalle-stat">
                        <div class="detalle-stat-icon stat-margen"><i class="fas fa-chart-line"></i></div>
                        <div class="detalle-stat-info">
                            <span class="detalle-stat-valor">${margenGanancia}%</span>
                            <span class="detalle-stat-label">Margen · +S/ ${gananciaTotal}</span>
                        </div>
                    </div>
                </div>

                <!-- Grid de información -->
                <div class="detalles-grid">
                    <div class="detalle-card">
                        <div class="detalle-card-header">
                            <i class="fas fa-tags"></i>
                            <h3>Información general</h3>
                        </div>
                        <div class="detalle-card-body">
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-folder"></i> Categoría</span>
                                <span class="detalle-value">${this.escapeHtml(producto.categoriaNombre) || '-'}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-trademark"></i> Marca</span>
                                <span class="detalle-value">${this.escapeHtml(producto.marcaNombre) || '-'}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-truck"></i> Proveedor</span>
                                <span class="detalle-value">${this.escapeHtml(producto.proveedorNombre) || '-'}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-layer-group"></i> Variantes</span>
                                <span class="detalle-value">${producto.cantidadVariantes || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detalle-card">
                        <div class="detalle-card-header">
                            <i class="fas fa-dollar-sign"></i>
                            <h3>Precios</h3>
                        </div>
                        <div class="detalle-card-body">
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-shopping-cart"></i> Precio de inversión</span>
                                <span class="detalle-value precio-compra">S/ ${parseFloat(producto.precioCompra).toFixed(2)}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-cash-register"></i> Precio de venta</span>
                                <span class="detalle-value precio-venta">S/ ${parseFloat(producto.precioVenta).toFixed(2)}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-coins"></i> Ganancia por unidad</span>
                                <span class="detalle-value precio-venta">+S/ ${gananciaTotal}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detalle-card">
                        <div class="detalle-card-header">
                            <i class="fas fa-boxes"></i>
                            <h3>Control de inventario</h3>
                        </div>
                        <div class="detalle-card-body">
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-cubes"></i> Stock total</span>
                                <span class="detalle-value">${producto.stockTotal || 0} unidades</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-arrow-down"></i> Stock mínimo</span>
                                <span class="detalle-value">${producto.stockMinimo != null ? producto.stockMinimo : '-'}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-arrow-up"></i> Stock máximo</span>
                                <span class="detalle-value">${producto.stockMaximo != null ? producto.stockMaximo : '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detalle-card">
                        <div class="detalle-card-header">
                            <i class="fas fa-calendar-alt"></i>
                            <h3>Registro</h3>
                        </div>
                        <div class="detalle-card-body">
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-plus-circle"></i> Creado</span>
                                <span class="detalle-value">${this.formatFecha(producto.fechaCreacion)}</span>
                            </div>
                            ${producto.fechaActualizacion ? `
                                <div class="detalle-item">
                                    <span class="detalle-label"><i class="fas fa-edit"></i> Actualizado</span>
                                    <span class="detalle-value">${this.formatFecha(producto.fechaActualizacion)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Acciones rápidas -->
                <div class="detalles-acciones">
                    <button class="btn-accion btn-variantes" onclick="closeModal('modalDetalles'); inventarioManager.gestionarVariantes(${producto.id})">
                        <i class="fas fa-layer-group"></i> Gestionar Variantes
                    </button>
                    <button class="btn-accion btn-editar" onclick="closeModal('modalDetalles'); inventarioManager.editProducto(${producto.id})">
                        <i class="fas fa-edit"></i> Editar Producto
                    </button>
                </div>
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
     * Exportar inventario a Excel (dos hojas: Productos + Variantes)
     * Usa SheetJS (xlsx) cargado desde CDN
     */
    async exportToExcel() {
        if (typeof XLSX === 'undefined') {
            this.showToast('error', 'Error', 'Librería de Excel no disponible. Verifica tu conexión.');
            return;
        }

        if (this.productos.length === 0) {
            this.showToast('warning', 'Sin datos', 'No hay productos para exportar con los filtros actuales.');
            return;
        }

        this.showToast('info', 'Exportando', 'Generando archivo Excel...');

        try {
            const wb = XLSX.utils.book_new();

            // ── HOJA 1: PRODUCTOS ────────────────────────────────
            const productosData = this.productos.map(p => ({
                'Código':            p.codigo,
                'Nombre':            p.nombre,
                'Descripción':       p.descripcion || '',
                'Categoría':         p.categoriaNombre || '',
                'Marca':             p.marcaNombre || '',
                'Proveedor':         p.proveedorNombre || '',
                'Género':            p.genero || '',
                'Temporada':         p.temporada || '',
                'Precio Compra (S/)': parseFloat(p.precioCompra || 0),
                'Precio Venta (S/)':  parseFloat(p.precioVenta  || 0),
                'Ganancia (%)':       parseFloat(p.porcentajeGanancia || 0),
                'Stock Total':        p.stockTotal || 0,
                'Nº Variantes':       p.cantidadVariantes || 0,
                'Estado':             p.activo ? 'Activo' : 'Inactivo'
            }));

            const wsProductos = XLSX.utils.json_to_sheet(productosData);

            // Ancho de columnas
            wsProductos['!cols'] = [
                { wch: 16 }, { wch: 32 }, { wch: 40 }, { wch: 16 },
                { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 12 },
                { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 12 },
                { wch: 12 }, { wch: 10 }
            ];

            XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');

            // ── HOJA 2: VARIANTES ────────────────────────────────
            // Cargamos variantes de todos los productos en paralelo
            const variantesPromesas = this.productos.map(p =>
                fetch(`/api/productos/${p.id}/variantes`)
                    .then(r => r.ok ? r.json() : [])
                    .then(variantes => variantes.map(v => ({
                        'Código Producto': p.codigo,
                        'Producto':        p.nombre,
                        'SKU':             v.sku || '',
                        'Código Barras':   v.codigoBarras || '',
                        'Color':           v.colorNombre || '',
                        'Talla':           v.tallaNombre || '',
                        'Ubicación':       v.ubicacion || '',
                        'Stock Actual':    v.stockActual || 0,
                        'Stock Mínimo':    v.stockMinimo ?? '',
                        'Stock Máximo':    v.stockMaximo ?? '',
                        'Estado':          v.activo ? 'Activo' : 'Inactivo'
                    })))
            );

            const variantesAnidadas = await Promise.all(variantesPromesas);
            const variantesData = variantesAnidadas.flat();

            if (variantesData.length > 0) {
                const wsVariantes = XLSX.utils.json_to_sheet(variantesData);
                wsVariantes['!cols'] = [
                    { wch: 16 }, { wch: 32 }, { wch: 28 }, { wch: 16 },
                    { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 13 },
                    { wch: 13 }, { wch: 13 }, { wch: 10 }
                ];
                XLSX.utils.book_append_sheet(wb, wsVariantes, 'Variantes');
            }

            // ── GENERAR DESCARGA ─────────────────────────────────
            const fecha = new Date().toLocaleDateString('es-PE', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).replace(/\//g, '-');

            XLSX.writeFile(wb, `inventario_GAMS_${fecha}.xlsx`);

            this.showToast('success', '✓ Exportado',
                `${this.productos.length} productos exportados correctamente`);

        } catch (error) {
            console.error('❌ Error exportando:', error);
            this.showToast('error', 'Error', 'No se pudo generar el archivo Excel');
        }
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

    // ============================================
    // GESTIÓN DE CATÁLOGOS (categorías, marcas, tallas, colores)
    // ============================================

    get catalogosConfig() {
        return {
            categorias:  { api: '/api/catalogo/categorias', singular: 'categoría', articulo: 'la', icono: 'fa-folder' },
            marcas:      { api: '/api/catalogo/marcas',     singular: 'marca',     articulo: 'la', icono: 'fa-trademark' },
            tallas:      { api: '/api/catalogo/tallas',     singular: 'talla',     articulo: 'la', icono: 'fa-ruler' },
            colores:     { api: '/api/catalogo/colores',    singular: 'color',     articulo: 'el', icono: 'fa-palette' },
            proveedores: { api: '/api/proveedores',         singular: 'proveedor', articulo: 'el', icono: 'fa-truck' }
        };
    }

    async openCatalogosModal() {
        await this.switchCatalogoTab(this.catalogoActual || 'categorias');
        openModal('modalCatalogos');
    }

    async switchCatalogoTab(tipo) {
        this.catalogoActual = tipo;
        document.querySelectorAll('#modalCatalogos .tab-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.catalogo === tipo));
        this.renderCatalogoForm();
        await this.loadCatalogoItems();
    }

    /**
     * Cargar TODOS los items del catálogo activo (incluye inactivos)
     */
    async loadCatalogoItems() {
        const cfg = this.catalogosConfig[this.catalogoActual];
        try {
            const response = await fetch(cfg.api);
            if (!response.ok) throw new Error('Error al cargar');
            this.catalogoItems = await response.json();

            // Tallas: ordenar por su campo "orden" (sin orden van al final)
            if (this.catalogoActual === 'tallas') {
                this.catalogoItems.sort((a, b) => {
                    if (a.orden == null && b.orden == null) return a.nombre.localeCompare(b.nombre);
                    if (a.orden == null) return 1;
                    if (b.orden == null) return -1;
                    return a.orden - b.orden;
                });
            }
        } catch (error) {
            console.error('❌ Error cargando catálogo:', error);
            this.catalogoItems = [];
        }
        this.renderCatalogoList();
    }

    /**
     * Formulario de creación según el tab activo
     */
    renderCatalogoForm() {
        const form = document.getElementById('catalogoForm');
        if (!form) return;
        const tipo = this.catalogoActual;

        let campos = '';
        if (tipo === 'categorias' || tipo === 'marcas') {
            campos = `
                <input type="text" id="catNuevoNombre" placeholder="Nombre *" maxlength="100">
                <input type="text" id="catNuevaDescripcion" placeholder="Descripción (opcional)" maxlength="200">
            `;
        } else if (tipo === 'tallas') {
            campos = `
                <input type="text" id="catNuevoNombre" placeholder="Nombre * (Ej: XL, 42)" maxlength="20">
                <select id="catNuevoTipo" title="Tipo de talla">
                    <option value="ROPA">Ropa</option>
                    <option value="CALZADO">Calzado</option>
                    <option value="UNICA">Única</option>
                </select>
                <input type="number" id="catNuevoOrden" placeholder="Orden (auto)" min="0" title="Posición en la lista. Vacío = al final. Si el número ya está ocupado, las demás tallas se desplazan">
            `;
        } else if (tipo === 'colores') {
            campos = `
                <input type="text" id="catNuevoNombre" placeholder="Nombre * (Ej: Rojo)" maxlength="50">
                <input type="color" id="catNuevoHex" value="#10b981" title="Color de referencia">
            `;
        } else {
            campos = `
                <input type="text" id="catNuevoNombre" placeholder="Nombre o razón social *" maxlength="200">
                <input type="text" id="catNuevoRuc" placeholder="RUC" maxlength="11">
                <input type="text" id="catNuevoTelefono" placeholder="Teléfono" maxlength="20">
                <input type="text" id="catNuevoEmail" placeholder="Email" maxlength="100">
                <input type="text" id="catNuevaDireccion" placeholder="Dirección" maxlength="200">
                <input type="text" id="catNuevoContacto" placeholder="Persona de contacto" maxlength="100">
            `;
        }

        form.innerHTML = `
            ${campos}
            <button type="button" class="btn-primary" onclick="inventarioManager.crearCatalogoItem()">
                <i class="fas fa-plus"></i> Agregar
            </button>
        `;

        const nombreInput = document.getElementById('catNuevoNombre');
        if (nombreInput) {
            nombreInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); this.crearCatalogoItem(); }
            });
        }
    }

    async crearCatalogoItem() {
        const tipo = this.catalogoActual;
        const cfg = this.catalogosConfig[tipo];
        const nombre = document.getElementById('catNuevoNombre').value.trim();

        if (!nombre) {
            this.showToast('warning', 'Atención', 'El nombre es obligatorio');
            return;
        }

        const data = { nombre, activo: true };
        if (tipo === 'categorias' || tipo === 'marcas') {
            const desc = document.getElementById('catNuevaDescripcion').value.trim();
            if (desc) data.descripcion = desc;
        } else if (tipo === 'tallas') {
            data.tipo = document.getElementById('catNuevoTipo').value;
            const orden = document.getElementById('catNuevoOrden').value;
            data.orden = orden === '' ? null : parseInt(orden, 10);
        } else if (tipo === 'colores') {
            data.codigoHex = document.getElementById('catNuevoHex').value;
        } else {
            data.ruc = document.getElementById('catNuevoRuc').value.trim() || null;
            data.telefono = document.getElementById('catNuevoTelefono').value.trim() || null;
            data.email = document.getElementById('catNuevoEmail').value.trim() || null;
            data.direccion = document.getElementById('catNuevaDireccion').value.trim() || null;
            data.contactoNombre = document.getElementById('catNuevoContacto').value.trim() || null;
        }

        try {
            const response = await fetch(cfg.api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(await response.text());

            this.showToast('success', 'Creado', `Se creó ${cfg.articulo} ${cfg.singular} "${nombre}"`);
            this.renderCatalogoForm(); // limpiar el formulario
            await this.loadCatalogoItems();
            await this.refreshCatalogoData(tipo);
        } catch (error) {
            console.error('❌ Error creando item de catálogo:', error);
            this.showToast('error', 'Error', error.message || `No se pudo crear ${cfg.articulo} ${cfg.singular}`);
        }
    }

    renderCatalogoList() {
        const container = document.getElementById('catalogoListContainer');
        if (!container) return;
        const tipo = this.catalogoActual;

        if (!this.catalogoItems || this.catalogoItems.length === 0) {
            container.innerHTML = `<div class="catalogo-empty"><i class="fas fa-inbox"></i> No hay elementos registrados</div>`;
            return;
        }

        container.innerHTML = this.catalogoItems.map(item => {
            if (item.editMode) return this.renderCatalogoItemEdit(item);

            let extra = '';
            let swatch = '';
            if (tipo === 'categorias' || tipo === 'marcas') {
                extra = item.descripcion ? this.escapeHtml(item.descripcion) : '';
            } else if (tipo === 'tallas') {
                extra = `${item.tipo || 'ROPA'}${item.orden != null ? ' · orden ' + item.orden : ''}`;
            } else if (tipo === 'colores') {
                extra = item.codigoHex ? item.codigoHex.toUpperCase() : '';
                swatch = `<span class="catalogo-color-swatch" style="background: ${this.escapeHtml(item.codigoHex) || '#e5e7eb'}"></span>`;
            } else {
                extra = [
                    item.ruc ? `RUC ${this.escapeHtml(item.ruc)}` : '',
                    item.telefono ? this.escapeHtml(item.telefono) : '',
                    item.email ? this.escapeHtml(item.email) : '',
                    item.contactoNombre ? `<i class="fas fa-user" style="font-size: 0.65rem;"></i> ${this.escapeHtml(item.contactoNombre)}` : ''
                ].filter(Boolean).join(' · ');
            }

            return `
                <div class="catalogo-item ${!item.activo ? 'catalogo-item-inactivo' : ''}" data-item-id="${item.id}">
                    <div class="catalogo-item-info">
                        ${swatch}
                        <span class="catalogo-item-nombre">${this.escapeHtml(item.nombre)}</span>
                        ${extra ? `<span class="catalogo-item-extra">${extra}</span>` : ''}
                    </div>
                    <div class="catalogo-item-actions">
                        <label class="toggle-switch" title="${item.activo ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}">
                            <input type="checkbox" class="toggle-input" ${item.activo ? 'checked' : ''}
                                   onchange="inventarioManager.toggleActivoCatalogo(${item.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button type="button" class="btn-icon-sm" onclick="inventarioManager.editarCatalogoItem(${item.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon-sm btn-icon-danger" onclick="inventarioManager.eliminarCatalogoItem(${item.id})" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCatalogoItemEdit(item) {
        const tipo = this.catalogoActual;
        let campos = `<input type="text" class="cat-edit-nombre" value="${this.escapeHtml(item.nombre)}" maxlength="100">`;

        if (tipo === 'categorias' || tipo === 'marcas') {
            campos += `<input type="text" class="cat-edit-descripcion" value="${this.escapeHtml(item.descripcion)}" placeholder="Descripción" maxlength="200">`;
        } else if (tipo === 'tallas') {
            campos += `
                <select class="cat-edit-tipo">
                    ${['ROPA', 'CALZADO', 'UNICA'].map(t =>
                        `<option value="${t}" ${item.tipo === t ? 'selected' : ''}>${t.charAt(0) + t.slice(1).toLowerCase()}</option>`
                    ).join('')}
                </select>
                <input type="number" class="cat-edit-orden" value="${item.orden != null ? item.orden : ''}" placeholder="Orden" min="0">
            `;
        } else if (tipo === 'colores') {
            campos += `<input type="color" class="cat-edit-hex" value="${this.escapeHtml(item.codigoHex) || '#e5e7eb'}">`;
        } else {
            campos += `
                <input type="text" class="cat-edit-ruc" value="${this.escapeHtml(item.ruc)}" placeholder="RUC" maxlength="11">
                <input type="text" class="cat-edit-telefono" value="${this.escapeHtml(item.telefono)}" placeholder="Teléfono" maxlength="20">
                <input type="text" class="cat-edit-email" value="${this.escapeHtml(item.email)}" placeholder="Email" maxlength="100">
                <input type="text" class="cat-edit-direccion" value="${this.escapeHtml(item.direccion)}" placeholder="Dirección" maxlength="200">
                <input type="text" class="cat-edit-contacto" value="${this.escapeHtml(item.contactoNombre)}" placeholder="Persona de contacto" maxlength="100">
            `;
        }

        return `
            <div class="catalogo-item" data-item-id="${item.id}">
                <div class="catalogo-item-edit">${campos}</div>
                <div class="catalogo-item-actions">
                    <button type="button" class="btn-icon-sm btn-icon-success" onclick="inventarioManager.guardarCatalogoItem(${item.id})" title="Guardar">
                        <i class="fas fa-save"></i>
                    </button>
                    <button type="button" class="btn-icon-sm" onclick="inventarioManager.cancelarEdicionCatalogo(${item.id})" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    editarCatalogoItem(id) {
        const item = this.catalogoItems.find(i => i.id === id);
        if (!item) return;
        item.editMode = true;
        this.renderCatalogoList();
    }

    cancelarEdicionCatalogo(id) {
        const item = this.catalogoItems.find(i => i.id === id);
        if (item) delete item.editMode;
        this.renderCatalogoList();
    }

    async guardarCatalogoItem(id) {
        const tipo = this.catalogoActual;
        const cfg = this.catalogosConfig[tipo];
        const item = this.catalogoItems.find(i => i.id === id);
        const row = document.querySelector(`#catalogoListContainer .catalogo-item[data-item-id="${id}"]`);
        if (!item || !row) return;

        const nombre = row.querySelector('.cat-edit-nombre').value.trim();
        if (!nombre) {
            this.showToast('warning', 'Atención', 'El nombre es obligatorio');
            return;
        }

        const data = { nombre, activo: item.activo };
        if (item.fechaCreacion) data.fechaCreacion = item.fechaCreacion;

        if (tipo === 'categorias' || tipo === 'marcas') {
            data.descripcion = row.querySelector('.cat-edit-descripcion').value.trim() || null;
        } else if (tipo === 'tallas') {
            data.tipo = row.querySelector('.cat-edit-tipo').value;
            const orden = row.querySelector('.cat-edit-orden').value;
            data.orden = orden === '' ? null : parseInt(orden, 10);
        } else if (tipo === 'colores') {
            data.codigoHex = row.querySelector('.cat-edit-hex').value;
        } else {
            data.ruc = row.querySelector('.cat-edit-ruc').value.trim() || null;
            data.telefono = row.querySelector('.cat-edit-telefono').value.trim() || null;
            data.email = row.querySelector('.cat-edit-email').value.trim() || null;
            data.direccion = row.querySelector('.cat-edit-direccion').value.trim() || null;
            data.contactoNombre = row.querySelector('.cat-edit-contacto').value.trim() || null;
        }

        try {
            const response = await fetch(`${cfg.api}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(await response.text());

            this.showToast('success', 'Actualizado', `${cfg.singular.charAt(0).toUpperCase() + cfg.singular.slice(1)} actualizada correctamente`);
            await this.loadCatalogoItems();
            await this.refreshCatalogoData(tipo);
        } catch (error) {
            console.error('❌ Error actualizando catálogo:', error);
            this.showToast('error', 'Error', error.message || 'No se pudo actualizar');
        }
    }

    async toggleActivoCatalogo(id, nuevoEstado) {
        const tipo = this.catalogoActual;
        const cfg = this.catalogosConfig[tipo];
        const item = this.catalogoItems.find(i => i.id === id);
        if (!item) return;

        const data = { ...item, activo: nuevoEstado };
        delete data.editMode;

        try {
            const response = await fetch(`${cfg.api}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(await response.text());

            item.activo = nuevoEstado;
            this.renderCatalogoList();
            await this.refreshCatalogoData(tipo);
            this.showToast('success', 'Estado actualizado',
                `"${item.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            this.renderCatalogoList(); // restaurar toggle
            this.showToast('error', 'Error', 'No se pudo cambiar el estado');
        }
    }

    async eliminarCatalogoItem(id) {
        const tipo = this.catalogoActual;
        const cfg = this.catalogosConfig[tipo];
        const item = this.catalogoItems.find(i => i.id === id);
        if (!item) return;

        const confirmado = await this.showConfirm({
            title: `Eliminar ${cfg.singular}`,
            message: `Se eliminará "${item.nombre}" permanentemente. Si está en uso, el sistema lo impedirá.`,
            type: 'danger',
            confirmText: 'Sí, eliminar'
        });
        if (!confirmado) return;

        try {
            const response = await fetch(`${cfg.api}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await response.text());

            this.showToast('success', 'Eliminado', `"${item.nombre}" fue eliminado`);
            await this.loadCatalogoItems();
            await this.refreshCatalogoData(tipo);
        } catch (error) {
            console.error('❌ Error eliminando:', error);
            this.showToast('error', 'No se pudo eliminar', error.message || 'Error al eliminar');
        }
    }

    /**
     * Recargar la lista activa de un catálogo y refrescar los selects que
     * dependen de él (formulario de producto y filtros), preservando la selección
     */
    async refreshCatalogoData(tipo, autoSelect = null) {
        const cfg = this.catalogosConfig[tipo];
        try {
            const response = await fetch(`${cfg.api}?activo=true`);
            if (!response.ok) return;
            const items = await response.json();

            if (tipo === 'categorias') {
                this.categorias = items;
                this.repopulateSelectPreservando('productoCategoria', items);
                this.repopulateSelectPreservando('filterCategoria', items);
            } else if (tipo === 'marcas') {
                this.marcas = items;
                this.repopulateSelectPreservando('productoMarca', items);
                this.repopulateSelectPreservando('filterMarca', items);
            } else if (tipo === 'tallas') {
                this.tallas = items;
            } else if (tipo === 'colores') {
                this.colores = items;
            } else {
                this.proveedores = items;
                this.repopulateSelectPreservando('productoProveedor', items);
            }

            if (autoSelect && autoSelect.selectId) {
                const sel = document.getElementById(autoSelect.selectId);
                if (sel) {
                    sel.value = autoSelect.newId;
                    sel.dispatchEvent(new Event('change'));
                }
            }
        } catch (error) {
            console.error('❌ Error refrescando catálogo:', error);
        }
    }

    repopulateSelectPreservando(selectId, items) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const valorActual = select.value;
        this.populateSelect(selectId, items, 'nombre', 'id');
        if (valorActual) select.value = valorActual;
    }

    /**
     * Creación rápida desde un formulario: pide el nombre con un prompt,
     * crea el item y lo deja seleccionado en el select indicado
     */
    async quickAddCatalogo(tipo, selectId = null) {
        const cfg = this.catalogosConfig[tipo];
        const nombre = await this.showPrompt({
            title: `Nueva ${cfg.singular}`,
            subtitle: selectId ? 'Se creará y quedará seleccionada automáticamente.' : '',
            placeholder: `Nombre de ${cfg.articulo} ${cfg.singular}...`
        });
        if (!nombre) return null;

        try {
            const response = await fetch(cfg.api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, activo: true })
            });
            if (!response.ok) throw new Error(await response.text());

            const creado = await response.json();
            this.showToast('success', 'Creado', `Se creó ${cfg.articulo} ${cfg.singular} "${nombre}"`);
            await this.refreshCatalogoData(tipo, selectId ? { selectId, newId: creado.id } : null);
            return creado;
        } catch (error) {
            console.error('❌ Error en creación rápida:', error);
            this.showToast('error', 'Error', error.message || `No se pudo crear ${cfg.articulo} ${cfg.singular}`);
            return null;
        }
    }

    /**
     * Creación rápida de talla/color desde una tarjeta de NUEVA variante:
     * crea el item, refresca el select de esa tarjeta y lo selecciona
     */
    async quickAddCatalogoVariante(tipo, btn) {
        const card = btn.closest('.variante-card');
        const creado = await this.quickAddCatalogo(tipo, null);
        if (!creado || !card) return;

        const select = card.querySelector(tipo === 'tallas' ? '.variante-talla' : '.variante-color');
        if (!select) return;

        const lista = tipo === 'tallas' ? this.tallas : this.colores;
        select.innerHTML = '<option value="">Seleccionar...</option>' +
            lista.filter(i => i.activo).map(i =>
                `<option value="${i.id}">${this.escapeHtml(i.nombre)}</option>`
            ).join('');
        select.value = creado.id;
    }

    /**
     * Creación rápida de talla/color al EDITAR una variante existente:
     * crea el item, refresca el select de esa tarjeta, lo selecciona
     * y actualiza el preview del SKU
     */
    async quickAddCatalogoVarianteEdit(tipo, btn, varianteId) {
        const card = btn.closest('.variante-card');
        const creado = await this.quickAddCatalogo(tipo, null);
        if (!creado || !card) return;

        const select = card.querySelector(tipo === 'tallas' ? '.variante-talla-edit' : '.variante-color-edit');
        if (!select) return;

        const lista = tipo === 'tallas' ? this.tallas : this.colores;
        select.innerHTML = lista.filter(i => i.activo).map(i =>
            `<option value="${i.id}">${this.escapeHtml(i.nombre)}</option>`
        ).join('');
        select.value = creado.id;

        // El SKU depende de talla y color: reflejar el cambio al instante
        this.actualizarSkuPreview(varianteId);
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
                <h4 class="toast-title">${this.escapeHtml(title)}</h4>
                <p class="toast-message">${this.escapeHtml(message)}</p>
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