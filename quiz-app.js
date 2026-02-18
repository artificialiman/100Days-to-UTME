// quiz-app.js - UTME Quiz Interface Logic

// ─────────────────────────────────────────────────────────
// Data Normaliser
// Converts parser.py format { optionA, optionB, optionC, optionD }
// to the internal format { options: {A,B,C,D} } that QuizState/QuizUI expect.
// Also applies subject from metadata and carries explanation/exception if present.
// ─────────────────────────────────────────────────────────
function normalizeQuestions(rawQuestions, subject) {
    return rawQuestions.map(q => ({
        id:          q.id,
        subject:     q.subject || subject || 'General',
        text:        q.text,
        options: {
            A: q.optionA || (q.options && q.options['A']) || '',
            B: q.optionB || (q.options && q.options['B']) || '',
            C: q.optionC || (q.options && q.options['C']) || '',
            D: q.optionD || (q.options && q.options['D']) || ''
        },
        answer:      q.answer,
        explanation: q.explanation || '',
        exception:   q.exception   || ''
    }));
}


// ─────────────────────────────────────────────────────────
// Quiz State
// ─────────────────────────────────────────────────────────
class QuizState {
    constructor(questions, duration) {
        this.questions          = questions;
        this.duration           = duration;
        this.timeRemaining      = duration;
        this.currentQuestionIndex = 0;
        this.userAnswers        = {};
        this.flaggedQuestions   = new Set();
        this.startTime          = Date.now();
        this.timerInterval      = null;
        this.isSubmitted        = false;
    }

    getCurrentQuestion() { return this.questions[this.currentQuestionIndex]; }

    setAnswer(questionId, option)  { this.userAnswers[questionId] = option; }
    getAnswer(questionId)          { return this.userAnswers[questionId]; }
    clearAnswer(questionId)        { delete this.userAnswers[questionId]; }

    toggleFlag(questionId) {
        if (this.flaggedQuestions.has(questionId)) {
            this.flaggedQuestions.delete(questionId);
        } else {
            this.flaggedQuestions.add(questionId);
        }
    }
    isFlagged(questionId) { return this.flaggedQuestions.has(questionId); }

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

    getAnsweredCount()  { return Object.keys(this.userAnswers).length; }
    getUnansweredCount(){ return this.questions.length - this.getAnsweredCount(); }
    getFlaggedCount()   { return this.flaggedQuestions.size; }

    getScore() {
        let correct = 0;
        for (const question of this.questions) {
            if (this.userAnswers[question.id] === question.answer) correct++;
        }
        return {
            correct,
            total:      this.questions.length,
            percentage: (correct / this.questions.length) * 100
        };
    }

    startTimer(onTick, onComplete) {
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            if (onTick) onTick(this.timeRemaining);
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                if (onComplete) onComplete();
            }
        }, 1000);
    }
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }
}


// ─────────────────────────────────────────────────────────
// Quiz UI
// ─────────────────────────────────────────────────────────
class QuizUI {
    constructor(quizState) {
        this.state    = quizState;
        this.elements = this.cacheElements();
        this.attachEventListeners();
        this.render();
        this.startTimer();
    }

    // Null-safe cache: if an element doesn't exist, store null and guard on use
    cacheElements() {
        const get = id => document.getElementById(id) || null;
        return {
            subjectName:         get('subjectName'),
            currentQuestionNum:  get('currentQuestionNum'),
            totalQuestions:      get('totalQuestions'),
            timerDisplay:        get('timerDisplay'),
            timerProgressCircle: get('timerProgressCircle'),
            sidebar:             get('quizSidebar'),
            questionPalette:     get('questionPalette'),
            answeredCount:       get('answeredCount'),
            unansweredCount:     get('unansweredCount'),
            flaggedCount:        get('flaggedCount'),
            questionCard:        get('questionCard'),
            questionNumber:      get('questionNumber'),
            questionText:        get('questionText'),
            optionsContainer:    get('optionsContainer'),
            questionExplanation: get('questionExplanation'),
            explanationContent:  get('explanationContent'),
            prevBtn:             get('prevBtn'),
            nextBtn:             get('nextBtn'),
            clearBtn:            get('clearBtn'),
            flagBtn:             get('flagBtn'),
            menuBtn:             get('menuBtn'),
            closeSidebar:        get('closeSidebar'),
            mobilePaletteBtn:    get('mobilePaletteBtn'),
            submitBtn:           get('submitBtn'),
            calculatorBtn:       get('calculatorBtn'),
            submitModal:         get('submitModal'),
            closeSubmitModal:    get('closeSubmitModal'),
            cancelSubmitBtn:     get('cancelSubmitBtn'),
            confirmSubmitBtn:    get('confirmSubmitBtn'),
            calculatorModal:     get('calculatorModal'),
            closeCalculatorModal:get('closeCalculatorModal'),
            timeUpModal:         get('timeUpModal'),
            viewResultsBtn:      get('viewResultsBtn')
        };
    }

