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
    duration: 3600, // 60 min for clusters (seconds) — overridden by timerMinutes in metadata
    subjectDuration: 900, // 15 min for individual subjects

    // Cluster subject lists — mirrors generate_quiz.py CLUSTERS
    clusters: {
        'science-cluster-a':    ['Mathematics', 'English', 'Physics', 'Chemistry'],
        'science-cluster-b':    ['Biology',     'English', 'Physics', 'Chemistry'],
        'arts-cluster-a':       ['English', 'Literature', 'Government', 'CRS'],
        'commercial-cluster-a': ['English', 'Accounting', 'Commerce', 'Economics'],
        'commercial-cluster-b': ['English', 'Mathematics', 'Economics', 'Government'],
        'commercial-cluster-c': ['English', 'Economics', 'Government', 'Commerce']
    }
};

/**
 * Build archive URL for a given period and subject
 */
function buildArchiveUrl(period, subject) {
    const dayStart = (period * 2) - 1;
    const dayEnd   = period * 2;
    const dayRange = `${String(dayStart).padStart(2,'0')}-${String(dayEnd).padStart(2,'0')}`;
    const filename = QUIZ_CONFIG.subjectFiles[subject];
    if (!filename) return null;
    return `${QUIZ_CONFIG.archiveBaseUrl}/day-${dayRange}/${filename}`;
}

/**
 * Fetch and parse a .txt question file from a URL.
 * Returns array of question objects, or [] on any failure.
 */
async function fetchAndParseQuestions(url, subject) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const parser = new QuestionParser();
        return parser.parse(text, subject);
    } catch (e) {
        console.warn(`fetchAndParseQuestions failed for ${subject} at ${url}:`, e.message);
        return [];
    }
}

/**
 * Convert embedded quizData format {id, text, optionA…optionD, answer}
 * into the format QuizState expects {id, subject, text, options{}, answer}
 */
function normaliseEmbeddedQuestions(raw, subjectHint) {
    return raw.map((q, i) => ({
        id:      q.id ?? (i + 1),
        subject: q.subject || subjectHint || window.quizMetadata?.subject || 'General',
        text:    q.text,
        options: {
            A: q.optionA || q.options?.A || '',
            B: q.optionB || q.options?.B || '',
            C: q.optionC || q.options?.C || '',
            D: q.optionD || q.options?.D || ''
        },
        answer:      q.answer,
        explanation: q.explanation || '',
        exception:   q.exception   || ''
    }));
}

/**
 * Validate a questions array — must have text, all 4 options, valid answer
 */
function validateQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) return [];
    return questions.filter(q =>
        q &&
        q.text &&
        q.options &&
        q.options.A && q.options.B && q.options.C && q.options.D &&
        ['A','B','C','D'].includes(q.answer)
    );
}

/**
 * QuizLauncher — full fallback chain, guaranteed to return questions
 *
 * Priority:
 *   1. window.quizData (embedded by workflow) ← zero network calls
 *   2. window.previousQuizData (previous period, also embedded)
 *   3. Questt-resources archive for current period
 *   4. Questt-resources archive for previous period
 *   5. sampleQuestions from quiz-app.js ← silent last resort, always works
 */
class QuizLauncher {
    constructor() {
        this.metadata = window.quizMetadata || {};
        this.period   = this.metadata.period || 1;
    }

    /**
     * Main entry point — always returns a non-empty questions array
     */
    async initializeFromUrl() {
        // --- Level 1: embedded current data ---
        if (window.quizData && Array.isArray(window.quizData) && window.quizData.length > 0) {
            const valid = validateQuestions(normaliseEmbeddedQuestions(window.quizData));
            if (valid.length > 0) {
                console.log(`✓ Using embedded quizData (${valid.length} questions)`);
                return valid;
            }
        }

        // --- Level 2: embedded previous period data ---
        if (window.previousQuizData && Array.isArray(window.previousQuizData) && window.previousQuizData.length > 0) {
            const valid = validateQuestions(normaliseEmbeddedQuestions(window.previousQuizData));
            if (valid.length > 0) {
                console.warn('⚠ Embedded data empty/invalid — using embedded previousQuizData');
                this._showPreviousBanner();
                return valid;
            }
        }

        // --- Level 3: fetch from Questt-resources archive (current period) ---
        const currentArchiveQuestions = await this._fetchArchive(this.period);
        if (currentArchiveQuestions.length > 0) {
            console.warn('⚠ Embedded data missing — loaded from archive (current period)');
            return currentArchiveQuestions;
        }

        // --- Level 4: fetch from Questt-resources archive (previous period) ---
        if (this.period > 1) {
            const prevArchiveQuestions = await this._fetchArchive(this.period - 1);
            if (prevArchiveQuestions.length > 0) {
                console.warn('⚠ Using archive from previous period as fallback');
                this._showPreviousBanner();
                return prevArchiveQuestions;
            }
        }

        // --- Level 5: sampleQuestions (always available, defined in quiz-app.js) ---
        console.warn('⚠ All sources failed — using built-in sample questions');
        if (typeof sampleQuestions !== 'undefined' && sampleQuestions.length > 0) {
            return validateQuestions(normaliseEmbeddedQuestions(sampleQuestions));
        }

        // Should be unreachable, but just in case
        throw new Error('FATAL: No question source available');
    }

