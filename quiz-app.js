// quiz-app.js - UTME Quiz Interface Logic

// Question Data Parser
function parseQuestionFile(text, subject) {
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;
    let collectingExplanation = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Match question number pattern (e.g., "1. " or "35. ")
        const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (questionMatch) {
            // Save previous question if exists
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            
            // Start new question
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
        
        // Match options (A., B., C., D.)
        const optionMatch = line.match(/^([A-D])\.\s+(.+)$/);
        if (optionMatch && currentQuestion) {
            currentQuestion.options[optionMatch[1]] = optionMatch[2];
            continue;
        }
        
        // Match answer
        if (line.startsWith('Answer:') && currentQuestion) {
            currentQuestion.answer = line.replace('Answer:', '').trim();
            continue;
        }
        
        // Match explanation
        if (line.startsWith('Explanation:') && currentQuestion) {
            currentQuestion.explanation = line.replace('Explanation:', '').trim();
            collectingExplanation = true;
            continue;
        }
        
        // Match exception
        if (line.startsWith('Exception:') && currentQuestion) {
            currentQuestion.exception = line.replace('Exception:', '').trim();
            collectingExplanation = false;
            continue;
        }
        
        // Continue collecting explanation if we're in explanation mode
        if (collectingExplanation && line && currentQuestion) {
            currentQuestion.explanation += ' ' + line;
        }
    }
    
    // Don't forget the last question
    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    
    return questions;
}

// Sample questions (in production, load from files)
const sampleQuestions = [
    {
        id: 1,
        subject: 'Physics',
        text: 'A body moving with constant velocity has:',
        options: {
            'A': 'Zero acceleration',
            'B': 'Constant acceleration',
            'C': 'Increasing acceleration',
            'D': 'Decreasing acceleration'
        },
        answer: 'A',
        explanation: 'Constant velocity means no change in speed or direction, so a = Δv/Δt = 0.',
        exception: 'Many confuse velocity with speed; constant speed with changing direction (circular motion) HAS acceleration.'
    },
    {
        id: 2,
        subject: 'Physics',
        text: 'An object is thrown vertically upward. At its highest point:',
        options: {
            'A': 'Velocity = 0, acceleration = 0',
            'B': 'Velocity = 0, acceleration = g (downward)',
            'C': 'Velocity = g, acceleration = 0',
            'D': 'Both velocity and acceleration are maximum'
        },
        answer: 'B',
        explanation: 'At peak, v = 0 instantaneously, but gravity still acts (a = 9.8 m/s² downward).',
        exception: 'Acceleration is NOT zero at highest point—common misconception; gravity never stops acting.'
    }
    // Add more questions as needed
];

