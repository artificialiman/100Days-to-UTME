// quiz-launcher.js - Handles Quiz Initialization and Question Loading

const QUIZ_CONFIG = {
    questionBanks: {
        github: {
            baseUrl: 'https://raw.githubusercontent.com/artificialiman/Questt/refs/heads/main',
            subjects: {
                'Physics': 'JAMB_Physics_Q1-35.txt',
                'Mathematics': 'JAMB_Mathematics_Q1-35.txt',
                'English': 'JAMB_English_Q1-35.txt',
                'Chemistry': 'JAMB_Chemistry_Q1-35.txt',
                'Biology': 'JAMB_Biology_Q1-35.txt',
                'Literature': 'JAMB_Literature_Q1-35.txt',
                'Government': 'JAMB_Government_Q1-35.txt',
                'CRS': 'JAMB_CRS_Q1-35.txt',
                'Commerce': 'JAMB_Commerce_Q1-35.txt',
                'Accounting': 'JAMB_Accounting_Q1-35.txt',
                'Economics': 'JAMB_Economics_Q1-35.txt'
            }
        }
    },
    activeSource: 'github',
    duration: 900,
    questionsPerSubject: 35,
    clusters: {
        science: [
            { name: 'Science Cluster A', subjects: ['Mathematics', 'English', 'Physics', 'Chemistry'] },
            { name: 'Science Cluster B', subjects: ['Biology', 'English', 'Physics', 'Chemistry'] }
        ],
        art: [
            { name: 'Arts Cluster A', subjects: ['English', 'Literature', 'Government', 'CRS'] }
        ],
        commercial: [
            { name: 'Commercial Cluster A', subjects: ['English', 'Accounting', 'Commerce', 'Economics'] },
            { name: 'Commercial Cluster B', subjects: ['English', 'Mathematics', 'Economics', 'Government'] }
        ]
    }
};

class QuizLauncher {
    constructor(config = QUIZ_CONFIG) {
        this.config = config;
        this.cache = {};
    }

    /**
     * Convert window.quizData (flat optionA/B/C/D format produced by generate_quiz.py)
     * into the {options: {A,B,C,D}} format that QuizState in quiz-app.js expects.
     */
    convertEmbeddedData(rawData) {
        return rawData.map(q => ({
            id: q.id,
            subject: (window.quizMetadata && window.quizMetadata.subject) || 'Practice',
            text: q.text,
            options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
            answer: q.answer,
            explanation: q.explanation || '',
            exception: q.exception || ''
        }));
    }

    getQuestionUrl(subject) {
        const source = this.config.questionBanks[this.config.activeSource];
        if (!source) throw new Error(`Invalid source: ${this.config.activeSource}`);
        const filename = source.subjects[subject];
        if (!filename) throw new Error(`Subject "${subject}" not found`);
        return `${source.baseUrl}/${filename}`;
    }

    async loadSubject(subject) {
        if (this.cache[subject]) return this.cache[subject];
        const url = this.getQuestionUrl(subject);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        const parser = new QuestionParser();
        const questions = parser.parse(text, subject);
        this.cache[subject] = questions;
        return questions;
    }

    async loadCluster(subjects) {
        const allQuestions = [];
        const errors = [];
        for (const subject of subjects) {
            try {
                allQuestions.push(...await this.loadSubject(subject));
            } catch (e) {
                errors.push({ subject, error: e.message });
            }
        }
        if (allQuestions.length === 0) throw new Error('No questions loaded for cluster.');
        return { questions: allQuestions, errors };
    }

    getCluster(stream, clusterIndex = 0) {
        const streamClusters = this.config.clusters[stream];
        if (!streamClusters) throw new Error(`Invalid stream: ${stream}`);
        return streamClusters[clusterIndex];
    }

    async initializeFromUrl() {
        // PRIMARY PATH: use pre-embedded questions from generated HTML files
        // window.quizData is set by the <script> block injected by generate_quiz.py
        if (window.quizData && Array.isArray(window.quizData) && window.quizData.length > 0) {
            console.log(`QuizLauncher: using ${window.quizData.length} embedded questions`);
            // Sync timer duration from metadata
            if (window.quizMetadata && window.quizMetadata.timerMinutes) {
                this.config.duration = window.quizMetadata.timerMinutes * 60;
            }
            return this.convertEmbeddedData(window.quizData);
        }

        // FALLBACK PATH: fetch from remote via URL params (used by quiz.html)
        const params = new URLSearchParams(window.location.search);

        if (params.has('subject')) {
            return await this.loadSubject(params.get('subject'));
        }
        if (params.has('stream')) {
            const cluster = this.getCluster(
                params.get('stream'),
                parseInt(params.get('cluster') || '0')
            );
            return (await this.loadCluster(cluster.subjects)).questions;
        }
        if (params.has('subjects')) {
            return (await this.loadCluster(params.get('subjects').split(','))).questions;
        }

        throw new Error(
            'No questions found. Open a generated quiz file (e.g. quiz-mathematics.html) ' +
            'or add ?subject=Mathematics to the URL.'
        );
    }
}

function startQuiz(stream, clusterIndex = 0) {
    const cluster = QUIZ_CONFIG.clusters[stream]?.[clusterIndex];
    if (!cluster) { alert(`Cluster not found: ${stream}[${clusterIndex}]`); return; }
    window.location.href = `quiz.html?stream=${stream}&cluster=${clusterIndex}`;
}

function startSubjectQuiz(subject) {
    window.location.href = `quiz.html?subject=${subject}`;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuizLauncher, QUIZ_CONFIG, startQuiz, startSubjectQuiz };
}
