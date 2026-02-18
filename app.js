// GrantApp AI - app.js

// ─── CLUSTER → FILE MAP ────────────────────────────────────────────────────
// Single source of truth. quiz-launcher.js also reads this via window.CLUSTER_FILE_MAP.
// Never construct filenames by string-concatenating cluster keys — use this map.
const CLUSTER_FILE_MAP = {
    // Science
    'science-a':    'quiz-science-cluster-a.html',
    'science-b':    'quiz-science-cluster-b.html',
    // Arts
    'arts-a':           'quiz-arts-cluster-a.html',
    'arts-b':           'quiz-arts-cluster-b.html',
    'arts-cluster-a':   'quiz-arts-cluster-a.html',
    'arts-cluster-b':   'quiz-arts-cluster-b.html',
    // Commercial
    'commercial-cluster-a': 'quiz-commercial-cluster-a.html',
    'commercial-cluster-b': 'quiz-commercial-cluster-b.html',
    'commercial-cluster-c': 'quiz-commercial-cluster-c.html',
    // Legacy keys — kept so old data-cluster values still work
    'mepc':  'quiz-science-cluster-a.html',
    'bepc':  'quiz-science-cluster-b.html',
};

// Expose for quiz-launcher.js
window.CLUSTER_FILE_MAP = CLUSTER_FILE_MAP;

// ─── STREAM → CLUSTERS PAGE MAP ───────────────────────────────────────────
const STREAM_FILE_MAP = {
    'science':    'science_clusters.html',
    'art':        'art_clusters.html',
    'arts':       'art_clusters.html',
    'commercial': 'commercial_clusters.html',
};

class GrantApp {
    constructor() {
        this.timerInterval  = null;
        this.timeLeft       = 15 * 60;
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

    // ── Timer ──────────────────────────────────────────────────────────────

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
                        this.timerPosition.x = Math.min(Math.max(0, pos.x),  maxX);
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

        const onMouseDown = (e) => {
            this.isDragging = true;
            container.classList.add('dragging');
            const rect = container.getBoundingClientRect();
            this.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            this.timerPosition = { x: e.clientX - this.dragOffset.x, y: e.clientY - this.dragOffset.y };
            container.style.left = `${this.timerPosition.x}px`;
            container.style.top  = `${this.timerPosition.y}px`;
        };
        const onMouseUp = () => {
            this.isDragging = false;
            container.classList.remove('dragging');
            try { localStorage.setItem('grantappTimerPosition', JSON.stringify(this.timerPosition)); } catch {}
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup',   onMouseUp);
        };

        const onTouchStart = (e) => {
            this.isDragging = true;
            container.classList.add('dragging');
            const touch = e.touches[0];
            const rect  = container.getBoundingClientRect();
            this.dragOffset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend',  onTouchEnd);
        };
        const onTouchMove = (e) => {
            if (!this.isDragging || !e.touches[0]) return;
            const touch = e.touches[0];
            this.timerPosition = { x: touch.clientX - this.dragOffset.x, y: touch.clientY - this.dragOffset.y };
            container.style.left = `${this.timerPosition.x}px`;
            container.style.top  = `${this.timerPosition.y}px`;
        };
        const onTouchEnd = () => {
            this.isDragging = false;
            container.classList.remove('dragging');
            try { localStorage.setItem('grantappTimerPosition', JSON.stringify(this.timerPosition)); } catch {}
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend',  onTouchEnd);
        };

        timerWidget.addEventListener('mousedown', onMouseDown);
        timerWidget.addEventListener('touchstart', onTouchStart);
    }

