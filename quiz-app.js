// quiz-app.js - UTME Quiz Interface Logic

// ─── Built-in sample questions — ALWAYS available as last resort ─────────────
// These are used silently if all network sources fail.
// Keep at least 4 questions per subject the app is likely to show.
const sampleQuestions = [
    {
        id: 1, subject: 'Physics',
        text: 'A body moving with constant velocity has:',
        options: { A: 'Zero acceleration', B: 'Constant acceleration', C: 'Increasing acceleration', D: 'Decreasing acceleration' },
        answer: 'A',
        explanation: 'Constant velocity means no change in speed or direction, so a = Δv/Δt = 0.',
        exception: 'Circular motion has constant speed but changing direction — it DOES have acceleration.'
    },
    {
        id: 2, subject: 'Physics',
        text: 'An object is thrown vertically upward. At its highest point:',
        options: { A: 'Velocity = 0, acceleration = 0', B: 'Velocity = 0, acceleration = g downward', C: 'Velocity = g, acceleration = 0', D: 'Both velocity and acceleration are maximum' },
        answer: 'B',
        explanation: 'At peak, v = 0 instantaneously, but gravity still acts (a = 9.8 m/s² downward).',
        exception: 'Acceleration is NOT zero at highest point — gravity never stops acting.'
    },
    {
        id: 3, subject: 'Mathematics',
        text: 'If log₁₀ 2 = 0.3010, find log₁₀ 8',
        options: { A: '0.6020', B: '0.9030', C: '1.2040', D: '2.4080' },
        answer: 'B',
        explanation: 'log 8 = log 2³ = 3 × 0.3010 = 0.9030',
        exception: ''
    },
    {
        id: 4, subject: 'Mathematics',
        text: 'Solve: x² − 5x + 6 = 0',
        options: { A: 'x = 2 or x = 3', B: 'x = −2 or x = −3', C: 'x = 1 or x = 6', D: 'x = −1 or x = −6' },
        answer: 'A',
        explanation: 'Factor: (x − 2)(x − 3) = 0, so x = 2 or x = 3.',
        exception: ''
    },
    {
        id: 5, subject: 'English',
        text: 'Choose the word OPPOSITE in meaning to "ubiquitous"',
        options: { A: 'Rare', B: 'Common', C: 'Frequent', D: 'Universal' },
        answer: 'A',
        explanation: 'Ubiquitous means present everywhere; its antonym is rare.',
        exception: ''
    },
    {
        id: 6, subject: 'English',
        text: 'Identify the dangling modifier: "Walking home, the rain started"',
        options: { A: 'Walking home', B: 'the rain started', C: 'home', D: 'No error' },
        answer: 'A',
        explanation: '"Walking home" has no logical subject — the rain cannot walk home.',
        exception: ''
    },
    {
        id: 7, subject: 'Chemistry',
        text: 'The pH of 0.01 M HCl is:',
        options: { A: '1', B: '2', C: '12', D: '13' },
        answer: 'B',
        explanation: 'pH = −log[H⁺] = −log(0.01) = −log(10⁻²) = 2',
        exception: ''
    },
    {
        id: 8, subject: 'Chemistry',
        text: 'Noble gases are unreactive because:',
        options: { A: 'They are gases', B: 'Full valence shell (stable octet)', C: 'High atomic mass', D: 'Low ionization energy' },
        answer: 'B',
        explanation: 'A complete outer electron shell gives noble gases exceptional stability.',
        exception: ''
    }
];

// ─── Quiz State ───────────────────────────────────────────────────────────────
class QuizState {
    constructor(questions, duration) {
        this.questions            = questions;
        this.duration             = duration;
        this.timeRemaining        = duration;
        this.currentQuestionIndex = 0;
        this.userAnswers          = {};
        this.flaggedQuestions     = new Set();
        this.startTime            = Date.now();
        this.timerInterval        = null;
        this.isSubmitted          = false;
    }

    getCurrentQuestion() { return this.questions[this.currentQuestionIndex]; }
    setAnswer(id, opt)   { this.userAnswers[id] = opt; }
    getAnswer(id)        { return this.userAnswers[id]; }
    clearAnswer(id)      { delete this.userAnswers[id]; }
    isFlagged(id)        { return this.flaggedQuestions.has(id); }

    toggleFlag(id) {
        this.flaggedQuestions.has(id)
            ? this.flaggedQuestions.delete(id)
            : this.flaggedQuestions.add(id);
    }

