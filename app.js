// GrantApp AI - Reconciled JavaScript with Anti-Silent-Failure

class GrantApp {
    constructor() {
        this.timerInterval = null;
        this.timeLeft = 15 * 60; // 15 minutes in seconds
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.timerPosition = { x: 20, y: 100 };
        this.initialized = false;
    }

    // Initialize the application with error handling
    init() {
        try {
            this.initBackgroundParticles();
            this.initTimer();
            this.setupEventListeners();
            this.checkBackNavigation();
            this.initialized = true;
        } catch (error) {
            this.handleFatalError('Unable to start the application. Please refresh the page.', error);
        }
    }

    // Initialize draggable timer with error handling
    initTimer() {
        const timerContainer = document.querySelector('.timer-container');
        const timerWidget = document.querySelector('.timer-widget');
        
        if (!timerContainer || !timerWidget) {
            console.warn('Timer elements not found - timer functionality will be disabled');
            return;
        }
        
        try {
            // Load saved position for landing page
            if (!timerContainer.classList.contains('quiz')) {
                try {
                    const saved = localStorage.getItem('grantappTimerPosition');
                    if (saved) {
                        const pos = JSON.parse(saved);
                        // Ensure position is on screen (basic bounds check)
                        const maxX = window.innerWidth - 200;
                        const maxY = window.innerHeight - 200;
                        this.timerPosition.x = Math.min(Math.max(0, pos.x), maxX);
                        this.timerPosition.y = Math.min(Math.max(60, pos.y), maxY);
                    } else {
                        // Default position - bottom right
                        this.timerPosition.x = window.innerWidth - 220;
                        this.timerPosition.y = window.innerHeight - 180;
                    }
                    timerContainer.style.left = `${this.timerPosition.x}px`;
                    timerContainer.style.top = `${this.timerPosition.y}px`;
                } catch (error) {
                    // Fallback to safe visible position
                    timerContainer.style.right = '20px';
                    timerContainer.style.bottom = '20px';
                    console.warn('Could not restore timer position:', error);
                }
                
                // Make draggable
                this.setupDraggableTimer(timerContainer);
            }
            
            // Start countdown
            this.startCountdown();
        } catch (error) {
            console.error('Timer initialization error:', error);
            // Timer fails gracefully - show static timer
            const display = timerContainer.querySelector('.timer-display');
            if (display) display.textContent = '15:00';
        }
    }

    setupDraggableTimer(container) {
        const timerWidget = container.querySelector('.timer-widget');
        if (!timerWidget) return;
        
        try {
            // Mouse events
            timerWidget.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                container.classList.add('dragging');
                
                const rect = container.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                
                document.addEventListener('mousemove', this.handleDrag.bind(this));
                document.addEventListener('mouseup', this.stopDrag.bind(this));
            });
            