    startCountdown() {
        const display     = document.querySelector('.timer-display');
        const progressBar = document.querySelector('.timer-progress-bar');
        const container   = document.querySelector('.timer-container');

        if (!display) return;

        const updateTimer = () => {
            try {
                if (this.timeLeft <= 0) {
                    display.textContent = '00:00';
                    if (progressBar) progressBar.style.width = '0%';
                    if (container)   container.classList.add('timer-critical');
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
            } catch (e) {
                console.error('Timer update error:', e);
                clearInterval(this.timerInterval);
            }
        };

        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    // ── Navigation ─────────────────────────────────────────────────────────

    /**
     * Navigate to a stream's cluster-selection page.
     * stream: 'science' | 'art' | 'arts' | 'commercial'
     */
    selectStream(stream) {
        if (!stream) { this.showError('Please select a valid stream'); return; }
        try {
            this.showLoading();
            const dest = STREAM_FILE_MAP[stream] || `${stream}_clusters.html`;
            localStorage.setItem('selectedStream', stream);
            setTimeout(() => { window.location.href = dest; }, 600);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
            console.error('Stream selection error:', error);
        }
    }

    /**
     * Navigate to a quiz file using CLUSTER_FILE_MAP.
     * cluster: e.g. 'science-a', 'arts-a', 'commercial-cluster-b'
     *
     * Falls back through the same chain as quiz-launcher.js:
     *   1. CLUSTER_FILE_MAP lookup
     *   2. quiz-${cluster}.html (generic)
     *   3. quiz.html?cluster=${cluster} (last resort — quiz-app.js will load sampleQuestions)
     */
    selectCluster(cluster) {
        if (!cluster) { this.showError('Please select a valid cluster'); return; }
        try {
            this.showLoading();
            localStorage.setItem('selectedCluster', cluster);

            const dest = CLUSTER_FILE_MAP[cluster]
                      || `quiz-${cluster}.html`;

            setTimeout(() => { window.location.href = dest; }, 600);
        } catch (error) {
            this.hideLoading();
            this.showError('Unable to proceed. Please try again.');
            console.error('Cluster selection error:', error);
        }
    }

    // ── Loading state ───────────────────────────────────────────────────────

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('active');
        try { localStorage.setItem('grantappLoading', 'true'); } catch {}
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
        try { localStorage.removeItem('grantappLoading'); } catch {}
    }

    checkBackNavigation() {
        try {
            if (localStorage.getItem('grantappLoading') === 'true') {
                setTimeout(() => this.hideLoading(), 500);
            }
        } catch {
            this.hideLoading();
        }
    }

    // ── Background particles ────────────────────────────────────────────────

    initBackgroundParticles() {
        const bg = document.querySelector('.animated-bg');
        if (!bg) return;
        bg.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const p    = document.createElement('div');
            p.className = 'bg-particle';
            const size = Math.random() * 120 + 60;
            p.style.cssText = `
                width:${size}px; height:${size}px;
                top:${Math.random()*100}%;
                left:${Math.random()*100}%;
                animation-delay:${Math.random()*10}s;
                opacity:${(Math.random()*0.08+0.02).toFixed(3)};
            `;
            bg.appendChild(p);
        }
    }

    // ── Placeholders shimmer ────────────────────────────────────────────────

    initializePlaceholders() {
        document.querySelectorAll('.stat-number').forEach(el => {
            if (/\[(COUNT|PERCENTAGE)\]/.test(el.textContent)) {
                el.classList.add('placeholder-shimmer');
            }
        });
    }

    // ── Event listeners ─────────────────────────────────────────────────────

    setupEventListeners() {
        try {
            this.initializePlaceholders();

            document.querySelectorAll('[data-stream]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.selectStream(btn.dataset.stream);
                });
            });

            document.querySelectorAll('[data-cluster]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.selectCluster(btn.dataset.cluster);
                });
            });

            document.querySelectorAll('[data-coming-soon]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.showComingSoon(btn.dataset.comingSoon);
                });
            });

            document.querySelectorAll('[data-close-modal]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.closeModal(btn.dataset.closeModal);
                });
            });

            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', e => {
                    if (e.target === overlay) overlay.classList.add('hidden');
                });
            });
        } catch (error) {
            console.error('Event listener setup error:', error);
            this.showError('Some interactive features may not work properly. Please refresh the page.');
        }
    }

    // ── Modals & errors ─────────────────────────────────────────────────────

    showComingSoon(feature) {
        const msg = document.getElementById('coming-soon-message');
        if (msg) msg.textContent = `${feature} is coming soon! We're working hard to bring you this feature.`;
        this.showModal('coming-soon-modal');
    }

    showError(message) {
        try {
            const el = document.getElementById('error-message');
            if (el) el.textContent = message;
            this.showModal('error-modal');
        } catch {
            alert(message);
        }
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

    // ── Quiz helpers ────────────────────────────────────────────────────────

    submitTest() {
        console.log('Auto-submitting test (time up)');
        this.showError('Time is up! Your test has been submitted.');
    }

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

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.GrantApp = new GrantApp();
        window.GrantApp.init();
    } catch (error) {
        console.error('Failed to initialise GrantApp:', error);
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#EF4444;color:white;padding:1rem 2rem;border-radius:8px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15)';
        div.textContent   = 'Unable to start the application. Please refresh the page.';
        document.body.appendChild(div);
    }
});

window.addEventListener('error',              e => console.error('Global error:',   e.error));
window.addEventListener('unhandledrejection', e => console.error('Unhandled rejection:', e.reason));