// Quiz State Management
class QuizState {
    constructor(questions, duration = 900) { // 15 minutes default
        this.questions = questions;
        this.duration = duration; // in seconds
        this.timeRemaining = duration;
        this.currentQuestionIndex = 0;
        this.userAnswers = {}; // { questionId: selectedOption }
        this.flaggedQuestions = new Set();
        this.startTime = Date.now();
        this.timerInterval = null;
        this.isSubmitted = false;
    }
    
    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }
    
    setAnswer(questionId, option) {
        this.userAnswers[questionId] = option;
    }
    
    getAnswer(questionId) {
        return this.userAnswers[questionId];
    }
    
    clearAnswer(questionId) {
        delete this.userAnswers[questionId];
    }
    
    toggleFlag(questionId) {
        if (this.flaggedQuestions.has(questionId)) {
            this.flaggedQuestions.delete(questionId);
        } else {
            this.flaggedQuestions.add(questionId);
        }
    }
    
    isFlagged(questionId) {
        return this.flaggedQuestions.has(questionId);
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
    
    getAnsweredCount() {
        return Object.keys(this.userAnswers).length;
    }
    
    getUnansweredCount() {
        return this.questions.length - this.getAnsweredCount();
    }
    
    getFlaggedCount() {
        return this.flaggedQuestions.size;
    }
    
    getScore() {
        let correct = 0;
        for (const question of this.questions) {
            if (this.userAnswers[question.id] === question.answer) {
                correct++;
            }
        }
        return {
            correct,
            total: this.questions.length,
            percentage: (correct / this.questions.length) * 100
        };
    }
    
    startTimer(onTick, onComplete) {
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            
            if (onTick) {
                onTick(this.timeRemaining);
            }
            
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                if (onComplete) {
                    onComplete();
                }
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
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// UI Controller
class QuizUI {
    constructor(quizState) {
        this.state = quizState;
        this.elements = this.cacheElements();
        this.attachEventListeners();
        this.render();
        this.startTimer();
    }
    
    cacheElements() {
        return {
            // Header
            subjectName: document.getElementById('subjectName'),
            currentQuestionNum: document.getElementById('currentQuestionNum'),
            totalQuestions: document.getElementById('totalQuestions'),
            timerDisplay: document.getElementById('timerDisplay'),
            timerProgressCircle: document.getElementById('timerProgressCircle'),
            
            // Sidebar
            sidebar: document.getElementById('quizSidebar'),
            questionPalette: document.getElementById('questionPalette'),
            answeredCount: document.getElementById('answeredCount'),
            unansweredCount: document.getElementById('unansweredCount'),
            flaggedCount: document.getElementById('flaggedCount'),
            
            // Main
            questionCard: document.getElementById('questionCard'),
            questionNumber: document.getElementById('questionNumber'),
            questionText: document.getElementById('questionText'),
            optionsContainer: document.getElementById('optionsContainer'),
            questionExplanation: document.getElementById('questionExplanation'),
            explanationContent: document.getElementById('explanationContent'),
            
            // Navigation
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            clearBtn: document.getElementById('clearBtn'),
            flagBtn: document.getElementById('flagBtn'),
            
            // Buttons
            menuBtn: document.getElementById('menuBtn'),
            closeSidebar: document.getElementById('closeSidebar'),
            mobilePaletteBtn: document.getElementById('mobilePaletteBtn'),
            submitBtn: document.getElementById('submitBtn'),
            calculatorBtn: document.getElementById('calculatorBtn'),
            
            // Modals
            submitModal: document.getElementById('submitModal'),
            closeSubmitModal: document.getElementById('closeSubmitModal'),
            cancelSubmitBtn: document.getElementById('cancelSubmitBtn'),
            confirmSubmitBtn: document.getElementById('confirmSubmitBtn'),
            calculatorModal: document.getElementById('calculatorModal'),
            closeCalculatorModal: document.getElementById('closeCalculatorModal'),
            timeUpModal: document.getElementById('timeUpModal'),
            viewResultsBtn: document.getElementById('viewResultsBtn')
        };
    }
    
    attachEventListeners() {
        // Navigation
        this.elements.prevBtn.addEventListener('click', () => this.handlePrevious());
        this.elements.nextBtn.addEventListener('click', () => this.handleNext());
        this.elements.clearBtn.addEventListener('click', () => this.handleClearAnswer());
        this.elements.flagBtn.addEventListener('click', () => this.handleToggleFlag());
        
        // Sidebar
        this.elements.menuBtn.addEventListener('click', () => this.toggleSidebar());
        this.elements.closeSidebar.addEventListener('click', () => this.toggleSidebar());
        this.elements.mobilePaletteBtn.addEventListener('click', () => this.toggleSidebar());
        
        // Submit
        this.elements.submitBtn.addEventListener('click', () => this.showSubmitModal());
        this.elements.closeSubmitModal.addEventListener('click', () => this.hideSubmitModal());
        this.elements.cancelSubmitBtn.addEventListener('click', () => this.hideSubmitModal());
        this.elements.confirmSubmitBtn.addEventListener('click', () => this.handleSubmit());
        
        // Calculator
        this.elements.calculatorBtn.addEventListener('click', () => this.showCalculatorModal());
        this.elements.closeCalculatorModal.addEventListener('click', () => this.hideCalculatorModal());
        
        // Calculator buttons
        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCalculator(e));
        });
        
        // View results
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
        const question = this.state.getCurrentQuestion();
        this.elements.subjectName.textContent = question.subject;
        this.elements.currentQuestionNum.textContent = this.state.currentQuestionIndex + 1;
        this.elements.totalQuestions.textContent = this.state.questions.length;
    }
    
    renderQuestionPalette() {
        this.elements.questionPalette.innerHTML = '';
        
        this.state.questions.forEach((question, index) => {
            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.textContent = index + 1;
            
            // Add status classes
            if (index === this.state.currentQuestionIndex) {
                btn.classList.add('current');
            } else if (this.state.getAnswer(question.id)) {
                btn.classList.add('answered');
            }
            
            if (this.state.isFlagged(question.id)) {
                btn.classList.add('flagged');
            }
            
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
        
        // Update question number and text
        this.elements.questionNumber.textContent = this.state.currentQuestionIndex + 1;
        this.elements.questionText.textContent = question.text;
        
        // Render options
        this.elements.optionsContainer.innerHTML = '';
        const optionLabels = ['A', 'B', 'C', 'D'];
        
        optionLabels.forEach(label => {
            if (question.options[label]) {
                const option = document.createElement('div');
                option.className = 'option';
                
                const userAnswer = this.state.getAnswer(question.id);
                if (userAnswer === label) {
                    option.classList.add('selected');
                }
                
                option.innerHTML = `
                    <div class="option-label">${label}</div>
                    <div class="option-text">${question.options[label]}</div>
                `;
                
                option.addEventListener('click', () => this.handleSelectOption(label));
                
                this.elements.optionsContainer.appendChild(option);
            }
        });
        
        // Update flag button
        const isFlagged = this.state.isFlagged(question.id);
        if (isFlagged) {
            this.elements.flagBtn.classList.add('flagged');
            this.elements.flagBtn.querySelector('i').classList.remove('far');
            this.elements.flagBtn.querySelector('i').classList.add('fas');
        } else {
            this.elements.flagBtn.classList.remove('flagged');
            this.elements.flagBtn.querySelector('i').classList.remove('fas');
            this.elements.flagBtn.querySelector('i').classList.add('far');
        }
        
        // Update navigation buttons
        this.elements.prevBtn.disabled = this.state.currentQuestionIndex === 0;
        
        if (this.state.currentQuestionIndex === this.state.questions.length - 1) {
            this.elements.nextBtn.textContent = 'Submit';
            this.elements.nextBtn.innerHTML = '<i class="fas fa-check"></i> Review & Submit';
        } else {
            this.elements.nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
        }
        
        // Scroll to top
        this.elements.questionCard.scrollTop = 0;
    }
    
    renderStats() {
        this.elements.answeredCount.textContent = this.state.getAnsweredCount();
        this.elements.unansweredCount.textContent = this.state.getUnansweredCount();
        this.elements.flaggedCount.textContent = this.state.getFlaggedCount();
    }
    
    startTimer() {
        this.state.startTimer(
            (timeRemaining) => this.updateTimer(timeRemaining),
            () => this.handleTimeUp()
        );
    }
    
    updateTimer(timeRemaining) {
        const formatted = this.state.formatTime(timeRemaining);
        this.elements.timerDisplay.textContent = formatted;
        
        // Update progress circle
        const progress = (timeRemaining / this.state.duration) * 163.36; // Circle circumference
        this.elements.timerProgressCircle.style.strokeDashoffset = 163.36 - progress;
        
        // Add warning/danger classes
        this.elements.timerDisplay.classList.remove('warning', 'danger');
        if (timeRemaining <= 300 && timeRemaining > 60) { // 5 minutes
            this.elements.timerDisplay.classList.add('warning');
        } else if (timeRemaining <= 60) { // 1 minute
            this.elements.timerDisplay.classList.add('danger');
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
        if (this.state.prevQuestion()) {
            this.render();
        }
    }
    
    handleNext() {
        // If last question, show submit modal
        if (this.state.currentQuestionIndex === this.state.questions.length - 1) {
            this.showSubmitModal();
        } else if (this.state.nextQuestion()) {
            this.render();
        }
    }
    
    handleKeyboard(e) {
        // Don't trigger shortcuts in modals or inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.handlePrevious();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.handleNext();
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                this.handleSelectOption('A');
                break;
            case 'b':
            case 'B':
                e.preventDefault();
                this.handleSelectOption('B');
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                this.handleSelectOption('C');
                break;
            case 'd':
            case 'D':
                e.preventDefault();
                this.handleSelectOption('D');
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.handleToggleFlag();
                break;
            case 'Escape':
                this.hideSubmitModal();
                this.hideCalculatorModal();
                break;
        }
    }
    
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('open');
    }
    
    closeSidebarOnMobile() {
        if (window.innerWidth <= 1024) {
            this.elements.sidebar.classList.remove('open');
        }
    }
    
    showSubmitModal() {
        document.getElementById('modalTotalQuestions').textContent = this.state.questions.length;
        document.getElementById('modalAnsweredCount').textContent = this.state.getAnsweredCount();
        document.getElementById('modalUnansweredCount').textContent = this.state.getUnansweredCount();
        document.getElementById('modalTimeRemaining').textContent = this.state.formatTime(this.state.timeRemaining);
        
        this.elements.submitModal.classList.remove('hidden');
    }
    
    hideSubmitModal() {
        this.elements.submitModal.classList.add('hidden');
    }
    
    showCalculatorModal() {
        this.elements.calculatorModal.classList.remove('hidden');
    }
    
    hideCalculatorModal() {
        this.elements.calculatorModal.classList.add('hidden');
    }
    
    handleCalculator(e) {
        const btn = e.currentTarget;
        const display = document.getElementById('calcDisplay');
        const value = btn.dataset.value;
        const action = btn.dataset.action;
        
        if (value) {
            if (display.value === '0') {
                display.value = value;
            } else {
                display.value += value;
            }
        } else if (action) {
            switch(action) {
                case 'clear':
                    display.value = '0';
                    break;
                case 'delete':
                    display.value = display.value.slice(0, -1) || '0';
                    break;
                case 'add':
                case 'subtract':
                case 'multiply':
                case 'divide':
                    display.value += ' ' + btn.textContent + ' ';
                    break;
                case 'equals':
                    try {
                        const expr = display.value
                            .replace(/×/g, '*')
                            .replace(/÷/g, '/')
                            .replace(/−/g, '-');
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
        document.getElementById('timeUpModal').classList.remove('hidden');
    }
    
    showResults() {
        const score = this.state.getScore();
        
        // In production, navigate to results page
        alert(`Quiz Complete!\n\nScore: ${score.correct}/${score.total} (${score.percentage.toFixed(1)}%)`);
        
        // For now, just reload
        window.location.reload();
    }
}

// Initialize Quiz
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading state
        document.body.style.cursor = 'wait';
        
        // Initialize launcher
        const launcher = new QuizLauncher();
        
        // Load questions based on URL parameters
        const questions = await launcher.initializeFromUrl();
        
        if (!questions || questions.length === 0) {
            throw new Error('No questions loaded');
        }
        
        console.log(`Loaded ${questions.length} questions`);
        
        // Create quiz state with loaded questions
        const quizState = new QuizState(questions, QUIZ_CONFIG.duration);
        
        // Initialize UI
        const quizUI = new QuizUI(quizState);
        
        // Prevent accidental page exit
        window.addEventListener('beforeunload', (e) => {
            if (!quizState.isSubmitted) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
        
        document.body.style.cursor = 'default';
        
    } catch (error) {
        console.error('Failed to initialize quiz:', error);
        
        // Show error message
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; 
                        height: 100vh; background: #f8f9fa; padding: 2rem;">
                <div style="text-align: center; max-width: 500px;">
                    <div style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #1f2937;">
                        Failed to Load Quiz
                    </h1>
                    <p style="font-size: 1rem; color: #6b7280; margin-bottom: 2rem;">
                        ${error.message}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="window.location.reload()" 
                                style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; 
                                       border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        <button onclick="window.history.back()" 
                                style="padding: 0.75rem 1.5rem; background: white; color: #1f2937; 
                                       border: 2px solid #e5e7eb; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-arrow-left"></i> Go Back
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
});
