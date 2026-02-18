// quiz-launcher.js - Handles Quiz Initialization and Question Loading

/**
 * Quiz Configuration
 */
const QUIZ_CONFIG = {
    // Questt-resources archive base - the permanent fallback source
    archiveBaseUrl: 'https://raw.githubusercontent.com/artificialiman/Questt-resources/refs/heads/main/archive',

    // Subject filename patterns in the archive
    subjectFiles: {
        'Physics':     'JAMB_Physics_Q1-35.txt',
        'Mathematics': 'JAMB_Mathematics_Q1-35.txt',
        'English':     'JAMB_English_Q1-35.txt',
        'Chemistry':   'JAMB_Chemistry_Q1-35.txt',
        'Biology':     'JAMB_Biology_Q1-35.txt',
        'Literature':  'JAMB_Literature_Q1-35.txt',
        'Government':  'JAMB_Government_Q1-35.txt',
        'CRS':         'JAMB_CRS_Q1-35.txt',
        'Commerce':    'JAMB_Commerce_Q1-35.txt',
        'Accounting':  'JAMB_Accounting_Q1-35.txt',
        'Economics':   'JAMB_Economics_Q1-35.txt'
    },

    // Timer durations
    duration: 3600,        // 60 min for clusters (seconds) — overridden by timerMinutes in metadata
    subjectDuration: 900,  // 15 min for individual subjects

    // Cluster subject lists — mirrors generate_quiz.py CLUSTERS
    clusters: {
        'science-cluster-a':    ['Mathematics', 'English', 'Physics', 'Chemistry'],
        'science-cluster-b':    ['Biology',     'English', 'Physics', 'Chemistry'],
        'arts-cluster-a':       ['English', 'Literature', 'Government', 'CRS'],
        'commercial-cluster-a': ['English', 'Accounting', 'Commerce', 'Economics'],
        'commercial-cluster-b': ['English', 'Mathematics', 'Economics', 'Government'],
        'commercial-cluster-c': ['English', 'Economics', 'Government', 'Commerce']
    },

    // isCluster flag - set true for cluster quiz pages
    isCluster: false
};

/**
 * Map of cluster shortcodes to actual generated quiz filenames.
 * Single source of truth — referenced by science/art/commercial cluster pages.
 */
const CLUSTER_FILE_MAP = {
    // Science
    'mepc':               'quiz-science-cluster-a.html',
    'bepc':               'quiz-science-cluster-b.html',
    'science-a':          'quiz-science-cluster-a.html',
    'science-b':          'quiz-science-cluster-b.html',
    'science-cluster-a':  'quiz-science-cluster-a.html',
    'science-cluster-b':  'quiz-science-cluster-b.html',
    // Arts
    'arts-a':             'quiz-arts-cluster-a.html',
    'arts-cluster-a':     'quiz-arts-cluster-a.html',
    // Commercial
    'comm-a':             'quiz-commercial-cluster-a.html',
    'comm-b':             'quiz-commercial-cluster-b.html',
    'comm-c':             'quiz-commercial-cluster-c.html',
    'commercial-a':       'quiz-commercial-cluster-a.html',
    'commercial-b':       'quiz-commercial-cluster-b.html',
    'commercial-c':       'quiz-commercial-cluster-c.html',
    'commercial-cluster-a': 'quiz-commercial-cluster-a.html',
    'commercial-cluster-b': 'quiz-commercial-cluster-b.html',
    'commercial-cluster-c': 'quiz-commercial-cluster-c.html'
};

// Expose on window so cluster pages can use it without importing
window.CLUSTER_FILE_MAP = CLUSTER_FILE_MAP;

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildArchiveUrl(period, subject) {
    const dayStart = (period * 2) - 1;
    const dayEnd   = period * 2;
    const dayRange = String(dayStart).padStart(2,'0') + '-' + String(dayEnd).padStart(2,'0');
    const filename = QUIZ_CONFIG.subjectFiles[subject];
    if (!filename) return null;
    return QUIZ_CONFIG.archiveBaseUrl + '/day-' + dayRange + '/' + filename;
}

async function fetchAndParseQuestions(url, subject) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        const parser = new QuestionParser();
        return parser.parse(text, subject);
    } catch (e) {
        console.warn('fetchAndParseQuestions failed for ' + subject + ' at ' + url + ':', e.message);
        return [];
    }
}

/**
 * Convert embedded quizData format {id, text, optionA…optionD, answer}
 * into the format QuizState expects {id, subject, text, options{}, answer}
 */
function normaliseEmbeddedQuestions(raw, subjectHint) {
    return raw.map(function(q, i) {
        return {
            id:      q.id != null ? q.id : (i + 1),
            subject: q.subject || subjectHint || (window.quizMetadata && window.quizMetadata.subject) || 'General',
            text:    q.text,
            options: {
                A: q.optionA || (q.options && q.options.A) || '',
                B: q.optionB || (q.options && q.options.B) || '',
                C: q.optionC || (q.options && q.options.C) || '',
                D: q.optionD || (q.options && q.options.D) || ''
            },
            answer:      q.answer,
            explanation: q.explanation || '',
            exception:   q.exception   || ''
        };
    });
}

function validateQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) return [];
    return questions.filter(function(q) {
        return q && q.text &&
               q.options && q.options.A && q.options.B && q.options.C && q.options.D &&
               ['A','B','C','D'].includes(q.answer);
    });
}

