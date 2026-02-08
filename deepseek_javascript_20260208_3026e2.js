// GrantApp AI - Complete JavaScript Logic

class GrantApp {
    constructor() {
        this.timerInterval = null;
        this.timeLeft = 15 * 60; // 15 minutes in seconds
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.timerPosition = { x: 20, y: 100 };
    }

    // Initialize the application
    init() {
        this.initTimer();
        this.initBackgroundParticles();
        this.setupEventListeners();
        this.checkBackNavigation();
        
        // Set placeholder values
        this.setPlaceholders();
    }

    // Initialize draggable timer
    initTimer() {
        const timerContainer = document.querySelector('.timer-container');
        const timerWidget = document.querySelector('.timer-widget');
        
        if (!timerContainer || !timerWidget) return;
        
        // Load saved position for landing page
        if (!timerContainer.classList.contains('quiz')) {
            const saved = localStorage.getItem('grantappTimerPosition');
            if (saved) {
                this.timerPosition = JSON.parse(saved);
                timerContainer.style.left = `${this.timerPosition.x}px`;
                timerContainer.style.top = `${this.timerPosition.y}px`;
            } else {
                // Default position
                timerContainer.style.left = '20px';
                timerContainer.style.top = '100px';
            }
            
            // Make draggable
            this.setupDraggableTimer(timerContainer);
        }
        
        // Start countdown
        this.startCountdown();
    }

    setupDraggableTimer(container) {
        const timerWidget = container.querySelector('.timer-widget');
        
        timerWidget.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            container.classList.add('dragging');
            
            const rect = container.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            document.addEventListener('mousemove', this.handleDrag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));
        });
        
        // Touch support
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
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        
        const container = document.querySelector('.timer-container');
        this.timerPosition.x = e.clientX - this.dragOffset.x;
        this.timerPosition.y = e.clientY - this.dragOffset.y;
        
        container.style.left = `${this.timerPosition.x}px`;
        container.style.top = `${this.timerPosition.y}px`;
    }

    handleTouchDrag(e) {
        if (!this.isDragging || !e.touches[0]) return;
        
        const container = document.querySelector('.timer-container');
        const touch = e.touches[0];
        this.timerPosition.x = touch.clientX - this.dragOffset.x;
        this.timerPosition.y = touch.clientY - this.dragOffset.y;
        
        container.style.left = `${this.timerPosition.x}px`;
        container.style.top = `${this.timerPosition.y}px`;
    }

    stopDrag() {
        this.isDragging = false;
        const container = document.querySelector('.timer-container');
        container.classList.remove('dragging');
        
        // Save position
        localStorage.setItem('grantappTimerPosition', JSON.stringify(this.timerPosition));
        
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
        
        if (!display) return;
        
        const updateTimer = () => {
            if (this.timeLeft <= 0) {
                display.textContent = '00:00';
                if (progressBar) progressBar.style.width = '0%';
                container.classList.add('timer-critical');
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
            
            // Update timer styling
            container.classList.remove('timer-warning', 'timer-critical');
            if (minutes < 5) {
                container.classList.add('timer-critical');
            } else if (minutes < 10) {
                container.classList.add('timer-warning');
            }
        };
        
        updateTimer(); // Initial call
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    // Stream selection
    selectStream(stream) {
        this.showLoading();
        
        // Save selection
        localStorage.setItem('selectedStream', stream);
        
        // Navigate after delay
        setTimeout(() => {
            window.location.href = `${stream}_clusters.html`;
        }, 1000);
    }

    // Cluster selection
    selectCluster(cluster) {
        this.showLoading();
        
        // Save cluster selection
        localStorage.setItem('selectedCluster', cluster);
        
        // Navigate to practice test
        setTimeout(() => {
            window.location.href = `practice_${cluster}.html`;
        }, 1000);
    }

    // Loading system
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('active');
            localStorage.setItem('grantappLoading', 'true');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            localStorage.removeItem('grantappLoading');
        }
    }

    checkBackNavigation() {
        if (localStorage.getItem('grantappLoading') === 'true') {
            setTimeout(() => {
                this.hideLoading();
            }, 500);
        }
    }

    // Setup background particles
    initBackgroundParticles() {
        const bg = document.querySelector('.animated-bg');
        if (!bg) return;
        
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
    }

    // Set placeholder values
    setPlaceholders() {
        // Replace all placeholder spans with shimmer effect
        document.querySelectorAll('.placeholder').forEach(el => {
            if (!el.innerHTML.trim()) {
                el.innerHTML = '<span class="placeholder-text"></span>';
            }
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Stream selection buttons
        document.querySelectorAll('[data-stream]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectStream(btn.dataset.stream);
            });
        });
        
        // Cluster selection buttons
        document.querySelectorAll('[data-cluster]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectCluster(btn.dataset.cluster);
            });
        });
        
        // Coming soon buttons
        document.querySelectorAll('[data-coming-soon]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showComingSoon(btn.dataset.comingSoon);
            });
        });
    }

    // Show coming soon modal
    showComingSoon(feature) {
        const message = document.getElementById('coming-soon-message');
        if (message) {
            message.textContent = `${feature} is coming soon!`;
        }
        this.showModal('coming-soon-modal');
    }

    // Modal controls
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Quiz submission
    submitTest() {
        // Add your quiz submission logic here
        console.log('Submitting test...');
        alert('Time is up! Your test has been submitted.');
    }

    // Reset timer (for practice tests)
    resetTimer(minutes = 15) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timeLeft = minutes * 60;
        this.startCountdown();
    }

    // Pause timer
    pauseTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Resume timer
    resumeTimer() {
        if (!this.timerInterval && this.timeLeft > 0) {
            this.startCountdown();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.GrantApp = new GrantApp();
    window.GrantApp.init();
});

// Global functions for HTML onclick attributes
window.selectStream = (stream) => window.GrantApp.selectStream(stream);
window.selectCluster = (cluster) => window.GrantApp.selectCluster(cluster);
window.showComingSoon = (feature) => window.GrantApp.showComingSoon(feature);
window.closeModal = (modalId) => window.GrantApp.closeModal(modalId);