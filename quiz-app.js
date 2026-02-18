// quiz-app.js - UTME Quiz Interface Logic

// ── Config fallback — quiz-launcher.js may set QUIZ_CONFIG before this runs ──
if (typeof QUIZ_CONFIG === 'undefined') {
    var QUIZ_CONFIG = {
        duration:   900,   // 15 minutes default (seconds)
        isCluster:  false
    };
}

// Question Data Parser
function parseQuestionFile(text, subject) {
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;
    let collectingExplanation = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (questionMatch) {
            if (currentQuestion) questions.push(currentQuestion);
            currentQuestion = {
                id: parseInt(questionMatch[1]),
                subject: subject,
                text: questionMatch[2],
                options: {},
                answer: null,
                explanation: null,
                exception: null
            };
            collectingExplanation = false;
            continue;
        }

        const optionMatch = line.match(/^([A-D])\.\s+(.+)$/);
        if (optionMatch && currentQuestion) {
            currentQuestion.options[optionMatch[1]] = optionMatch[2];
            continue;
        }

        if (line.startsWith('Answer:') && currentQuestion) {
            currentQuestion.answer = line.replace('Answer:', '').trim();
            continue;
        }

        if (line.startsWith('Explanation:') && currentQuestion) {
            currentQuestion.explanation = line.replace('Explanation:', '').trim();
            collectingExplanation = true;
            continue;
        }

        if (line.startsWith('Exception:') && currentQuestion) {
            currentQuestion.exception = line.replace('Exception:', '').trim();
            collectingExplanation = false;
            continue;
        }

        if (collectingExplanation && line && currentQuestion) {
            currentQuestion.explanation += ' ' + line;
        }
    }

    if (currentQuestion) questions.push(currentQuestion);
    return questions;
}

// Sample questions — active fallback when no questions load from network
const sampleQuestions = [
    {
        id: 1, subject: 'Physics',
        text: 'A body moving with constant velocity has:',
        options: { A: 'Zero acceleration', B: 'Constant acceleration', C: 'Increasing acceleration', D: 'Decreasing acceleration' },
        answer: 'A',
        explanation: 'Constant velocity means no change in speed or direction, so a = Δv/Δt = 0.'
    },
    {
        id: 2, subject: 'Physics',
        text: 'An object is thrown vertically upward. At its highest point:',
        options: { A: 'Velocity = 0, acceleration = 0', B: 'Velocity = 0, acceleration = g (downward)', C: 'Velocity = g, acceleration = 0', D: 'Both velocity and acceleration are maximum' },
        answer: 'B',
        explanation: 'At peak, v = 0 instantaneously, but gravity still acts (a = 9.8 m/s² downward).'
    },
    {
        id: 3, subject: 'Mathematics',
        text: 'If 2x + 3 = 11, what is x?',
        options: { A: '2', B: '3', C: '4', D: '5' },
        answer: 'C',
        explanation: '2x = 11 − 3 = 8, so x = 4.'
    },
    {
        id: 4, subject: 'English',
        text: 'Choose the word closest in meaning to "benevolent":',
        options: { A: 'Cruel', B: 'Kind', C: 'Lazy', D: 'Brave' },
        answer: 'B',
        explanation: 'Benevolent means well-meaning and kind.'
    },
    {
        id: 5, subject: 'Chemistry',
        text: 'What is the atomic number of Carbon?',
        options: { A: '4', B: '6', C: '8', D: '12' },
        answer: 'B',
        explanation: 'Carbon has 6 protons, so its atomic number is 6.'
    },
    {
        id: 6, subject: 'Physics',
        text: 'Which of the following is a vector quantity?',
        options: { A: 'Speed', B: 'Distance', C: 'Velocity', D: 'Mass' },
        answer: 'C',
        explanation: 'Velocity has both magnitude and direction, making it a vector quantity.'
    },
    {
        id: 7, subject: 'Mathematics',
        text: 'What is the value of sin 30°?',
        options: { A: '0', B: '0.5', C: '√2/2', D: '1' },
        answer: 'B',
        explanation: 'sin 30° = 1/2 = 0.5 — a standard trigonometric value.'
    },
    {
        id: 8, subject: 'English',
        text: 'Identify the correctly spelled word:',
        options: { A: 'Accomodate', B: 'Accommodate', C: 'Acommodate', D: 'Acomodate' },
        answer: 'B',
        explanation: '"Accommodate" has two c\'s and two m\'s.'
    }
];