    // Attach listener only when element is non-null
    on(el, event, handler) {
        if (el) el.addEventListener(event, handler);
    }

    attachEventListeners() {
        this.on(this.elements.prevBtn,             'click', () => this.handlePrevious());
        this.on(this.elements.nextBtn,             'click', () => this.handleNext());
        this.on(this.elements.clearBtn,            'click', () => this.handleClearAnswer());
        this.on(this.elements.flagBtn,             'click', () => this.handleToggleFlag());

        this.on(this.elements.menuBtn,             'click', () => this.toggleSidebar());
        this.on(this.elements.closeSidebar,        'click', () => this.toggleSidebar());
        this.on(this.elements.mobilePaletteBtn,    'click', () => this.toggleSidebar());

        this.on(this.elements.submitBtn,           'click', () => this.showSubmitModal());
        this.on(this.elements.closeSubmitModal,    'click', () => this.hideSubmitModal());
        this.on(this.elements.cancelSubmitBtn,     'click', () => this.hideSubmitModal());
        this.on(this.elements.confirmSubmitBtn,    'click', () => this.handleSubmit());

        this.on(this.elements.calculatorBtn,       'click', () => this.showCalculatorModal());
        this.on(this.elements.closeCalculatorModal,'click', () => this.hideCalculatorModal());

        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', e => this.handleCalculator(e));
        });

        this.on(this.elements.viewResultsBtn, 'click', () => this.showResults());

        document.addEventListener('keydown', e => this.handleKeyboard(e));
    }

    render() {
        this.renderHeader();
        this.renderQuestionPalette();
        this.renderQuestion();
        this.renderStats();
    }

    renderHeader() {
        const q = this.state.getCurrentQuestion();
        if (this.elements.subjectName)        this.elements.subjectName.textContent        = q.subject;
        if (this.elements.currentQuestionNum) this.elements.currentQuestionNum.textContent = this.state.currentQuestionIndex + 1;
        if (this.elements.totalQuestions)     this.elements.totalQuestions.textContent     = this.state.questions.length;
    }

    renderQuestionPalette() {
        if (!this.elements.questionPalette) return;
        this.elements.questionPalette.innerHTML = '';

        this.state.questions.forEach((question, index) => {
            const btn = document.createElement('button');
            btn.className   = 'palette-btn';
            btn.textContent = index + 1;

            if (index === this.state.currentQuestionIndex) {
                btn.classList.add('current');
            } else if (this.state.getAnswer(question.id)) {
                btn.classList.add('answered');
            }
            if (this.state.isFlagged(question.id)) btn.classList.add('flagged');

            btn.addEventListener('click', () => {
                this.state.goToQuestion(index);
                this.render();
                this.closeSidebarOnMobile();
            });

            this.elements.questionPalette.appendChild(btn);
        });
    }

    renderQuestion() {
        const question = this.state.getCurrentQuestion();

        if (this.elements.questionNumber) this.elements.questionNumber.textContent = this.state.currentQuestionIndex + 1;
        if (this.elements.questionText)   this.elements.questionText.textContent   = question.text;

        // Rebuild options — always wipe first to prevent stale state
        if (this.elements.optionsContainer) {
            this.elements.optionsContainer.innerHTML = '';

            ['A','B','C','D'].forEach(label => {
                if (!question.options[label]) return;

                const option       = document.createElement('div');
                option.className   = 'option';

                // Only mark selected for the current question's stored answer
                if (this.state.getAnswer(question.id) === label) {
                    option.classList.add('selected');
                }

                option.innerHTML = `
                    <div class="option-label">${label}</div>
                    <div class="option-text">${question.options[label]}</div>
                `;

                option.addEventListener('click', () => this.handleSelectOption(label));
                this.elements.optionsContainer.appendChild(option);
            });
        }

        // Flag button state
        if (this.elements.flagBtn) {
            const isFlagged = this.state.isFlagged(question.id);
            this.elements.flagBtn.classList.toggle('flagged', isFlagged);
            const icon = this.elements.flagBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fas', isFlagged);
                icon.classList.toggle('far', !isFlagged);
            }
        }

        // Prev button
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = (this.state.currentQuestionIndex === 0);
        }

        // Next button label
        if (this.elements.nextBtn) {
            const isLast = this.state.currentQuestionIndex === this.state.questions.length - 1;
            this.elements.nextBtn.innerHTML = isLast
                ? '<i class="fas fa-check"></i> Review & Submit'
                : 'Next <i class="fas fa-arrow-right"></i>';
        }

        // Hide explanation until an answer is selected
        this.renderExplanation(question);

        if (this.elements.questionCard) this.elements.questionCard.scrollTop = 0;
    }

    renderExplanation(question) {
        if (!this.elements.questionExplanation || !this.elements.explanationContent) return;
        const hasAnswer      = !!this.state.getAnswer(question.id);
        const hasExplanation = !!(question.explanation || question.exception);

        if (hasAnswer && hasExplanation) {
            this.elements.explanationContent.textContent = question.explanation || question.exception;
            this.elements.questionExplanation.classList.remove('hidden');
        } else {
            this.elements.questionExplanation.classList.add('hidden');
        }
    }

    renderStats() {
        if (this.elements.answeredCount)   this.elements.answeredCount.textContent   = this.state.getAnsweredCount();
        if (this.elements.unansweredCount) this.elements.unansweredCount.textContent = this.state.getUnansweredCount();
        if (this.elements.flaggedCount)    this.elements.flaggedCount.textContent    = this.state.getFlaggedCount();
    }

    startTimer() {
        this.state.startTimer(
            timeRemaining => this.updateTimer(timeRemaining),
            ()            => this.handleTimeUp()
        );
    }

    updateTimer(timeRemaining) {
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = this.state.formatTime(timeRemaining);
        }
        if (this.elements.timerProgressCircle) {
            const progress = (timeRemaining / this.state.duration) * 163.36;
            this.elements.timerProgressCircle.style.strokeDashoffset = 163.36 - progress;
        }
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.classList.remove('warning','danger');
            if (timeRemaining <= 300 && timeRemaining > 60) {
                this.elements.timerDisplay.classList.add('warning');
            } else if (timeRemaining <= 60) {
                this.elements.timerDisplay.classList.add('danger');
            }
        }
    }

    handleSelectOption(option) {
        const question = this.state.getCurrentQuestion();
        this.state.setAnswer(question.id, option);
        this.render();
    }

    handleClearAnswer() {
        const question = this.state.getCurrentQuestion();
        this.state.clearAnswer(question.id);
        this.render();
    }

    handleToggleFlag() {
        const question = this.state.getCurrentQuestion();
        this.state.toggleFlag(question.id);
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
        switch(e.key) {
            case 'ArrowLeft':  e.preventDefault(); this.handlePrevious(); break;
            case 'ArrowRight': e.preventDefault(); this.handleNext();     break;
            case 'a': case 'A': e.preventDefault(); this.handleSelectOption('A'); break;
            case 'b': case 'B': e.preventDefault(); this.handleSelectOption('B'); break;
            case 'c': case 'C': e.preventDefault(); this.handleSelectOption('C'); break;
            case 'd': case 'D': e.preventDefault(); this.handleSelectOption('D'); break;
            case 'f': case 'F': e.preventDefault(); this.handleToggleFlag();      break;
            case 'Escape':
                this.hideSubmitModal();
                this.hideCalculatorModal();
                break;
        }
    }

    toggleSidebar() {
        if (this.elements.sidebar) this.elements.sidebar.classList.toggle('open');
    }

    closeSidebarOnMobile() {
        if (window.innerWidth <= 1024 && this.elements.sidebar) {
            this.elements.sidebar.classList.remove('open');
        }
    }

    showSubmitModal() {
        if (!this.elements.submitModal) return;
        const get = id => document.getElementById(id);
        if (get('modalTotalQuestions'))  get('modalTotalQuestions').textContent  = this.state.questions.length;
        if (get('modalAnsweredCount'))   get('modalAnsweredCount').textContent   = this.state.getAnsweredCount();
        if (get('modalUnansweredCount')) get('modalUnansweredCount').textContent = this.state.getUnansweredCount();
        if (get('modalTimeRemaining'))   get('modalTimeRemaining').textContent   = this.state.formatTime(this.state.timeRemaining);
        this.elements.submitModal.classList.remove('hidden');
    }

    hideSubmitModal() {
        if (this.elements.submitModal) this.elements.submitModal.classList.add('hidden');
    }

    showCalculatorModal() {
        if (this.elements.calculatorModal) this.elements.calculatorModal.classList.remove('hidden');
    }

    hideCalculatorModal() {
        if (this.elements.calculatorModal) this.elements.calculatorModal.classList.add('hidden');
    }

    handleCalculator(e) {
        const btn     = e.currentTarget;
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        const value  = btn.dataset.value;
        const action = btn.dataset.action;

        if (value) {
            display.value = (display.value === '0') ? value : display.value + value;
        } else if (action) {
            switch(action) {
                case 'clear':    display.value = '0'; break;
                case 'delete':   display.value = display.value.slice(0,-1) || '0'; break;
                case 'add':
                case 'subtract':
                case 'multiply':
                case 'divide':   display.value += ' ' + btn.textContent + ' '; break;
                case 'equals':
                    try {
                        const expr  = display.value
                            .replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
                        display.value = eval(expr);
                    } catch {
                        display.value = 'Error';
                        setTimeout(() => display.value = '0', 1000);
                    }
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
        if (this.elements.timeUpModal) {
            this.elements.timeUpModal.classList.remove('hidden');
        }
    }

    showResults() {
        const score      = this.state.getScore();
        const timeTaken  = this.state.duration - this.state.timeRemaining;
        const metadata   = window.quizMetadata || {};

        try {
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF not loaded');
            this._generatePDF(score, timeTaken, metadata);
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert(
                `Quiz Complete!\n\n` +
                `Subject : ${metadata.subject || 'Practice Test'}\n` +
                `Score   : ${score.correct}/${score.total} (${score.percentage.toFixed(1)}%)\n` +
                `Time    : ${this.state.formatTime(timeTaken)}`
            );
        }
    }

    _generatePDF(score, timeTaken, metadata) {
        const { jsPDF } = window.jspdf;
        const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW   = 210;
        const margin  = 18;
        const contentW = pageW - margin * 2;
        let   y       = 0;

        const subject  = metadata.subject      || 'Practice Test';
        const period   = metadata.period       || '';
        const days     = metadata.days         || '';
        const genDate  = metadata.generatedDate || new Date().toISOString().slice(0, 10);
        const pct      = score.percentage;

        // Colour palette
        const BLACK     = [15,  15,  15];
        const GOLD      = [212, 175, 55];
        const GREEN     = [16,  185, 129];
        const RED       = [239,  68,  68];
        const GREY_BG   = [248, 249, 250];
        const GREY_LINE = [229, 231, 235];
        const MUTED     = [107, 114, 128];
        const scoreColour = pct >= 70 ? GREEN : pct >= 50 ? GOLD : RED;

        // ── Header bar ─────────────────────────────────────────
        doc.setFillColor(...BLACK);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(0, 26, pageW, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...GOLD);
        doc.text('GrantApp AI', margin, 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text('JAMB Practice Test Results', margin, 18);
        doc.text(genDate, pageW - margin, 18, { align: 'right' });

        y = 40;

        // ── Subject heading ────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(...BLACK);
        doc.text(subject, margin, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        const periodLabel = (period && days) ? `Period ${period}  •  Day ${days}` : (days ? `Day ${days}` : '');
        if (periodLabel) { doc.text(periodLabel, margin, y); y += 5; }
        y += 4;

        // ── Score summary box ──────────────────────────────────
        const boxH = 36;
        doc.setFillColor(...GREY_BG);
        doc.roundedRect(margin, y, contentW, boxH, 4, 4, 'F');
        doc.setDrawColor(...GREY_LINE);
        doc.roundedRect(margin, y, contentW, boxH, 4, 4, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        doc.setTextColor(...scoreColour);
        doc.text(`${pct.toFixed(1)}%`, margin + 10, y + 22);

        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text(`${score.correct} / ${score.total}`, margin + 55, y + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text('Correct answers', margin + 55, y + 20);

        const grade = pct >= 70 ? 'PASS' : pct >= 50 ? 'AVERAGE' : 'FAIL';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...scoreColour);
        doc.text(grade, pageW - margin - 10, y + 14, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(`Time taken: ${this.state.formatTime(timeTaken)}`, pageW - margin - 10, y + 22, { align: 'right' });

        y += boxH + 10;

        // ── Question breakdown table ───────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text('Question Breakdown', margin, y);
        y += 6;

        const col = {
            num:     margin,
            question:margin + 12,
            yours:   margin + contentW - 40,
            correct: margin + contentW - 22,
            result:  margin + contentW - 6
        };
        const rowH = 8;

        // Table header row
        doc.setFillColor(...BLACK);
        doc.rect(margin, y, contentW, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('#',        col.num      + 2, y + 5.5);
        doc.text('Question', col.question,      y + 5.5);
        doc.text('Yours',    col.yours,          y + 5.5);
        doc.text('Answer',   col.correct,        y + 5.5);
        y += rowH;

        // Table data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        this.state.questions.forEach((q, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }

            const userAnswer = this.state.getAnswer(q.id) || '—';
            const isCorrect  = userAnswer === q.answer;
            const rowBg      = idx % 2 === 0 ? [255, 255, 255] : GREY_BG;

            doc.setFillColor(...rowBg);
            doc.rect(margin, y, contentW, rowH, 'F');
            doc.setDrawColor(...GREY_LINE);
            doc.rect(margin, y, contentW, rowH, 'S');

            doc.setTextColor(...MUTED);
            doc.text(String(idx + 1), col.num + 2, y + 5.5);

            const maxChars = 55;
            const qText    = q.text.length > maxChars ? q.text.slice(0, maxChars) + '…' : q.text;
            doc.setTextColor(...BLACK);
            doc.text(qText, col.question, y + 5.5);

            doc.setTextColor(...(isCorrect ? GREEN : RED));
            doc.text(userAnswer, col.yours + 4, y + 5.5, { align: 'center' });

            doc.setTextColor(...GREEN);
            doc.text(q.answer, col.correct + 4, y + 5.5, { align: 'center' });

            // ✓ / ✗  using standard characters (safe across all PDF viewers)
            doc.setTextColor(...(isCorrect ? GREEN : RED));
            doc.text(isCorrect ? '\u2713' : '\u2717', col.result, y + 5.5);

            y += rowH;
        });

        // ── Footer on every page ───────────────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setDrawColor(...GREY_LINE);
            doc.line(margin, 285, pageW - margin, 285);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text('GrantApp AI  •  100 Days to UTME', margin, 291);
            doc.text(`Page ${p} of ${totalPages}`, pageW - margin, 291, { align: 'right' });
        }

        // ── Save ───────────────────────────────────────────────
        const safe     = subject.toLowerCase().replace(/\s+/g, '-');
        const daySuffix = days || period;
        doc.save(`quiz-results-${safe}${daySuffix ? '-day' + daySuffix : ''}.pdf`);
    }
}


// ─────────────────────────────────────────────────────────
// Boot Entry Point
// Called by quiz-template.html's initializeQuiz() once data
// has been validated. Never attaches its own DOMContentLoaded.
// ─────────────────────────────────────────────────────────
function bootQuiz(rawQuestions, metadata) {
    if (!rawQuestions || rawQuestions.length === 0) {
        console.error('bootQuiz: no questions supplied');
        return;
    }

    const durationSeconds = (metadata && metadata.timerMinutes)
        ? metadata.timerMinutes * 60
        : 900; // 15 min fallback

    const subject   = (metadata && metadata.subject) ? metadata.subject : 'Practice Test';
    const questions = normalizeQuestions(rawQuestions, subject);

    const quizState = new QuizState(questions, durationSeconds);
    const quizUI    = new QuizUI(quizState);

    // Warn before accidental navigation away
    window.addEventListener('beforeunload', e => {
        if (!quizState.isSubmitted) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });

    console.log(`Quiz booted: ${questions.length} questions, ${durationSeconds}s`);
}