    goToQuestion(i) {
        if (i >= 0 && i < this.questions.length) { this.currentQuestionIndex = i; return true; }
        return false;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) { this.currentQuestionIndex++; return true; }
        return false;
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; return true; }
        return false;
    }

    getAnsweredCount()  { return Object.keys(this.userAnswers).length; }
    getUnansweredCount(){ return this.questions.length - this.getAnsweredCount(); }
    getFlaggedCount()   { return this.flaggedQuestions.size; }

    getScore() {
        let correct = 0;
        for (const q of this.questions) {
            if (this.userAnswers[q.id] === q.answer) correct++;
        }
        return { correct, total: this.questions.length, percentage: (correct / this.questions.length) * 100 };
    }

    startTimer(onTick, onComplete) {
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            if (onTick)     onTick(this.timeRemaining);
            if (this.timeRemaining <= 0) { this.stopTimer(); if (onComplete) onComplete(); }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    formatTime(s) {
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    }
}

// ─── Quiz UI ──────────────────────────────────────────────────────────────────
class QuizUI {
    constructor(quizState) {
        this.state    = quizState;
        this.elements = this._cacheElements();
        this._attachEventListeners();
        this.render();
        this._startTimer();
    }

    _cacheElements() {
        const g = id => document.getElementById(id);
        return {
            subjectName:          g('subjectName'),
            currentQuestionNum:   g('currentQuestionNum'),
            totalQuestions:       g('totalQuestions'),
            timerDisplay:         g('timerDisplay'),
            timerProgressCircle:  g('timerProgressCircle'),
            sidebar:              g('quizSidebar'),
            questionPalette:      g('questionPalette'),
            answeredCount:        g('answeredCount'),
            unansweredCount:      g('unansweredCount'),
            flaggedCount:         g('flaggedCount'),
            questionCard:         g('questionCard'),
            questionNumber:       g('questionNumber'),
            questionText:         g('questionText'),
            optionsContainer:     g('optionsContainer'),
            questionExplanation:  g('questionExplanation'),
            explanationContent:   g('explanationContent'),
            prevBtn:              g('prevBtn'),
            nextBtn:              g('nextBtn'),
            clearBtn:             g('clearBtn'),
            flagBtn:              g('flagBtn'),
            menuBtn:              g('menuBtn'),
            closeSidebar:         g('closeSidebar'),
            mobilePaletteBtn:     g('mobilePaletteBtn'),
            submitBtn:            g('submitBtn'),
            calculatorBtn:        g('calculatorBtn'),
            submitModal:          g('submitModal'),
            closeSubmitModal:     g('closeSubmitModal'),
            cancelSubmitBtn:      g('cancelSubmitBtn'),
            confirmSubmitBtn:     g('confirmSubmitBtn'),
            calculatorModal:      g('calculatorModal'),
            closeCalculatorModal: g('closeCalculatorModal'),
            timeUpModal:          g('timeUpModal'),
            viewResultsBtn:       g('viewResultsBtn')
        };
    }