// ── QuizLauncher ───────────────────────────────────────────────────────────────

/**
 * Full 5-level fallback chain — guaranteed to return questions or throw only
 * as an absolute last resort.
 *
 * Priority:
 *   1. window.quizData  (embedded by workflow)            ← zero network calls
 *   2. window.previousQuizData  (also embedded)
 *   3. Questt-resources archive — current period
 *   4. Questt-resources archive — previous period
 *   5. sampleQuestions from quiz-app.js                   ← always works
 */
class QuizLauncher {
    constructor() {
        this.metadata = window.quizMetadata || {};
        this.period   = this.metadata.period || 1;
    }

    async initializeFromUrl() {

        // ── Level 1: embedded current data ──────────────────────────────────
        if (window.quizData && Array.isArray(window.quizData) && window.quizData.length > 0) {
            const valid = validateQuestions(normaliseEmbeddedQuestions(window.quizData));
            if (valid.length > 0) {
                console.log('✓ Using embedded quizData (' + valid.length + ' questions)');
                return valid;
            }
        }

        // ── Level 2: embedded previous period data ───────────────────────────
        if (window.previousQuizData && Array.isArray(window.previousQuizData) && window.previousQuizData.length > 0) {
            const valid = validateQuestions(normaliseEmbeddedQuestions(window.previousQuizData));
            if (valid.length > 0) {
                console.warn('⚠ Using embedded previousQuizData');
                this._showPreviousBanner();
                return valid;
            }
        }

        // ── Level 3: archive — current period ───────────────────────────────
        const currentArchive = await this._fetchArchive(this.period);
        if (currentArchive.length > 0) {
            console.warn('⚠ Loaded from archive (current period)');
            return currentArchive;
        }

        // ── Level 4: archive — previous period ──────────────────────────────
        if (this.period > 1) {
            const prevArchive = await this._fetchArchive(this.period - 1);
            if (prevArchive.length > 0) {
                console.warn('⚠ Using archive from previous period');
                this._showPreviousBanner();
                return prevArchive;
            }
        }

        // ── Level 5: built-in sample questions ──────────────────────────────
        console.warn('⚠ All sources failed — using built-in sample questions');
        if (typeof sampleQuestions !== 'undefined' && sampleQuestions.length > 0) {
            return validateQuestions(normaliseEmbeddedQuestions(sampleQuestions));
        }

        throw new Error('FATAL: No question source available');
    }

    async _fetchArchive(period) {
        const subjects = this._getSubjectsForThisPage();
        if (!subjects || subjects.length === 0) return [];

        const all = [];
        for (const subject of subjects) {
            const url = buildArchiveUrl(period, subject);
            if (!url) continue;
            const qs    = await fetchAndParseQuestions(url, subject);
            const valid = validateQuestions(normaliseEmbeddedQuestions(qs, subject));
            all.push(...valid);
        }
        return all;
    }

    _getSubjectsForThisPage() {
        const filename = window.location.pathname.split('/').pop().replace('.html', '');

        // Match cluster key inside filename
        for (const [key, subjects] of Object.entries(QUIZ_CONFIG.clusters)) {
            if (filename.includes(key)) return subjects;
        }

        // Individual subject page
        const subject = this.metadata.subject;
        if (subject && QUIZ_CONFIG.subjectFiles[subject]) return [subject];

        // Comma-separated subjects in metadata
        if (this.metadata.subjects) {
            return this.metadata.subjects.split(',').map(s => s.trim()).filter(s => QUIZ_CONFIG.subjectFiles[s]);
        }

        return [];
    }

    _showPreviousBanner() {
        const banner  = document.getElementById('error-banner');
        const titleEl = document.getElementById('error-title');
        const msgEl   = document.getElementById('error-message');
        if (!banner) return;
        if (titleEl) titleEl.textContent = 'Showing Previous Quiz';
        if (msgEl)   msgEl.textContent   = "Today's quiz is still being prepared. You're practising the previous set.";
        banner.classList.remove('hidden');
        banner.style.backgroundColor = '#fef3c7';
        const icon = banner.querySelector('i');
        if (icon) icon.style.color = '#f59e0b';
    }
}

// ── Navigation helpers (called from cluster pages) ─────────────────────────────

function startQuiz(clusterKey) {
    const file = CLUSTER_FILE_MAP[clusterKey];
    if (!file) { console.error('Unknown cluster key: ' + clusterKey); return; }
    _showLoadingOverlay();
    setTimeout(function() { window.location.href = file; }, 400);
}

function startSubjectQuiz(subject) {
    _showLoadingOverlay();
    setTimeout(function() { window.location.href = 'quiz-' + subject.toLowerCase() + '.html'; }, 400);
}

function _showLoadingOverlay() {
    if (window.GrantApp && window.GrantApp.showLoading) { window.GrantApp.showLoading(); return; }
    const existing = document.getElementById('ql-loading');
    if (existing) return;
    const div = document.createElement('div');
    div.id = 'ql-loading';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;';
    div.innerHTML = '<div style="color:#fff;text-align:center;font-family:Inter,sans-serif"><div style="font-size:2rem;margin-bottom:1rem"><i class="fas fa-spinner fa-spin"></i></div><div style="font-size:1.2rem;font-weight:600">Loading Your Test…</div></div>';
    document.body.appendChild(div);
}

// Export for Node/test environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuizLauncher, QUIZ_CONFIG, CLUSTER_FILE_MAP, startQuiz, startSubjectQuiz };
}
