// app.js — GrantApp AI cluster/index page logic

class GrantApp {
    constructor() {
        this.timerInterval  = null;
        this.timeLeft       = 15 * 60; // 15 minutes in seconds
        this.isDragging     = false;
        this.dragOffset     = { x: 0, y: 0 };
        this.timerPosition  = { x: 20, y: 100 };
        this.initialized    = false;
    }

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

    // ── Timer ─────────────────────────────────────────────────
    initTimer() {
        const timerContainer = document.querySelector('.timer-container');
        const timerWidget    = document.querySelector('.timer-widget');

        if (!timerContainer || !timerWidget) {
            console.warn('Timer elements not found — timer disabled');
            return;
        }

        try {
            if (!timerContainer.classList.contains('quiz')) {
                try {
                    const saved = localStorage.getItem('grantappTimerPosition');
                    if (saved) {
                        const pos  = JSON.parse(saved);
                        const maxX = window.innerWidth  - 200;
                        const maxY = window.innerHeight - 200;
                        this.timerPosition.x = Math.min(Math.max(0,  pos.x), maxX);
                        this.timerPosition.y = Math.min(Math.max(60, pos.y), maxY);
                    } else {
                        this.timerPosition.x = window.innerWidth  - 220;
                        this.timerPosition.y = window.innerHeight - 180;
                    }
                    timerContainer.style.left = `${this.timerPosition.x}px`;
                    timerContainer.style.top  = `${this.timerPosition.y}px`;
                } catch {
                    timerContainer.style.right  = '20px';
                    timerContainer.style.bottom = '20px';
                }
                this.setupDraggableTimer(timerContainer);
            }
            this.startCountdown();
        } catch (error) {
            console.error('Timer init error:', error);
            const display = timerContainer.querySelector('.timer-display');
            if (display) display.textContent = '15:00';
        }
    }