    _attachEventListeners() {
        const e = this.elements;
        e.prevBtn.addEventListener('click',          () => this._handlePrevious());
        e.nextBtn.addEventListener('click',          () => this._handleNext());
        e.clearBtn.addEventListener('click',         () => this._handleClearAnswer());
        e.flagBtn.addEventListener('click',          () => this._handleToggleFlag());
        e.menuBtn.addEventListener('click',          () => this._toggleSidebar());
        e.closeSidebar.addEventListener('click',     () => this._toggleSidebar());
        e.mobilePaletteBtn.addEventListener('click', () => this._toggleSidebar());
        e.submitBtn.addEventListener('click',        () => this._showSubmitModal());
        e.closeSubmitModal.addEventListener('click', () => this._hideSubmitModal());
        e.cancelSubmitBtn.addEventListener('click',  () => this._hideSubmitModal());
        e.confirmSubmitBtn.addEventListener('click', () => this._handleSubmit());
        e.calculatorBtn.addEventListener('click',    () => this._showCalculatorModal());
        e.closeCalculatorModal.addEventListener('click', () => this._hideCalculatorModal());
        e.viewResultsBtn.addEventListener('click',   () => this._showResults());

        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', ev => this._handleCalculator(ev));
        });

        document.addEventListener('keydown', ev => this._handleKeyboard(ev));
    }

    render() {
        this._renderHeader();
        this._renderQuestionPalette();
        this._renderQuestion();
        this._renderStats();
    }

    _renderHeader() {
        const q = this.state.getCurrentQuestion();
        if (this.elements.subjectName)        this.elements.subjectName.textContent        = q.subject;
        if (this.elements.currentQuestionNum) this.elements.currentQuestionNum.textContent = this.state.currentQuestionIndex + 1;
        if (this.elements.totalQuestions)     this.elements.totalQuestions.textContent     = this.state.questions.length;
    }

    _renderQuestionPalette() {
        if (!this.elements.questionPalette) return;
        this.elements.questionPalette.innerHTML = '';
        this.state.questions.forEach((q, i) => {
            const btn = document.createElement('button');
            btn.className   = 'palette-btn';
            btn.textContent = i + 1;
            if (i === this.state.currentQuestionIndex) btn.classList.add('current');
            else if (this.state.getAnswer(q.id))       btn.classList.add('answered');
            if (this.state.isFlagged(q.id))            btn.classList.add('flagged');
            btn.addEventListener('click', () => {
                this.state.goToQuestion(i);
                this.render();
                this._closeSidebarOnMobile();
            });
            this.elements.questionPalette.appendChild(btn);
        });
    }

    _renderQuestion() {
        const q = this.state.getCurrentQuestion();
        if (this.elements.questionNumber) this.elements.questionNumber.textContent = this.state.currentQuestionIndex + 1;
        if (this.elements.questionText)   this.elements.questionText.textContent   = q.text;

        if (this.elements.optionsContainer) {
            this.elements.optionsContainer.innerHTML = '';
            ['A','B','C','D'].forEach(label => {
                if (!q.options[label]) return;
                const opt = document.createElement('div');
                opt.className = 'option';
                if (this.state.getAnswer(q.id) === label) opt.classList.add('selected');
                opt.innerHTML = `<div class="option-label">${label}</div><div class="option-text">${q.options[label]}</div>`;
                opt.addEventListener('click', () => this._handleSelectOption(label));
                this.elements.optionsContainer.appendChild(opt);
            });
        }

        // Flag button state
        const flagged = this.state.isFlagged(q.id);
        if (this.elements.flagBtn) {
            this.elements.flagBtn.classList.toggle('flagged', flagged);
            const icon = this.elements.flagBtn.querySelector('i');
            if (icon) { icon.classList.toggle('fas', flagged); icon.classList.toggle('far', !flagged); }
        }

        if (this.elements.prevBtn) this.elements.prevBtn.disabled = this.state.currentQuestionIndex === 0;
        if (this.elements.nextBtn) {
            this.elements.nextBtn.innerHTML = this.state.currentQuestionIndex === this.state.questions.length - 1
                ? '<i class="fas fa-check"></i> Review & Submit'
                : 'Next <i class="fas fa-arrow-right"></i>';
        }

        if (this.elements.questionCard) this.elements.questionCard.scrollTop = 0;
    }

    _renderStats() {
        if (this.elements.answeredCount)   this.elements.answeredCount.textContent   = this.state.getAnsweredCount();
        if (this.elements.unansweredCount) this.elements.unansweredCount.textContent = this.state.getUnansweredCount();
        if (this.elements.flaggedCount)    this.elements.flaggedCount.textContent    = this.state.getFlaggedCount();
    }

    _startTimer() {
        this.state.startTimer(
            t  => this._updateTimer(t),
            () => this._handleTimeUp()
        );
    }

    _updateTimer(t) {
        if (this.elements.timerDisplay) this.elements.timerDisplay.textContent = this.state.formatTime(t);
        if (this.elements.timerProgressCircle) {
            const circ = 163.36;
            this.elements.timerProgressCircle.style.strokeDashoffset = circ - (t / this.state.duration) * circ;
        }
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.classList.toggle('warning', t <= 300 && t > 60);
            this.elements.timerDisplay.classList.toggle('danger',  t <= 60);
        }
    }

    _handleSelectOption(option) {
        this.state.setAnswer(this.state.getCurrentQuestion().id, option);
        this.render();
    }

    _handleClearAnswer()  { this.state.clearAnswer(this.state.getCurrentQuestion().id); this.render(); }
    _handleToggleFlag()   { this.state.toggleFlag(this.state.getCurrentQuestion().id);  this.render(); }
    _handlePrevious()     { if (this.state.prevQuestion()) this.render(); }
    _handleNext() {
        if (this.state.currentQuestionIndex === this.state.questions.length - 1) this._showSubmitModal();
        else if (this.state.nextQuestion()) this.render();
    }

    _handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const map = { ArrowLeft: () => this._handlePrevious(), ArrowRight: () => this._handleNext(),
                      f: () => this._handleToggleFlag(), F: () => this._handleToggleFlag(),
                      a: () => this._handleSelectOption('A'), A: () => this._handleSelectOption('A'),
                      b: () => this._handleSelectOption('B'), B: () => this._handleSelectOption('B'),
                      c: () => this._handleSelectOption('C'), C: () => this._handleSelectOption('C'),
                      d: () => this._handleSelectOption('D'), D: () => this._handleSelectOption('D'),
                      Escape: () => { this._hideSubmitModal(); this._hideCalculatorModal(); } };
        if (map[e.key]) { e.preventDefault(); map[e.key](); }
    }

    _toggleSidebar()       { if (this.elements.sidebar) this.elements.sidebar.classList.toggle('open'); }
    _closeSidebarOnMobile(){ if (window.innerWidth <= 1024 && this.elements.sidebar) this.elements.sidebar.classList.remove('open'); }

    _showSubmitModal() {
        const g = id => document.getElementById(id);
        const el = (id, val) => { const e = g(id); if (e) e.textContent = val; };
        el('modalTotalQuestions', this.state.questions.length);
        el('modalAnsweredCount',  this.state.getAnsweredCount());
        el('modalUnansweredCount',this.state.getUnansweredCount());
        el('modalTimeRemaining',  this.state.formatTime(this.state.timeRemaining));
        if (this.elements.submitModal) this.elements.submitModal.classList.remove('hidden');
    }

    _hideSubmitModal()    { if (this.elements.submitModal)    this.elements.submitModal.classList.add('hidden'); }
    _showCalculatorModal(){ if (this.elements.calculatorModal) this.elements.calculatorModal.classList.remove('hidden'); }
    _hideCalculatorModal(){ if (this.elements.calculatorModal) this.elements.calculatorModal.classList.add('hidden'); }

    _handleCalculator(e) {
        const btn     = e.currentTarget;
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        const value  = btn.dataset.value;
        const action = btn.dataset.action;
        if (value) {
            display.value = display.value === '0' ? value : display.value + value;
        } else if (action) {
            switch (action) {
                case 'clear':    display.value = '0'; break;
                case 'delete':   display.value = display.value.slice(0,-1) || '0'; break;
                case 'add':      display.value += ' + '; break;
                case 'subtract': display.value += ' - '; break;
                case 'multiply': display.value += ' * '; break;
                case 'divide':   display.value += ' / '; break;
                case 'equals':
                    try { display.value = String(eval(display.value)); }
                    catch { display.value = 'Error'; setTimeout(() => display.value = '0', 1000); }
                    break;
            }
        }
    }

    _handleSubmit() {
        this.state.isSubmitted = true;
        this.state.stopTimer();
        this._hideSubmitModal();
        this._showResults();
    }

    _handleTimeUp() {
        this.state.isSubmitted = true;
        if (this.elements.timeUpModal) this.elements.timeUpModal.classList.remove('hidden');
    }

    _showResults() {
        const score = this.state.getScore();
        // TODO: navigate to a proper results page when ready
        alert(`Quiz Complete!\n\nScore: ${score.correct}/${score.total} (${score.percentage.toFixed(1)}%)`);
        window.location.reload();
    }
}

// ─── Initialisation ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.cursor = 'wait';

    let questions = [];

    try {
        const launcher = new QuizLauncher();
        questions = await launcher.initializeFromUrl();
    } catch (err) {
        // QuizLauncher should never throw — but if it somehow does,
        // fall back to sampleQuestions silently. No error screen ever shown.
        console.error('QuizLauncher threw unexpectedly:', err);
        questions = sampleQuestions;
    }

    // Absolute floor — should be unreachable
    if (!questions || questions.length === 0) {
        questions = sampleQuestions;
    }

    // Derive timer duration from page metadata if available
    const timerSeconds = window.quizMetadata?.timerMinutes
        ? window.quizMetadata.timerMinutes * 60
        : QUIZ_CONFIG.duration;

    const quizState = new QuizState(questions, timerSeconds);
    const quizUI    = new QuizUI(quizState);     // eslint-disable-line no-unused-vars

    window.addEventListener('beforeunload', e => {
        if (!quizState.isSubmitted) { e.preventDefault(); e.returnValue = ''; return ''; }
    });

    document.body.style.cursor = 'default';
});