// ── Quiz State ────────────────────────────────────────────────────────────────
class QuizState {
    constructor(questions, duration) {
        this.questions        = questions;
        this.duration         = duration || QUIZ_CONFIG.duration;
        this.timeRemaining    = this.duration;
        this.currentQuestionIndex = 0;
        this.userAnswers      = {};
        this.flaggedQuestions = new Set();
        this.startTime        = Date.now();
        this.timerInterval    = null;
        this.isSubmitted      = false;
    }

    getCurrentQuestion()      { return this.questions[this.currentQuestionIndex]; }
    setAnswer(id, option)     { this.userAnswers[id] = option; }
    getAnswer(id)             { return this.userAnswers[id]; }
    clearAnswer(id)           { delete this.userAnswers[id]; }
    isFlagged(id)             { return this.flaggedQuestions.has(id); }
    getAnsweredCount()        { return Object.keys(this.userAnswers).length; }
    getUnansweredCount()      { return this.questions.length - this.getAnsweredCount(); }
    getFlaggedCount()         { return this.flaggedQuestions.size; }

    toggleFlag(id) {
        this.flaggedQuestions.has(id)
            ? this.flaggedQuestions.delete(id)
            : this.flaggedQuestions.add(id);
    }

    goToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentQuestionIndex = index;
            return true;
        }
        return false;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            return true;
        }
        return false;
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            return true;
        }
        return false;
    }

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
            if (onTick)              onTick(this.timeRemaining);
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
}

// ── UI Controller ─────────────────────────────────────────────────────────────
class QuizUI {
    constructor(quizState) {
        this.state     = quizState;
        // Detect cluster mode: set by quiz-launcher or quizMetadata
        this.isCluster = QUIZ_CONFIG.isCluster ||
                         (window.quizMetadata && window.quizMetadata.isCluster) ||
                         false;
        this.elements  = this.cacheElements();
        this.attachEventListeners();
        this.render();
        this.startTimer();
    }

    cacheElements() {
        return {
            subjectName:          document.getElementById('subjectName'),
            currentQuestionNum:   document.getElementById('currentQuestionNum'),
            totalQuestions:       document.getElementById('totalQuestions'),
            timerDisplay:         document.getElementById('timerDisplay'),
            timerProgressCircle:  document.getElementById('timerProgressCircle'),
            sidebar:              document.getElementById('quizSidebar'),
            questionPalette:      document.getElementById('questionPalette'),
            answeredCount:        document.getElementById('answeredCount'),
            unansweredCount:      document.getElementById('unansweredCount'),
            flaggedCount:         document.getElementById('flaggedCount'),
            questionCard:         document.getElementById('questionCard'),
            questionNumber:       document.getElementById('questionNumber'),
            questionText:         document.getElementById('questionText'),
            optionsContainer:     document.getElementById('optionsContainer'),
            questionExplanation:  document.getElementById('questionExplanation'),
            explanationContent:   document.getElementById('explanationContent'),
            prevBtn:              document.getElementById('prevBtn'),
            nextBtn:              document.getElementById('nextBtn'),
            clearBtn:             document.getElementById('clearBtn'),
            flagBtn:              document.getElementById('flagBtn'),
            menuBtn:              document.getElementById('menuBtn'),
            closeSidebar:         document.getElementById('closeSidebar'),
            mobilePaletteBtn:     document.getElementById('mobilePaletteBtn'),
            submitBtn:            document.getElementById('submitBtn'),
            calculatorBtn:        document.getElementById('calculatorBtn'),
            submitModal:          document.getElementById('submitModal'),
            closeSubmitModal:     document.getElementById('closeSubmitModal'),
            cancelSubmitBtn:      document.getElementById('cancelSubmitBtn'),
            confirmSubmitBtn:     document.getElementById('confirmSubmitBtn'),
            calculatorModal:      document.getElementById('calculatorModal'),
            closeCalculatorModal: document.getElementById('closeCalculatorModal'),
            timeUpModal:          document.getElementById('timeUpModal'),
            viewResultsBtn:       document.getElementById('viewResultsBtn')
        };
    }