    /**
     * Fetch all subjects for the current quiz from the archive for a given period
     */
    async _fetchArchive(period) {
        // Determine which subjects to fetch
        const subjects = this._getSubjectsForThisPage();
        if (!subjects || subjects.length === 0) return [];

        const allQuestions = [];
        for (const subject of subjects) {
            const url = buildArchiveUrl(period, subject);
            if (!url) continue;
            const questions = await fetchAndParseQuestions(url, subject);
            const valid = validateQuestions(normaliseEmbeddedQuestions(questions, subject));
            allQuestions.push(...valid);
        }
        return allQuestions;
    }

    /**
     * Determine which subjects belong on this page from metadata or cluster name
     */
    _getSubjectsForThisPage() {
        // Try to get cluster name from page filename
        const filename = window.location.pathname.split('/').pop().replace('.html','');

        // Check cluster map
        for (const [clusterKey, subjects] of Object.entries(QUIZ_CONFIG.clusters)) {
            if (filename.includes(clusterKey)) return subjects;
        }

        // Fall back to metadata subject (individual subject quiz)
        const subject = this.metadata.subject;
        if (subject && QUIZ_CONFIG.subjectFiles[subject]) return [subject];

        // Try all subjects listed in metadata
        if (this.metadata.subjects) {
            return this.metadata.subjects
                .split(',')
                .map(s => s.trim())
                .filter(s => QUIZ_CONFIG.subjectFiles[s]);
        }

        return [];
    }

    _showPreviousBanner() {
        // Show a soft non-blocking banner — never an error screen
        const titleEl = document.getElementById('error-title');
        const msgEl   = document.getElementById('error-message');
        const banner  = document.getElementById('error-banner');
        if (!banner) return;
        if (titleEl) titleEl.textContent = 'Showing Previous Quiz';
        if (msgEl)   msgEl.textContent   = "Today's quiz is still being prepared. You're practising the previous set.";
        banner.classList.remove('hidden');
        banner.style.backgroundColor = '#fef3c7';
        const icon = banner.querySelector('i');
        if (icon) icon.style.color = '#f59e0b';
    }
}

// ─── Navigation helpers called from cluster pages ────────────────────────────

/**
 * Map of cluster shortcodes (used in science_clusters.html etc.)
 * to the actual generated quiz filenames.
 */
const CLUSTER_FILE_MAP = {
    // Science
    'mepc':             'quiz-science-cluster-a.html',
    'bepc':             'quiz-science-cluster-b.html',
    'science-a':        'quiz-science-cluster-a.html',
    'science-b':        'quiz-science-cluster-b.html',
    // Arts
    'arts-a':           'quiz-arts-cluster-a.html',
    // Commercial
    'comm-a':           'quiz-commercial-cluster-a.html',
    'comm-b':           'quiz-commercial-cluster-b.html',
    'comm-c':           'quiz-commercial-cluster-c.html',
    'commercial-a':     'quiz-commercial-cluster-a.html',
    'commercial-b':     'quiz-commercial-cluster-b.html',
    'commercial-c':     'quiz-commercial-cluster-c.html'
};

function startQuiz(clusterKey) {
    const file = CLUSTER_FILE_MAP[clusterKey];
    if (!file) {
        console.error(`Unknown cluster key: ${clusterKey}`);
        return;
    }
    _showLoadingOverlay();
    setTimeout(() => { window.location.href = file; }, 400);
}

function startSubjectQuiz(subject) {
    const file = `quiz-${subject.toLowerCase()}.html`;
    _showLoadingOverlay();
    setTimeout(() => { window.location.href = file; }, 400);
}

function _showLoadingOverlay() {
    // Use app.js overlay if available, otherwise create a minimal one
    if (window.GrantApp) {
        window.GrantApp.showLoading();
        return;
    }
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
