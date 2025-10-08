/**
 * GAMS S.A.C - Index JavaScript
 * Sistema de módulos por roles
 */

class GAMSIndex {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        
        this.init();
    }

    async init() {
        await this.initializeUser();
        this.initializeEventListeners();
        this.initializeModulesByRole();
        this.startClock();
        this.showWelcomeMessage();
    }

    /**
     * Inicializar datos del usuario
     */
    async initializeUser() {
        try {
            // Obtener datos del usuario desde el backend
            const response = await fetch('/api/usuarios/current');
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.userRole = data.user.role;
                
                // Actualizar UI con datos del usuario
                this.updateUserDisplay();
            } else {
                console.error('Error obteniendo usuario:', data.message);
                // Fallback a datos por defecto
                this.currentUser = {
                    name: 'Usuario',
                    role: 'usuario',
                    displayRole: 'Usuario',
                    avatar: null,
                    permissions: ['configuracion']
                };
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('Error cargando usuario:', error);
            // Fallback a datos por defecto
            this.currentUser = {
                name: 'Usuario',
                role: 'usuario',
                displayRole: 'Usuario',
                avatar: null,
                permissions: ['configuracion']
            };
            this.updateUserDisplay();
        }
    }

    /**
     * Actualizar visualización del usuario
     */
    updateUserDisplay() {
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        
        if (userName) userName.textContent = this.currentUser.name;
        if (userRole) userRole.textContent = this.currentUser.displayRole;
    }

    /**
     * Inicializar event listeners
     */
    initializeEventListeners() {
        // Click en módulos
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const module = card.dataset.module;
                this.handleModuleClick(module, card);
            });
            
            // Hover effects
            card.addEventListener('mouseenter', () => {
                this.playHoverSound();
            });
        });

        // Acciones rápidas
        document.querySelectorAll('.quick-action').forEach(action => {
            action.addEventListener('click', (e) => {
                const actionType = action.dataset.action;
                this.handleQuickAction(actionType);
            });
        });

        // Modal controls
        this.setupModalControls();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        notificationBtn?.addEventListener('click', () => {
            this.showNotifications();
        });
    }

    /**
     * Mostrar/ocultar módulos según rol
     */
    initializeModulesByRole() {
        const moduleCards = document.querySelectorAll('.module-card');
        const userPermissions = this.currentUser.permissions;
        
        moduleCards.forEach(card => {
            const module = card.dataset.module;
            
            // Verificar si el usuario tiene permisos para este módulo
            if (userPermissions.includes(module)) {
                card.classList.remove('hidden');
                card.style.display = 'flex';
            } else {
                card.classList.add('hidden');
                card.style.display = 'none';
            }
        });

        // Actualizar acciones rápidas según permisos
        this.updateQuickActions();
        
        // Mostrar estadísticas del grid
        this.showModuleStats();
    }

    /**
     * Actualizar acciones rápidas según rol
     */
    updateQuickActions() {
        const quickActions = document.querySelectorAll('.quick-action');
        const permissions = this.currentUser.permissions;
        
        quickActions.forEach(action => {
            const actionType = action.dataset.action;
            
            // Lógica para mostrar/ocultar acciones según permisos
            switch(actionType) {
                case 'nueva-venta':
                    if (!permissions.includes('ventas')) {
                        action.style.display = 'none';
                    }
                    break;
                case 'agregar-producto':
                    if (!permissions.includes('inventario')) {
                        action.style.display = 'none';
                    }
                    break;
                case 'ver-reportes':
                    if (!permissions.includes('reportes')) {
                        action.style.display = 'none';
                    }
                    break;
            }
        });
    }

    /**
     * Manejar click en módulo
     */
    handleModuleClick(module, cardElement) {
        // Verificar permisos
        if (!this.currentUser.permissions.includes(module)) {
            this.showToast('warning', 'Acceso denegado', 'No tienes permisos para este módulo');
            return;
        }

        // Mostrar confirmación
        this.showConfirmationModal(
            `Acceder a ${this.getModuleName(module)}`,
            `¿Deseas ingresar al módulo de ${this.getModuleName(module)}?`,
            () => {
                this.navigateToModule(module);
            }
        );

        // Efecto visual
        cardElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            cardElement.style.transform = '';
        }, 150);
    }

    /**
     * Obtener nombre completo del módulo
     */
    getModuleName(module) {
        const names = {
            inventario: 'Inventario',
            ventas: 'Punto de Venta',
            personal: 'Gestión de Personal',
            reportes: 'Reportes y Analytics',
            configuracion: 'Configuración',
            auditoria: 'Auditoría y Seguridad'
        };
        return names[module] || module;
    }

    /**
     * Navegar al módulo seleccionado
     */
    navigateToModule(module) {
        // Mostrar loading
        this.showToast('info', 'Cargando', `Iniciando ${this.getModuleName(module)}...`);
        
        // Simular carga y redirigir
        setTimeout(() => {
            switch(module) {
                case 'inventario':
                    window.location.href = '/inventario';
                    break;
                case 'ventas':
                    window.location.href = '/ventas';
                    break;
                case 'personal':
                    window.location.href = '/personal';
                    break;
                case 'reportes':
                    window.location.href = '/reportes';
                    break;
                case 'configuracion':
                    window.location.href = '/configuracion';
                    break;
                case 'auditoria':
                    window.location.href = '/auditoria';
                    break;
                default:
                    this.showToast('error', 'Error', 'Módulo no encontrado');
            }
        }, 1000);
    }

    /**
     * Manejar acciones rápidas
     */
    handleQuickAction(actionType) {
        switch(actionType) {
            case 'nueva-venta':
                if (this.currentUser.permissions.includes('ventas')) {
                    this.navigateToModule('ventas');
                }
                break;
            case 'agregar-producto':
                if (this.currentUser.permissions.includes('inventario')) {
                    this.navigateToModule('inventario');
                }
                break;
            case 'ver-reportes':
                if (this.currentUser.permissions.includes('reportes')) {
                    this.navigateToModule('reportes');
                }
                break;
        }
    }

    /**
     * Mostrar estadísticas del grid de módulos
     */
    showModuleStats() {
        const visibleModules = document.querySelectorAll('.module-card:not(.hidden)').length;
        console.log(`Módulos disponibles para ${this.currentUser.displayRole}: ${visibleModules}`);
    }

    /**
     * Mostrar modal de confirmación
     */
    showConfirmationModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('modalConfirm');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Limpiar listeners anteriores
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Agregar nuevo listener
        newConfirmBtn.addEventListener('click', () => {
            this.hideModal();
            onConfirm();
        });
        
        modal.classList.add('active');
    }

    /**
     * Configurar controles del modal
     */
    setupModalControls() {
        const modal = document.getElementById('confirmModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('modalCancel');
        
        closeBtn?.addEventListener('click', () => {
            this.hideModal();
        });
        
        cancelBtn?.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Cerrar con click fuera del modal
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    /**
     * Ocultar modal
     */
    hideModal() {
        const modal = document.getElementById('confirmModal');
        modal?.classList.remove('active');
    }

    /**
     * Shortcuts de teclado
     */
    handleKeyboardShortcuts(e) {
        // ESC para cerrar modal
        if (e.key === 'Escape') {
            this.hideModal();
        }

        // Números para acceso rápido a módulos (1-6)
        if (e.altKey && !isNaN(e.key) && e.key >= 1 && e.key <= 6) {
            const moduleCards = Array.from(document.querySelectorAll('.module-card:not(.hidden)'));
            const moduleIndex = parseInt(e.key) - 1;
            
            if (moduleCards[moduleIndex]) {
                const module = moduleCards[moduleIndex].dataset.module;
                this.handleModuleClick(module, moduleCards[moduleIndex]);
            }
        }

        // Ctrl+N para nueva venta
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && this.currentUser.permissions.includes('ventas')) {
            e.preventDefault();
            this.handleQuickAction('nueva-venta');
        }
    }

    /**
     * Reloj en tiempo real
     */
    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleString('es-PE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
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
     * Mostrar notificaciones
     */
    showNotifications() {
        // Simular notificaciones según rol
        const notifications = this.getNotificationsByRole();
        
        if (notifications.length > 0) {
            this.showToast('info', 'Notificaciones', `Tienes ${notifications.length} notificaciones pendientes`);
        } else {
            this.showToast('success', 'Sin notificaciones', 'No tienes notificaciones pendientes');
        }
    }

    /**
     * Obtener notificaciones según rol
     */
    getNotificationsByRole() {
        const roleNotifications = {
            admin: [
                'Stock crítico en 3 productos',
                'Nuevo empleado registrado',
                'Backup completado exitosamente'
            ],
            vendedor: [
                'Meta mensual al 75%',
                'Cliente preferencial disponible'
            ],
            almacen: [
                'Stock bajo en Laptop HP',
                'Ingreso de mercancía programado'
            ]
        };
        
        return roleNotifications[this.userRole] || [];
    }

    /**
     * Mostrar mensaje de bienvenida
     */
    showWelcomeMessage() {
        setTimeout(() => {
            const moduleCount = this.currentUser.permissions.length;
            this.showToast(
                'success', 
                `¡Bienvenido ${this.currentUser.name}!`, 
                `Tienes acceso a ${moduleCount} módulos del sistema`
            );
        }, 1000);
    }

    /**
     * Efecto de sonido hover (silencioso por defecto)
     */
    playHoverSound() {
        // Placeholder para futuros efectos de sonido
        console.log('Hover effect');
    }

    /**
     * Sistema de toast notifications
     */
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

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

        // Event listener para cerrar
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        container.appendChild(toast);

        // Auto-remove después de 5 segundos
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);

        // Animar entrada
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
}

// Estilos para toasts
const toastStyles = `
.toast {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 320px;
    margin-bottom: 12px;
    border-left: 4px solid #2563eb;
    transform: translateX(100%);
    transition: all 0.3s ease-out;
}

.toast.show {
    transform: translateX(0);
}

.toast.hide {
    transform: translateX(100%);
    opacity: 0;
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

.toast-info {
    border-left-color: #06b6d4;
}

.toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
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

.toast-info .toast-icon {
    color: #06b6d4;
}

.toast-content {
    flex: 1;
}

.toast-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: #1f2937;
    font-size: 0.875rem;
}

.toast-message {
    font-size: 0.8125rem;
    color: #6b7280;
    line-height: 1.4;
}

.toast-close {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.15s ease-in-out;
    flex-shrink: 0;
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
    window.gamsIndex = new GAMSIndex();
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    if (window.gamsIndex) {
        window.gamsIndex.showToast('error', 'Error del sistema', 'Se produjo un error inesperado');
    }
});