    attachEventListeners() {
        // ── Navigation — the core fix ──────────────────────────────────────
        this.elements.prevBtn.addEventListener('click', () => this.handlePrevious());
        this.elements.nextBtn.addEventListener('click', () => this.handleNext());
        this.elements.clearBtn.addEventListener('click', () => this.handleClearAnswer());
        this.elements.flagBtn.addEventListener('click', () => this.handleToggleFlag());

        // Sidebar
        this.elements.menuBtn.addEventListener('click',        () => this.toggleSidebar());
        this.elements.closeSidebar.addEventListener('click',   () => this.toggleSidebar());
        if (this.elements.mobilePaletteBtn) {
            this.elements.mobilePaletteBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Submit
        this.elements.submitBtn.addEventListener('click',        () => this.showSubmitModal());
        this.elements.closeSubmitModal.addEventListener('click', () => this.hideSubmitModal());
        this.elements.cancelSubmitBtn.addEventListener('click',  () => this.hideSubmitModal());
        this.elements.confirmSubmitBtn.addEventListener('click', () => this.handleSubmit());

        // Calculator
        this.elements.calculatorBtn.addEventListener('click',        () => this.showCalculatorModal());
        this.elements.closeCalculatorModal.addEventListener('click', () => this.hideCalculatorModal());
        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCalculator(e));
        });

        // Results
        this.elements.viewResultsBtn.addEventListener('click', () => this.showResults());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    render() {
        this.renderHeader();
        this.renderQuestionPalette();
        this.renderQuestion();
        this.renderStats();
    }

    renderHeader() {
        const q = this.state.getCurrentQuestion();
        this.elements.subjectName.textContent       = q.subject;
        this.elements.currentQuestionNum.textContent = this.state.currentQuestionIndex + 1;
        this.elements.totalQuestions.textContent     = this.state.questions.length;
    }

    renderQuestionPalette() {
        this.elements.questionPalette.innerHTML = '';
        this.state.questions.forEach((q, index) => {
            const btn = document.createElement('button');
            btn.className   = 'palette-btn';
            btn.textContent = index + 1;
            if (index === this.state.currentQuestionIndex) btn.classList.add('current');
            else if (this.state.getAnswer(q.id))           btn.classList.add('answered');
            if (this.state.isFlagged(q.id))                btn.classList.add('flagged');
            btn.addEventListener('click', () => {
                this.state.goToQuestion(index);
                this.render();
                this.closeSidebarOnMobile();
            });
            this.elements.questionPalette.appendChild(btn);
        });
    }

    renderQuestion() {
        const q = this.state.getCurrentQuestion();

        this.elements.questionNumber.textContent = this.state.currentQuestionIndex + 1;
        this.elements.questionText.textContent   = q.text;

        // Options
        this.elements.optionsContainer.innerHTML = '';
        ['A','B','C','D'].forEach(label => {
            if (!q.options[label]) return;
            const option = document.createElement('div');
            option.className = 'option';
            if (this.state.getAnswer(q.id) === label) option.classList.add('selected');
            option.innerHTML = `<div class="option-label">${label}</div><div class="option-text">${q.options[label]}</div>`;
            option.addEventListener('click', () => this.handleSelectOption(label));
            this.elements.optionsContainer.appendChild(option);
        });

        // Explanation — individual tests only, shown after answering
        if (this.elements.questionExplanation) {
            const answered = !!this.state.getAnswer(q.id);
            const hasExp   = !this.isCluster && q.explanation && answered;
            this.elements.questionExplanation.classList.toggle('hidden', !hasExp);
            if (hasExp && this.elements.explanationContent) {
                this.elements.explanationContent.textContent = q.explanation;
            }
        }

        // Flag button state
        const flagged = this.state.isFlagged(q.id);
        this.elements.flagBtn.classList.toggle('flagged', flagged);
        const flagIcon = this.elements.flagBtn.querySelector('i');
        if (flagIcon) {
            flagIcon.classList.toggle('fas', flagged);
            flagIcon.classList.toggle('far', !flagged);
        }

        // ── Previous button ───────────────────────────────────────────────
        this.elements.prevBtn.disabled = (this.state.currentQuestionIndex === 0);

        // ── Next button ───────────────────────────────────────────────────
        if (this.state.currentQuestionIndex === this.state.questions.length - 1) {
            this.elements.nextBtn.innerHTML = '<i class="fas fa-check"></i> Review & Submit';
        } else {
            this.elements.nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
        }

        this.elements.questionCard.scrollTop = 0;
    }

    renderStats() {
        this.elements.answeredCount.textContent   = this.state.getAnsweredCount();
        this.elements.unansweredCount.textContent = this.state.getUnansweredCount();
        this.elements.flaggedCount.textContent    = this.state.getFlaggedCount();
    }

    startTimer() {
        this.state.startTimer(
            (t) => this.updateTimer(t),
            ()  => this.handleTimeUp()
        );
    }

    updateTimer(t) {
        this.elements.timerDisplay.textContent = this.state.formatTime(t);
        const progress = (t / this.state.duration) * 163.36;
        if (this.elements.timerProgressCircle) {
            this.elements.timerProgressCircle.style.strokeDashoffset = 163.36 - progress;
        }
        this.elements.timerDisplay.classList.remove('warning','danger');
        if (t <= 300 && t > 60) this.elements.timerDisplay.classList.add('warning');
        else if (t <= 60)       this.elements.timerDisplay.classList.add('danger');
    }

    handleSelectOption(option) {
        this.state.setAnswer(this.state.getCurrentQuestion().id, option);
        this.render();
    }

    handleClearAnswer() {
        this.state.clearAnswer(this.state.getCurrentQuestion().id);
        this.render();
    }

    handleToggleFlag() {
        this.state.toggleFlag(this.state.getCurrentQuestion().id);
        this.render();
    }

    handlePrevious() {
        if (this.state.prevQuestion()) this.render();
    }

    handleNext() {
        if (this.state.currentQuestionIndex === this.state.questions.length - 1) {
            this.showSubmitModal();
        } else if (this.state.nextQuestion()) {
            this.render();
        }
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.key) {
            case 'ArrowLeft':  e.preventDefault(); this.handlePrevious(); break;
            case 'ArrowRight': e.preventDefault(); this.handleNext();     break;
            case 'a': case 'A': e.preventDefault(); this.handleSelectOption('A'); break;
            case 'b': case 'B': e.preventDefault(); this.handleSelectOption('B'); break;
            case 'c': case 'C': e.preventDefault(); this.handleSelectOption('C'); break;
            case 'd': case 'D': e.preventDefault(); this.handleSelectOption('D'); break;
            case 'f': case 'F': e.preventDefault(); this.handleToggleFlag(); break;
            case 'Escape': this.hideSubmitModal(); this.hideCalculatorModal(); break;
        }
    }

    toggleSidebar() { this.elements.sidebar.classList.toggle('open'); }

    closeSidebarOnMobile() {
        if (window.innerWidth <= 1024) this.elements.sidebar.classList.remove('open');
    }

    showSubmitModal() {
        document.getElementById('modalTotalQuestions').textContent  = this.state.questions.length;
        document.getElementById('modalAnsweredCount').textContent   = this.state.getAnsweredCount();
        document.getElementById('modalUnansweredCount').textContent = this.state.getUnansweredCount();
        document.getElementById('modalTimeRemaining').textContent   = this.state.formatTime(this.state.timeRemaining);
        this.elements.submitModal.classList.remove('hidden');
    }

    hideSubmitModal()     { this.elements.submitModal.classList.add('hidden'); }
    showCalculatorModal() { this.elements.calculatorModal.classList.remove('hidden'); }
    hideCalculatorModal() { this.elements.calculatorModal.classList.add('hidden'); }

    handleCalculator(e) {
        const btn     = e.currentTarget;
        const display = document.getElementById('calcDisplay');
        const value   = btn.dataset.value;
        const action  = btn.dataset.action;
        if (value) {
            display.value = display.value === '0' ? value : display.value + value;
        } else if (action) {
            switch (action) {
                case 'clear':    display.value = '0'; break;
                case 'delete':   display.value = display.value.slice(0,-1) || '0'; break;
                case 'add': case 'subtract': case 'multiply': case 'divide':
                    display.value += ' ' + btn.textContent + ' '; break;
                case 'equals':
                    try {
                        const expr = display.value.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
                        display.value = eval(expr);
                    } catch { display.value = 'Error'; setTimeout(() => display.value = '0', 1000); }
                    break;
            }
        }
    }

    handleSubmit() {
        this.state.isSubmitted = true;
        this.state.stopTimer();
        this.hideSubmitModal();
        this.showResults();
    }

    handleTimeUp() {
        this.state.isSubmitted = true;
        document.getElementById('timeUpModal').classList.remove('hidden');
    }

    showResults() {
        const score = this.state.getScore();
        alert(`Quiz Complete!\n\nScore: ${score.correct}/${score.total} (${score.percentage.toFixed(1)}%)`);
        window.location.reload();
    }
}