            // Touch events
            timerWidget.addEventListener('touchstart', (e) => {
                this.isDragging = true;
                container.classList.add('dragging');
                
                const touch = e.touches[0];
                const rect = container.getBoundingClientRect();
                this.dragOffset.x = touch.clientX - rect.left;
                this.dragOffset.y = touch.clientY - rect.top;
                
                document.addEventListener('touchmove', this.handleTouchDrag.bind(this));
                document.addEventListener('touchend', this.stopDrag.bind(this));
            });
        } catch (error) {
            console.error('Error setting up draggable timer:', error);
            // Timer stays in place if drag fails
        }
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        
        try {
            const container = document.querySelector('.timer-container');
            if (!container) return;
            
            this.timerPosition.x = e.clientX - this.dragOffset.x;
            this.timerPosition.y = e.clientY - this.dragOffset.y;
            
            container.style.left = `${this.timerPosition.x}px`;
            container.style.top = `${this.timerPosition.y}px`;
        } catch (error) {
            console.error('Drag error:', error);
        }
    }

    handleTouchDrag(e) {
        if (!this.isDragging || !e.touches[0]) return;
        
        try {
            const container = document.querySelector('.timer-container');
            if (!container) return;
            
            const touch = e.touches[0];
            this.timerPosition.x = touch.clientX - this.dragOffset.x;
            this.timerPosition.y = touch.clientY - this.dragOffset.y;
            
            container.style.left = `${this.timerPosition.x}px`;
            container.style.top = `${this.timerPosition.y}px`;
        } catch (error) {
            console.error('Touch drag error:', error);
        }
    }

    stopDrag() {
        this.isDragging = false;
        const container = document.querySelector('.timer-container');
        if (container) {
            container.classList.remove('dragging');
        }
        
        // Save position
        try {
            localStorage.setItem('grantappTimerPosition', JSON.stringify(this.timerPosition));
        } catch (error) {
            console.warn('Could not save timer position:', error);
        }
        
        // Remove event listeners
        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.stopDrag.bind(this));
        document.removeEventListener('touchmove', this.handleTouchDrag.bind(this));
        document.removeEventListener('touchend', this.stopDrag.bind(this));
    }

    // Start timer countdown
    startCountdown() {
        const display = document.querySelector('.timer-display');
        const progressBar = document.querySelector('.timer-progress-bar');
        const container = document.querySelector('.timer-container');
        
        if (!display) {
            console.warn('Timer display not found');
            return;
        }
        
        const updateTimer = () => {
            try {
                if (this.timeLeft <= 0) {
                    display.textContent = '00:00';
                    if (progressBar) progressBar.style.width = '0%';
                    if (container) container.classList.add('timer-critical');
                    clearInterval(this.timerInterval);
                    
                    // Auto-submit on quiz pages
                    if (document.querySelector('.timer-container.quiz')) {
                        this.submitTest();
                    }
                    return;
                }
                
                this.timeLeft--;
                const minutes = Math.floor(this.timeLeft / 60);
                const seconds = this.timeLeft % 60;
                display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Update progress bar
                if (progressBar) {
                    const progress = (this.timeLeft / (15 * 60)) * 100;
                    progressBar.style.width = `${progress}%`;
                }
                
                // Update timer styling based on README spec
                if (container) {
                    container.classList.remove('timer-safe', 'timer-warning', 'timer-critical');
                    if (minutes >= 10) {
                        container.classList.add('timer-safe'); // Green >10min
                    } else if (minutes >= 5) {
                        container.classList.add('timer-warning'); // Orange 5-10min
                    } else {
                        container.classList.add('timer-critical'); // Red <5min with pulse
                    }
                }
            } catch (error) {
                console.error('Timer update error:', error);
                clearInterval(this.timerInterval);
            }
        };
        
        updateTimer(); // Initial call
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    // Stream selection
    selectStream(stream) {
        if (!stream) {
            this.showError('Please select a valid stream');
            return;
        }
        
        try {
            this.showLoading();
            
            // Save selection
            localStorage.setItem('selectedStream', stream);
            
            // Navigate after delay - handle art vs arts naming
            setTimeout(() => {
                const routeName = stream === 'art' ? 'art' : stream;
                window.location.href = `${routeName}_clusters.html`;
            }, 1000);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
            console.error('Stream selection error:', error);
        }
    }

    // Cluster selection
    selectCluster(cluster) {
        if (!cluster) {
            this.showError('Please select a valid cluster');
            return;
        }
        
        try {
            this.showLoading();
            
            // Save cluster selection
            localStorage.setItem('selectedCluster', cluster);
            
            // Navigate to practice test
            setTimeout(() => {
                window.location.href = `practice_${cluster}.html`;
            }, 1000);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
            console.error('Cluster selection error:', error);
        }
    }

    // Loading system with error handling
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('active');
            try {
                localStorage.setItem('grantappLoading', 'true');
            } catch (error) {
                console.warn('Could not set loading state:', error);
            }
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            try {
                localStorage.removeItem('grantappLoading');
            } catch (error) {
                console.warn('Could not clear loading state:', error);
            }
        }
    }

    checkBackNavigation() {
        try {
            if (localStorage.getItem('grantappLoading') === 'true') {
                setTimeout(() => {
                    this.hideLoading();
                }, 500);
            }
        } catch (error) {
            console.warn('Could not check loading state:', error);
            this.hideLoading();
        }
    }

    // Setup background particles
    initBackgroundParticles() {
        const bg = document.querySelector('.animated-bg');
        if (!bg) return;
        
        try {
            // Clear existing particles
            bg.innerHTML = '';
            
            // Create particles
            for (let i = 0; i < 12; i++) {
                const particle = document.createElement('div');
                particle.className = 'bg-particle';
                
                const size = Math.random() * 120 + 60;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.top = `${Math.random() * 100}%`;
                particle.style.left = `${Math.random() * 100}%`;
                particle.style.animationDelay = `${Math.random() * 10}s`;
                particle.style.opacity = Math.random() * 0.08 + 0.02;
                
                bg.appendChild(particle);
            }
        } catch (error) {
            console.error('Error creating background particles:', error);
            // Fails silently - background is decorative
        }
    }

    // Initialize placeholder shimmer per README protocol
    initializePlaceholders() {
        try {
            // Only query stat-number elements that might have placeholders - much more efficient
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(el => {
                const text = el.textContent.trim();
                if (text.includes('[COUNT]') || text.includes('[PERCENTAGE]')) {
                    el.classList.add('placeholder-shimmer');
                }
            });
        } catch (error) {
            console.warn('Could not initialize placeholders:', error);
        }
    }

    // Setup event listeners with unified data-attribute pattern
    setupEventListeners() {
        try {
            // Apply shimmer to placeholders per README protocol
            this.initializePlaceholders();
            
            // Stream selection buttons
            document.querySelectorAll('[data-stream]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const stream = btn.dataset.stream;
                    this.selectStream(stream);
                });
            });
            
            // Cluster selection buttons
            document.querySelectorAll('[data-cluster]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const cluster = btn.dataset.cluster;
                    this.selectCluster(cluster);
                });
            });
            
            // Coming soon buttons
            document.querySelectorAll('[data-coming-soon]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const feature = btn.dataset.comingSoon;
                    this.showComingSoon(feature);
                });
            });
            
            // Modal close buttons
            document.querySelectorAll('[data-close-modal]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modalId = btn.dataset.closeModal;
                    this.closeModal(modalId);
                });
            });
            
            // Close modals on overlay click
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        overlay.classList.add('hidden');
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showError('Some interactive features may not work properly. Please refresh the page.');
        }
    }

    // Show coming soon modal
    showComingSoon(feature) {
        try {
            const message = document.getElementById('coming-soon-message');
            if (message) {
                message.textContent = `${feature} is coming soon! We're working hard to bring you this feature.`;
            }
            this.showModal('coming-soon-modal');
        } catch (error) {
            console.error('Error showing coming soon modal:', error);
        }
    }

    // Show error modal with user-friendly message
    showError(message) {
        try {
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
            this.showModal('error-modal');
        } catch (error) {
            console.error('Error showing error modal:', error);
            // Fallback to alert if modal fails
            alert(message);
        }
    }

    // Handle fatal errors
    handleFatalError(userMessage, error) {
        console.error('Fatal error:', error);
        this.showError(userMessage);
    }

    // Modal controls
    showModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
            } else {
                console.warn(`Modal ${modalId} not found`);
            }
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }

    closeModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error closing modal:', error);
        }
    }

    // Quiz submission
    submitTest() {
        try {
            console.log('Submitting test...');
            this.showError('Time is up! Your test has been submitted.');
            // Add actual submission logic here when backend is ready
        } catch (error) {
            console.error('Error submitting test:', error);
            this.showError('Unable to submit test. Please contact support.');
        }
    }

    // Reset timer (for practice tests)
    resetTimer(minutes = 15) {
        try {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            this.timeLeft = minutes * 60;
            this.startCountdown();
        } catch (error) {
            console.error('Error resetting timer:', error);
        }
    }

    // Pause timer
    pauseTimer() {
        try {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        } catch (error) {
            console.error('Error pausing timer:', error);
        }
    }

    // Resume timer
    resumeTimer() {
        try {
            if (!this.timerInterval && this.timeLeft > 0) {
                this.startCountdown();
            }
        } catch (error) {
            console.error('Error resuming timer:', error);
        }
    }
}

// Initialize when DOM is loaded with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.GrantApp = new GrantApp();
        window.GrantApp.init();
        console.log('GrantApp initialized successfully');
    } catch (error) {
        console.error('Failed to initialize GrantApp:', error);
        
        // Show user-friendly error
        const body = document.body;
        if (body) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #EF4444; color: white; padding: 1rem 2rem; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
            errorDiv.textContent = 'Unable to start the application. Please refresh the page.';
            body.appendChild(errorDiv);
        }
    }
});

// Prevent errors from breaking the page
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show modal for every error, just log it
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show modal for every rejection, just log it
});
