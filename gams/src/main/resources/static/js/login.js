/**
 * GAMS S.A.C - Sistema de Gestión
 * Funcionalidades JavaScript para la página de login
 */

class GAMSLoginManager {
    constructor() {
        this.currentStream = null;
        this.isProcessing = false;
        
        this.initializeEventListeners();
        this.startClock();
        this.initializeAnimations();
    }

    /**
     * Inicializa todos los event listeners
     */
    initializeEventListeners() {
        // Opciones de acceso
        document.getElementById('facialOption')?.addEventListener('click', () => {
            this.openFacialRecognition();
        });

        document.getElementById('traditionalOption')?.addEventListener('click', () => {
            this.openTraditionalLogin();
        });

        // Modales - Cerrar
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeFacialModal();
        });

        document.getElementById('closeTraditionalModal')?.addEventListener('click', () => {
            this.closeTraditionalModal();
        });

        // Botones de reconocimiento facial
        document.getElementById('captureBtn')?.addEventListener('click', () => {
            this.captureAndProcess();
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeFacialModal();
        });

        // NO interceptar el formulario tradicional - dejar que Spring Security lo maneje
        // El formulario se enviará normalmente al servidor

        // Toggle password visibility
        document.getElementById('togglePassword')?.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Cerrar modales con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Cerrar modales clickeando fuera
        document.querySelectorAll('.facial-modal, .traditional-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
    }

    /**
     * Abre el modal de reconocimiento facial
     */
    async openFacialRecognition() {
        const modal = document.getElementById('facialModal');
        const videoElement = document.getElementById('videoElement');
        
        try {
            modal.classList.add('active');
            
            // Solicitar acceso a la cámara
            this.currentStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            videoElement.srcObject = this.currentStream;
            
            this.showToast('success', 'Cámara activada', 'Coloca tu rostro dentro del marco');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showToast('error', 'Error de cámara', 'No se pudo acceder a la cámara. Usa el acceso tradicional.');
            this.closeFacialModal();
        }
    }

    /**
     * Cierra el modal de reconocimiento facial
     */
    closeFacialModal() {
        const modal = document.getElementById('facialModal');
        modal.classList.remove('active');
        
        // Detener el stream de video
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        // Ocultar indicador de procesamiento
        document.getElementById('processingIndicator').classList.remove('active');
        this.isProcessing = false;
    }

    /**
     * Captura la imagen y procesa el reconocimiento facial
     */
    async captureAndProcess() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        const processingIndicator = document.getElementById('processingIndicator');
        const videoElement = document.getElementById('videoElement');
        const canvasElement = document.getElementById('canvasElement');
        
        try {
            // Mostrar indicador de procesamiento
            processingIndicator.classList.add('active');
            
            // Capturar frame del video
            const context = canvasElement.getContext('2d');
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0);
            
            // Convertir a blob para enviar al servidor
            const blob = await new Promise(resolve => canvasElement.toBlob(resolve, 'image/jpeg', 0.8));
            
            // Enviar al backend para procesamiento real
            await this.processFacialRecognition(blob);
            
        } catch (error) {
            console.error('Error processing facial recognition:', error);
            this.showToast('error', 'Error de procesamiento', 'No se pudo procesar la imagen');
        } finally {
            processingIndicator.classList.remove('active');
            this.isProcessing = false;
        }
    }

    /**
     * Envía la imagen al backend para reconocimiento facial
     */
    async processFacialRecognition(imageBlob) {
        try {
            const formData = new FormData();
            formData.append('image', imageBlob, 'facial-capture.jpg');
            
            const response = await fetch('/api/facial-recognition', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('success', '¡Reconocimiento exitoso!', `Bienvenido ${result.user.name}`);
                this.closeFacialModal();
                
                // Redirigir al dashboard
                setTimeout(() => {
                    window.location.href = result.redirectUrl || '/dashboard';
                }, 1500);
            } else {
                this.showToast('error', 'Reconocimiento fallido', result.message || 'No se pudo verificar tu identidad');
            }
            
        } catch (error) {
            console.error('Error calling facial recognition API:', error);
            this.showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor');
        }
    }

    /**
     * Abre el modal de login tradicional
     */
    openTraditionalLogin() {
        const modal = document.getElementById('traditionalModal');
        modal.classList.add('active');
        
        // Focus en el campo de usuario
        setTimeout(() => {
            document.getElementById('username')?.focus();
        }, 100);
    }

    /**
     * Cierra el modal de login tradicional
     */
    closeTraditionalModal() {
        const modal = document.getElementById('traditionalModal');
        modal.classList.remove('active');
        
        // Limpiar formulario
        document.getElementById('loginForm')?.reset();
    }

    /**
     * Toggle de visibilidad de contraseña
     */
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');
        const icon = toggleBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    /**
     * Cierra todos los modales
     */
    closeAllModals() {
        this.closeFacialModal();
        this.closeTraditionalModal();
    }

    /**
     * Muestra un toast de notificación
     */
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconMap[type]}"></i>
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
    }

    /**
     * Remueve un toast
     */
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'toastSlideOut 0.3s ease-in';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    /**
     * Inicia el reloj en tiempo real
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
     * Inicializa animaciones
     */
    initializeAnimations() {
        // Animación de entrada para elementos
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);
        
        // Observar elementos para animaciones
        document.querySelectorAll('.login-card, .system-status').forEach(el => {
            observer.observe(el);
        });
        
        // Cargar usuario recordado si existe
        this.loadRememberedUser();
    }

    /**
     * Carga usuario recordado del localStorage
     */
    loadRememberedUser() {
        const rememberedUser = localStorage.getItem('gams_remember_user');
        if (rememberedUser) {
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.value = rememberedUser;
                // También marcar el checkbox
                const rememberCheckbox = document.getElementById('remember');
                if (rememberCheckbox) {
                    rememberCheckbox.checked = true;
                }
            }
        }
    }
}

// CSS adicional para animaciones
const additionalStyles = `
@keyframes toastSlideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

.status-dot.offline {
    background: var(--error-color);
}

/* Loading state para botones */
.btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn:disabled:hover {
    transform: none;
    box-shadow: none;
}
`;

// Agregar estilos adicionales
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.gamsLogin = new GAMSLoginManager();
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    if (window.gamsLogin) {
        window.gamsLogin.showToast('error', 'Error del sistema', 'Se produjo un error inesperado');
    }
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejection no manejada:', event.reason);
    if (window.gamsLogin) {
        window.gamsLogin.showToast('error', 'Error de conexión', 'Problema de conectividad detectado');
    }
});