    setupDraggableTimer(container) {
        const timerWidget = container.querySelector('.timer-widget');
        if (!timerWidget) return;

        timerWidget.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            container.classList.add('dragging');
            const rect = container.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            document.addEventListener('mousemove', this._onMouseMove = this.handleDrag.bind(this));
            document.addEventListener('mouseup',   this._onMouseUp   = this.stopDrag.bind(this));
        });

        timerWidget.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            container.classList.add('dragging');
            const touch = e.touches[0];
            const rect  = container.getBoundingClientRect();
            this.dragOffset.x = touch.clientX - rect.left;
            this.dragOffset.y = touch.clientY - rect.top;
            document.addEventListener('touchmove', this._onTouchMove = this.handleTouchDrag.bind(this));
            document.addEventListener('touchend',  this._onTouchEnd  = this.stopDrag.bind(this));
        });
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        const container = document.querySelector('.timer-container');
        if (!container) return;
        this.timerPosition.x = e.clientX - this.dragOffset.x;
        this.timerPosition.y = e.clientY - this.dragOffset.y;
        container.style.left = `${this.timerPosition.x}px`;
        container.style.top  = `${this.timerPosition.y}px`;
    }

    handleTouchDrag(e) {
        if (!this.isDragging || !e.touches[0]) return;
        const container = document.querySelector('.timer-container');
        if (!container) return;
        const touch = e.touches[0];
        this.timerPosition.x = touch.clientX - this.dragOffset.x;
        this.timerPosition.y = touch.clientY - this.dragOffset.y;
        container.style.left = `${this.timerPosition.x}px`;
        container.style.top  = `${this.timerPosition.y}px`;
    }

    stopDrag() {
        this.isDragging = false;
        const container = document.querySelector('.timer-container');
        if (container) container.classList.remove('dragging');
        try { localStorage.setItem('grantappTimerPosition', JSON.stringify(this.timerPosition)); } catch {}
        // Clean up listeners using saved references
        if (this._onMouseMove) { document.removeEventListener('mousemove', this._onMouseMove); this._onMouseMove = null; }
        if (this._onMouseUp)   { document.removeEventListener('mouseup',   this._onMouseUp);   this._onMouseUp   = null; }
        if (this._onTouchMove) { document.removeEventListener('touchmove', this._onTouchMove); this._onTouchMove = null; }
        if (this._onTouchEnd)  { document.removeEventListener('touchend',  this._onTouchEnd);  this._onTouchEnd  = null; }
    }

    startCountdown() {
        const display     = document.querySelector('.timer-display');
        const progressBar = document.querySelector('.timer-progress-bar');
        const container   = document.querySelector('.timer-container');

        if (!display) { console.warn('Timer display not found'); return; }

        const totalSeconds = this.timeLeft;

        const updateTimer = () => {
            try {
                if (this.timeLeft <= 0) {
                    display.textContent = '00:00';
                    if (progressBar) progressBar.style.width = '0%';
                    if (container)   container.classList.add('timer-critical');
                    clearInterval(this.timerInterval);
                    return;
                }
                this.timeLeft--;
                const minutes = Math.floor(this.timeLeft / 60);
                const seconds = this.timeLeft % 60;
                display.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;

                if (progressBar) {
                    progressBar.style.width = `${(this.timeLeft / totalSeconds) * 100}%`;
                }
                if (container) {
                    container.classList.remove('timer-safe','timer-warning','timer-critical');
                    if (minutes >= 10)      container.classList.add('timer-safe');
                    else if (minutes >= 5)  container.classList.add('timer-warning');
                    else                    container.classList.add('timer-critical');
                }
            } catch (error) {
                console.error('Timer update error:', error);
                clearInterval(this.timerInterval);
            }
        };

        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    // ── Navigation ────────────────────────────────────────────

    // Used by index.html stream cards (inline onclick or data-stream)
    selectStream(stream) {
        if (!stream) { this.showError('Please select a valid stream'); return; }
        try {
            this.showLoading();
            localStorage.setItem('selectedStream', stream);
            setTimeout(() => {
                window.location.href = `${stream}_clusters.html`;
            }, 1000);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
        }
    }

    // Used by science_clusters.html data-cluster buttons (shortcode format)
    // Shortcode → actual generated quiz filename mapping
    selectCluster(cluster) {
        if (!cluster) { this.showError('Please select a valid cluster'); return; }

        const clusterMap = {
            'mepc': 'science-cluster-a',
            'bepc': 'science-cluster-b'
        };

        const filename = clusterMap[cluster] || cluster;
        this.launchQuiz(filename);
    }

    // Used by art_clusters.html + commercial_clusters.html inline onclick buttons
    // name already matches quiz-{name}.html convention exactly
    launchQuiz(name) {
        if (!name) { this.showError('Please select a valid quiz'); return; }
        try {
            this.showLoading();
            localStorage.setItem('selectedQuiz', name);
            setTimeout(() => {
                window.location.href = `quiz-${name}.html`;
            }, 800);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to load quiz. Please try again.');
        }
    }

    // ── Loading overlay ───────────────────────────────────────
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
            try { localStorage.setItem('grantappLoading', 'true'); } catch {}
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('active');
            try { localStorage.removeItem('grantappLoading'); } catch {}
        }
    }

    checkBackNavigation() {
        try {
            if (localStorage.getItem('grantappLoading') === 'true') {
                setTimeout(() => this.hideLoading(), 500);
            }
        } catch { this.hideLoading(); }
    }

    // ── Background ────────────────────────────────────────────
    initBackgroundParticles() {
        const bg = document.querySelector('.animated-bg');
        if (!bg) return;
        bg.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const particle     = document.createElement('div');
            particle.className = 'bg-particle';
            const size         = Math.random() * 120 + 60;
            particle.style.cssText = `
                width:${size}px; height:${size}px;
                top:${Math.random()*100}%; left:${Math.random()*100}%;
                animation-delay:${Math.random()*10}s;
                opacity:${Math.random()*0.08+0.02};
            `;
            bg.appendChild(particle);
        }
    }

    initializePlaceholders() {
        document.querySelectorAll('.stat-number').forEach(el => {
            const text = el.textContent.trim();
            if (text.includes('[COUNT]') || text.includes('[PERCENTAGE]')) {
                el.classList.add('placeholder-shimmer');
            }
        });
    }

    // ── Event Listeners ───────────────────────────────────────
    setupEventListeners() {
        try {
            this.initializePlaceholders();

            document.querySelectorAll('[data-stream]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectStream(btn.dataset.stream);
                });
            });

            document.querySelectorAll('[data-cluster]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectCluster(btn.dataset.cluster);
                });
            });

            document.querySelectorAll('[data-coming-soon]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showComingSoon(btn.dataset.comingSoon);
                });
            });

            document.querySelectorAll('[data-close-modal]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.closeModal(btn.dataset.closeModal);
                });
            });

            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) overlay.classList.add('hidden');
                });
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // ── Modals ────────────────────────────────────────────────
    showComingSoon(feature) {
        const msg = document.getElementById('coming-soon-message');
        if (msg) msg.textContent = `${feature} is coming soon! We're working hard to bring you this feature.`;
        this.showModal('coming-soon-modal');
    }

    showError(message) {
        const el = document.getElementById('error-message');
        if (el) el.textContent = message;
        this.showModal('error-modal');
    }

    handleFatalError(userMessage, error) {
        console.error('Fatal error:', error);
        this.showError(userMessage);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
        else console.warn(`Modal ${modalId} not found`);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    // ── Timer controls (for external use) ────────────────────
    resetTimer(minutes = 15) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = minutes * 60;
        this.startCountdown();
    }

    pauseTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    resumeTimer() {
        if (!this.timerInterval && this.timeLeft > 0) this.startCountdown();
    }
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.GrantApp = new GrantApp();
        window.GrantApp.init();

        // Expose launchQuiz globally so inline onclick attributes can reach it
        window.launchQuiz = (name) => window.GrantApp.launchQuiz(name);

        console.log('GrantApp initialized');
    } catch (error) {
        console.error('Failed to initialize GrantApp:', error);
        const div       = document.createElement('div');
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#EF4444;color:white;padding:1rem 2rem;border-radius:8px;z-index:9999;';
        div.textContent   = 'Unable to start the application. Please refresh the page.';
        document.body.appendChild(div);
    }
});

window.addEventListener('error',             (e) => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection',(e) => console.error('Unhandled rejection:', e.reason));
