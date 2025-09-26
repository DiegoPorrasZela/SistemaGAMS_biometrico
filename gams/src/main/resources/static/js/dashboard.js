/**
 * GAMS S.A.C - Dashboard JavaScript
 * Funcionalidades completas del dashboard principal
 */

class GAMSDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.sidebarCollapsed = false;
        this.isMobile = window.innerWidth <= 1024;
        
        this.initializeEventListeners();
        this.initializeCharts();
        this.startClock();
        this.loadUserData();
        this.checkResponsive();
    }

    /**
     * Inicializa todos los event listeners
     */
    initializeEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        sidebarToggle?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        mobileMenuToggle?.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });

        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Notifications
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationsModal = document.getElementById('notificationsModal');
        const closeNotifications = document.getElementById('closeNotifications');

        notificationBtn?.addEventListener('click', () => {
            this.showNotifications();
        });

        closeNotifications?.addEventListener('click', () => {
            this.hideNotifications();
        });

        // Close modal on outside click
        notificationsModal?.addEventListener('click', (e) => {
            if (e.target === notificationsModal) {
                this.hideNotifications();
            }
        });

        // Search functionality
        const globalSearch = document.getElementById('globalSearch');
        globalSearch?.addEventListener('input', (e) => {
            this.handleGlobalSearch(e.target.value);
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.checkResponsive();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Chart period selector
        const chartPeriod = document.querySelector('.chart-period');
        chartPeriod?.addEventListener('change', (e) => {
            this.updateChart(e.target.value);
        });

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (this.isMobile) {
                const sidebar = document.getElementById('sidebar');
                const isClickInsideSidebar = sidebar?.contains(e.target);
                const isMenuToggle = e.target.closest('#mobileMenuToggle');
                
                if (!isClickInsideSidebar && !isMenuToggle && sidebar?.classList.contains('active')) {
                    this.closeMobileSidebar();
                }
            }
        });
    }

    /**
     * Toggle del sidebar principal
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('collapsed');
        this.sidebarCollapsed = sidebar?.classList.contains('collapsed');
        
        // Guardar preferencia
        localStorage.setItem('gams_sidebar_collapsed', this.sidebarCollapsed);
    }

    /**
     * Toggle del sidebar móvil
     */
    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('active');
    }

    /**
     * Cerrar sidebar móvil
     */
    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.remove('active');
    }

    /**
     * Navegación entre secciones
     */
    navigateToSection(sectionName) {
        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remover clase active de todos los nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            link.parentElement.classList.remove('active');
        });

        // Mostrar sección seleccionada
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
            
            // Actualizar título de página
            this.updatePageTitle(sectionName);
            
            // Marcar nav link como activo
            const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                activeLink.parentElement.classList.add('active');
            }
            
            // Cerrar sidebar móvil después de navegación
            if (this.isMobile) {
                this.closeMobileSidebar();
            }
            
            // Trigger eventos específicos de sección
            this.handleSectionChange(sectionName);
        }
    }

    /**
     * Actualiza el título de la página
     */
    updatePageTitle(sectionName) {
        const titles = {
            dashboard: 'Dashboard Principal',
            inventario: 'Gestión de Inventario',
            ventas: 'Punto de Venta',
            personal: 'Gestión de Personal',
            reportes: 'Reportes y Analytics'
        };

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[sectionName] || 'Dashboard';
        }
    }

    /**
     * Maneja cambios de sección específicos
     */
    handleSectionChange(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.refreshDashboardData();
                break;
            case 'inventario':
                this.loadInventoryData();
                break;
            case 'ventas':
                this.initializePOS();
                break;
            case 'personal':
                this.loadPersonalData();
                break;
            case 'reportes':
                this.loadReportsData();
                break;
        }
    }

    /**
     * Muestra modal de notificaciones
     */
    showNotifications() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.classList.add('active');
            this.loadAllNotifications();
        }
    }

    /**
     * Oculta modal de notificaciones
     */
    hideNotifications() {
        const modal = document.getElementById('notificationsModal');
        modal?.classList.remove('active');
    }

    /**
     * Carga todas las notificaciones
     */
    loadAllNotifications() {
        const notificationList = document.querySelector('.notification-list');
        if (notificationList) {
            // Simular carga de notificaciones
            notificationList.innerHTML = `
                <div class="notification-item notification-warning">
                    <div class="notification-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="notification-content">
                        <h4>Stock crítico</h4>
                        <p>Poleras Franelas con estampado - Solo 2 unidades restantes</p>
                        <span class="notification-time">Hace 5 min</span>
                    </div>
                </div>
                <div class="notification-item notification-success">
                    <div class="notification-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="notification-content">
                        <h4>Meta alcanzada</h4>
                        <p>Vendedor Ana García completó su meta mensual</p>
                        <span class="notification-time">Hace 1 hora</span>
                    </div>
                </div>
                <div class="notification-item notification-info">
                    <div class="notification-icon">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <div class="notification-content">
                        <h4>Nuevo empleado</h4>
                        <p>Se registró un nuevo empleado en el sistema</p>
                        <span class="notification-time">Hace 2 horas</span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Búsqueda global
     */
    handleGlobalSearch(query) {
        if (query.length < 3) return;
        
        console.log('Buscando:', query);
        // Aquí implementarías la lógica de búsqueda real
        this.showSearchResults(query);
    }

    /**
     * Muestra resultados de búsqueda
     */
    showSearchResults(query) {
        // Implementar dropdown de resultados
        console.log(`Resultados para: ${query}`);
    }

    /**
     * Shortcuts de teclado
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K para search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearch');
            searchInput?.focus();
        }

        // Escape para cerrar modales
        if (e.key === 'Escape') {
            this.hideNotifications();
        }

        // Alt + número para navegación rápida
        if (e.altKey && !isNaN(e.key)) {
            const sections = ['dashboard', 'inventario', 'ventas', 'personal', 'reportes'];
            const sectionIndex = parseInt(e.key) - 1;
            if (sections[sectionIndex]) {
                this.navigateToSection(sections[sectionIndex]);
            }
        }
    }

    /**
     * Inicializa gráficos
     */
    initializeCharts() {
        this.initializeSalesChart();
    }

    /**
     * Gráfico de ventas
     */
    initializeSalesChart() {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Simular datos de ventas de la semana
        const salesData = {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Ventas (S/)',
                data: [1200, 1900, 800, 1500, 2000, 2400, 1800],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        };

        // Crear gráfico simple
        this.drawSimpleChart(ctx, salesData);
    }

    /**
     * Dibuja un gráfico simple
     */
    drawSimpleChart(ctx, data) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        // Limpiar canvas
        ctx.clearRect(0, 0, width, height);

        // Configurar estilos
        ctx.strokeStyle = '#2563eb';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
        ctx.lineWidth = 3;
        ctx.font = '12px Inter, sans-serif';

        // Datos
        const values = data.datasets[0].data;
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const range = maxValue - minValue;

        // Dibujar líneas de la grilla
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i / 5);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Dibujar línea de datos
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const points = [];
        values.forEach((value, index) => {
            const x = padding + (chartWidth * index / (values.length - 1));
            const y = padding + chartHeight - ((value - minValue) / range * chartHeight);
            points.push({ x, y });
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Rellenar área bajo la curva
        ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding);
        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(points[points.length - 1].x, height - padding);
        ctx.closePath();
        ctx.fill();

        // Dibujar puntos
        ctx.fillStyle = '#2563eb';
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Etiquetas del eje X
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        data.labels.forEach((label, index) => {
            const x = padding + (chartWidth * index / (data.labels.length - 1));
            const y = height - padding + 20;
            ctx.fillText(label, x, y);
        });
    }

    /**
     * Actualizar gráfico según período
     */
    updateChart(period) {
        console.log('Actualizando gráfico para:', period);
        this.initializeSalesChart();
    }

    /**
     * Reloj en tiempo real
     */
    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            const clockElement = document.getElementById('currentTime');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    /**
     * Cargar datos del usuario
     */
    loadUserData() {
        // Simular carga de datos del usuario
        const userData = {
            name: 'Diego Admin',
            role: 'Administrador',
            avatar: null,
            lastLogin: new Date()
        };

        this.updateUserDisplay(userData);
        
        // Cargar preferencia de sidebar
        const sidebarCollapsed = localStorage.getItem('gams_sidebar_collapsed');
        if (sidebarCollapsed === 'true') {
            const sidebar = document.getElementById('sidebar');
            sidebar?.classList.add('collapsed');
            this.sidebarCollapsed = true;
        }
    }

    /**
     * Actualizar visualización del usuario
     */
    updateUserDisplay(userData) {
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');
        
        if (userName) userName.textContent = userData.name;
        if (userRole) userRole.textContent = userData.role;
    }

    /**
     * Verificar responsividad
     */
    checkResponsive() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 1024;
        
        if (wasMobile !== this.isMobile) {
            const sidebar = document.getElementById('sidebar');
            if (this.isMobile) {
                sidebar?.classList.remove('collapsed');
                sidebar?.classList.remove('active');
            } else {
                sidebar?.classList.remove('active');
                if (this.sidebarCollapsed) {
                    sidebar?.classList.add('collapsed');
                }
            }
        }
    }

    /**
     * Refrescar datos del dashboard
     */
    refreshDashboardData() {
        this.updateStatCards();
        this.loadRecentNotifications();
        this.updateTopProducts();
        this.initializeSalesChart();
    }

    /**
     * Actualizar tarjetas de estadísticas
     */
    updateStatCards() {
        const stats = {
            inventory: { total: 245, low: 3 },
            sales: { today: 2450, invoices: 12 },
            staff: { online: 8, total: 15 },
            monthly: { amount: 45200, progress: 85 }
        };

        console.log('Actualizando estadísticas:', stats);
    }

    /**
     * Cargar notificaciones recientes
     */
    loadRecentNotifications() {
        console.log('Cargando notificaciones recientes...');
    }

    /**
     * Actualizar productos más vendidos
     */
    updateTopProducts() {
        const products = [
            { name: 'iPhone 14', sales: 45, percentage: 90 },
            { name: 'AirPods Pro', sales: 32, percentage: 65 },
            { name: 'MacBook Air', sales: 18, percentage: 35 }
        ];

        const productItems = document.querySelectorAll('.product-item');
        productItems.forEach((item, index) => {
            if (products[index]) {
                const progressBar = item.querySelector('.progress-fill');
                if (progressBar) {
                    progressBar.style.width = products[index].percentage + '%';
                }
            }
        });
    }

    /**
     * Cargar datos de inventario
     */
    loadInventoryData() {
        console.log('Cargando datos de inventario...');
    }

    /**
     * Inicializar punto de venta
     */
    initializePOS() {
        console.log('Inicializando punto de venta...');
    }

    /**
     * Cargar datos de personal
     */
    loadPersonalData() {
        console.log('Cargando datos de personal...');
    }

    /**
     * Cargar datos de reportes
     */
    loadReportsData() {
        console.log('Cargando datos de reportes...');
    }

    /**
     * Mostrar toast de notificación
     */
    showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
    }

    /**
     * Obtener icono para toast
     */
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Remover toast
     */
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    /**
     * Manejar errores globales
     */
    handleError(error, context = '') {
        console.error(`Error en ${context}:`, error);
        this.showToast('error', 'Error', `Se produjo un error${context ? ' en ' + context : ''}`);
    }
}

// Estilos para toasts
const toastStyles = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
    z-index: 9999;
    border-left: 4px solid #2563eb;
}

.toast.show {
    transform: translateX(0);
}

.toast.hide {
    transform: translateX(100%);
}

.toast-success {
    border-left-color: #10b981;
}

.toast-error {
    border-left-color: #ef4444;
}

.toast-warning {
    border-left-color: #f59e0b;
}

.toast-icon {
    font-size: 1.25rem;
}

.toast-success .toast-icon {
    color: #10b981;
}

.toast-error .toast-icon {
    color: #ef4444;
}

.toast-warning .toast-icon {
    color: #f59e0b;
}

.toast-content {
    flex: 1;
}

.toast-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: #1f2937;
}

.toast-message {
    font-size: 0.875rem;
    color: #6b7280;
}

.toast-close {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.15s ease-in-out;
}

.toast-close:hover {
    background: #f3f4f6;
    color: #6b7280;
}
`;

// Inyectar estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = toastStyles;
document.head.appendChild(styleSheet);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.gamsDashboard = new GAMSDashboard();
    
    // Mostrar mensaje de bienvenida
    setTimeout(() => {
        window.gamsDashboard.showToast('success', 'Bienvenido', 'Dashboard cargado correctamente');
    }, 1000);
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    if (window.gamsDashboard) {
        window.gamsDashboard.handleError(event.error, 'aplicación');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejection no manejada:', event.reason);
    if (window.gamsDashboard) {
        window.gamsDashboard.handleError(event.reason, 'conexión');
    }
});