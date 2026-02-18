// GrantApp AI - Reconciled JavaScript with Anti-Silent-Failure

class GrantApp {
    constructor() {
        this.timerInterval = null;
        this.timeLeft = 15 * 60;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.timerPosition = { x: 20, y: 100 };
        this.initialized = false;
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

    initTimer() {
        const timerContainer = document.querySelector('.timer-container');
        const timerWidget = document.querySelector('.timer-widget');
        if (!timerContainer || !timerWidget) return;

        try {
            if (!timerContainer.classList.contains('quiz')) {
                try {
                    const saved = localStorage.getItem('grantappTimerPosition');
                    if (saved) {
                        const pos = JSON.parse(saved);
                        this.timerPosition.x = Math.min(Math.max(0, pos.x), window.innerWidth - 200);
                        this.timerPosition.y = Math.min(Math.max(60, pos.y), window.innerHeight - 200);
                    } else {
                        this.timerPosition.x = window.innerWidth - 220;
                        this.timerPosition.y = window.innerHeight - 180;
                    }
                    timerContainer.style.left = `${this.timerPosition.x}px`;
                    timerContainer.style.top = `${this.timerPosition.y}px`;
                } catch (e) {
                    timerContainer.style.right = '20px';
                    timerContainer.style.bottom = '20px';
                }
                this.setupDraggableTimer(timerContainer);
            }
            this.startCountdown();
        } catch (error) {
            console.error('Timer initialization error:', error);
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
            document.addEventListener('mousemove', this._boundDrag = this.handleDrag.bind(this));
            document.addEventListener('mouseup', this._boundStop = this.stopDrag.bind(this));
        });
        timerWidget.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            container.classList.add('dragging');
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            this.dragOffset.x = touch.clientX - rect.left;
            this.dragOffset.y = touch.clientY - rect.top;
            document.addEventListener('touchmove', this._boundTouchDrag = this.handleTouchDrag.bind(this));
            document.addEventListener('touchend', this._boundStop = this.stopDrag.bind(this));
        });
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        const container = document.querySelector('.timer-container');
        if (!container) return;
        this.timerPosition.x = e.clientX - this.dragOffset.x;
        this.timerPosition.y = e.clientY - this.dragOffset.y;
        container.style.left = `${this.timerPosition.x}px`;
        container.style.top = `${this.timerPosition.y}px`;
    }

    handleTouchDrag(e) {
        if (!this.isDragging || !e.touches[0]) return;
        const container = document.querySelector('.timer-container');
        if (!container) return;
        const touch = e.touches[0];
        this.timerPosition.x = touch.clientX - this.dragOffset.x;
        this.timerPosition.y = touch.clientY - this.dragOffset.y;
        container.style.left = `${this.timerPosition.x}px`;
        container.style.top = `${this.timerPosition.y}px`;
    }

    stopDrag() {
        this.isDragging = false;
        const container = document.querySelector('.timer-container');
        if (container) container.classList.remove('dragging');
        try { localStorage.setItem('grantappTimerPosition', JSON.stringify(this.timerPosition)); } catch(e) {}
        if (this._boundDrag) document.removeEventListener('mousemove', this._boundDrag);
        if (this._boundTouchDrag) document.removeEventListener('touchmove', this._boundTouchDrag);
        if (this._boundStop) {
            document.removeEventListener('mouseup', this._boundStop);
            document.removeEventListener('touchend', this._boundStop);
        }
    }

    startCountdown() {
        const display = document.querySelector('.timer-display');
        const progressBar = document.querySelector('.timer-progress-bar');
        const container = document.querySelector('.timer-container');
        if (!display) return;

        const updateTimer = () => {
            if (this.timeLeft <= 0) {
                display.textContent = '00:00';
                if (progressBar) progressBar.style.width = '0%';
                if (container) container.classList.add('timer-critical');
                clearInterval(this.timerInterval);
                if (document.querySelector('.timer-container.quiz')) this.submitTest();
                return;
            }
            this.timeLeft--;
            const m = Math.floor(this.timeLeft / 60);
            const s = this.timeLeft % 60;
            display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (progressBar) progressBar.style.width = `${(this.timeLeft / (15 * 60)) * 100}%`;
            if (container) {
                container.classList.remove('timer-safe', 'timer-warning', 'timer-critical');
                container.classList.add(m >= 10 ? 'timer-safe' : m >= 5 ? 'timer-warning' : 'timer-critical');
            }
        };
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    // ── Cluster routing ──────────────────────────────────────────────────────
    // Maps cluster codes to generated quiz files / URL params
    getQuizUrl(cluster) {
        const map = {
            // Science
            'mepc': 'quiz.html?stream=science&cluster=0',   // Math/Eng/Phy/Chem
            'bepc': 'quiz.html?stream=science&cluster=1',   // Bio/Eng/Phy/Chem
            // Arts
            'elgc': 'quiz.html?stream=art&cluster=0',       // Eng/Lit/Gov/CRS
            // Commercial
            'eace': 'quiz.html?stream=commercial&cluster=0',// Eng/Acc/Com/Econ
            'emeg': 'quiz.html?stream=commercial&cluster=1',// Eng/Math/Econ/Gov
            // Single subjects (used by subject-specific buttons)
            'mathematics': 'quiz-mathematics.html',
            'physics':     'quiz-physics.html',
            'chemistry':   'quiz-chemistry.html',
            'english':     'quiz-english.html',
            'biology':     'quiz-biology.html',
            'accounting':  'quiz-accounting.html',
        };
        return map[cluster] || null;
    }

    selectStream(stream) {
        if (!stream) { this.showError('Please select a valid stream'); return; }
        try {
            this.showLoading();
            setTimeout(() => {
                window.location.href = `${stream === 'art' ? 'art' : stream}_clusters.html`;
            }, 600);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
        }
    }

    selectCluster(cluster) {
        if (!cluster) { this.showError('Please select a valid cluster'); return; }
        try {
            const url = this.getQuizUrl(cluster);
            if (!url) { this.showError(`Quiz not found for cluster: ${cluster}`); return; }
            this.showLoading();
            setTimeout(() => { window.location.href = url; }, 600);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
        }
    }

    // ── Loading overlay ──────────────────────────────────────────────────────
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('active');
        try { localStorage.setItem('grantappLoading', 'true'); } catch(e) {}
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
        try { localStorage.removeItem('grantappLoading'); } catch(e) {}
    }

    // ✅ Handles bfcache restore (back button) — pageshow fires even when
    // DOMContentLoaded does not, so the overlay always clears on back navigation.
    checkBackNavigation() {
        // Clear any stale loading state immediately on init
        this.hideLoading();

        // Also handle bfcache: fires when page is restored from cache (back/forward)
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                // Page came from bfcache — DOM didn't re-run, overlay is still visible
                this.hideLoading();
            }
        });
    }

    // ── UI helpers ───────────────────────────────────────────────────────────
    initBackgroundParticles() {
        const bg = document.querySelector('.animated-bg');
        if (!bg) return;
        bg.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            p.className = 'bg-particle';
            const size = Math.random() * 120 + 60;
            p.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;animation-delay:${Math.random()*10}s;opacity:${Math.random()*0.08+0.02}`;
            bg.appendChild(p);
        }
    }

    initializePlaceholders() {
        document.querySelectorAll('.stat-number').forEach(el => {
            if (el.textContent.includes('[COUNT]') || el.textContent.includes('[PERCENTAGE]')) {
                el.classList.add('placeholder-shimmer');
            }
        });
    }

    setupEventListeners() {
        this.initializePlaceholders();

        document.querySelectorAll('[data-stream]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.selectStream(btn.dataset.stream); });
        });
        document.querySelectorAll('[data-cluster]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.selectCluster(btn.dataset.cluster); });
        });
        document.querySelectorAll('[data-coming-soon]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.showComingSoon(btn.dataset.comingSoon); });
        });
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.closeModal(btn.dataset.closeModal); });
        });
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
        });
    }

    showComingSoon(feature) {
        const msg = document.getElementById('coming-soon-message');
        if (msg) msg.textContent = `${feature} is coming soon!`;
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

    showModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('hidden');
    }

    closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
    }

    submitTest() {
        this.showError('Time is up! Your test has been submitted.');
    }

    resetTimer(minutes = 15) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = minutes * 60;
        this.startCountdown();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.GrantApp = new GrantApp();
        window.GrantApp.init();
    } catch (error) {
        console.error('Failed to initialize GrantApp:', error);
    }
});

window.addEventListener('error', (e) => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));