// ── Initialise ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        document.body.style.cursor = 'wait';

        let questions = [];

        // 1. Try quiz-launcher.js chain
        if (typeof QuizLauncher !== 'undefined') {
            const launcher = new QuizLauncher();
            questions = await launcher.initializeFromUrl();
        }

        // 2. Try window.quizData (embedded by workflow)
        if (!questions || questions.length === 0) {
            if (window.quizData && window.quizData.length > 0) {
                questions = window.quizData;
            }
        }

        // 3. Ultimate fallback — sampleQuestions (always works)
        if (!questions || questions.length === 0) {
            console.warn('No questions from launcher or embedded data — using sampleQuestions');
            questions = sampleQuestions;
        }

        // Set duration from metadata if available
        const duration = (window.quizMetadata && window.quizMetadata.timerMinutes)
            ? window.quizMetadata.timerMinutes * 60
            : QUIZ_CONFIG.duration;

        const quizState = new QuizState(questions, duration);
        const quizUI    = new QuizUI(quizState);

        window.addEventListener('beforeunload', (e) => {
            if (!quizState.isSubmitted) { e.preventDefault(); e.returnValue = ''; return ''; }
        });

        document.body.style.cursor = 'default';

    } catch (error) {
        console.error('Quiz init error:', error);
        document.body.style.cursor = 'default';

        // Last-ditch fallback — load sample questions rather than showing error screen
        try {
            const quizState = new QuizState(sampleQuestions, QUIZ_CONFIG.duration);
            new QuizUI(quizState);
        } catch (fallbackError) {
            // Only now show a minimal non-destructive banner (never replace body)
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#ef4444;color:white;padding:.75rem 1.5rem;border-radius:8px;z-index:9999;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.2)';
            banner.textContent = 'Could not load quiz. Please refresh.';
            document.body.appendChild(banner);
        }
    }
});
