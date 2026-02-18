// question-parser.js - Complete Parser for JAMB Question Files

/**
 * Parse question text files into structured JSON format.
 * Handles:
 *   1. Question text
 *   A. Option A  …  D. Option D
 *   Answer: A
 *   Explanation: …
 *   Exception: …
 */

class QuestionParser {
    constructor() {
        this.questions = [];
    }

    /**
     * Parse raw text from a question file.
     * @param {string} text    - Raw text content
     * @param {string} subject - Subject label (Physics, Math, …)
     * @returns {Array} Parsed question objects
     */
    parse(text, subject) {
        this.questions = [];
        const lines = text.split('\n');
        let currentQuestion       = null;
        let collectingExplanation = false;
        let collectingException   = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line || line.startsWith('JAMB ') || line.includes('EXCEPTIONAL QUESTIONS')) continue;

            // Question number: "1. text…"
            const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (questionMatch) {
                if (currentQuestion) this.questions.push(currentQuestion);
                currentQuestion = {
                    id:          parseInt(questionMatch[1]),
                    subject:     subject,
                    text:        questionMatch[2],
                    options:     {},
                    answer:      null,
                    explanation: '',
                    exception:   ''
                };
                collectingExplanation = false;
                collectingException   = false;
                continue;
            }

            // Option: "A. text…"
            const optionMatch = line.match(/^([A-D])\.\s+(.+)$/);
            if (optionMatch && currentQuestion) {
                currentQuestion.options[optionMatch[1]] = optionMatch[2];
                collectingExplanation = false;
                collectingException   = false;
                continue;
            }

            if (line.startsWith('Answer:') && currentQuestion) {
                currentQuestion.answer = line.replace('Answer:', '').trim();
                collectingExplanation = false;
                collectingException   = false;
                continue;
            }

            if (line.startsWith('Explanation:') && currentQuestion) {
                currentQuestion.explanation = line.replace('Explanation:', '').trim();
                collectingExplanation = true;
                collectingException   = false;
                continue;
            }

            if (line.startsWith('Exception:') && currentQuestion) {
                currentQuestion.exception = line.replace('Exception:', '').trim();
                collectingExplanation = false;
                collectingException   = true;
                continue;
            }

            if (collectingExplanation && line && currentQuestion) {
                currentQuestion.explanation += ' ' + line;
                continue;
            }
            if (collectingException && line && currentQuestion) {
                currentQuestion.exception += ' ' + line;
                continue;
            }
        }

        if (currentQuestion) this.questions.push(currentQuestion);
        return this.questions;
    }

    /** Fetch a URL and parse it. Throws on HTTP error. */
    async parseFromUrl(url, subject) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`);
        const text = await response.text();
        return this.parse(text, subject);
    }

    toJSON()                       { return JSON.stringify(this.questions, null, 2); }
    toJavaScript(name = 'QUESTIONS') {
        return `const ${name} = ${JSON.stringify(this.questions, null, 2)};\nif (typeof module !== 'undefined') module.exports = ${name};\n`;
    }

    getStats() {
        return {
            total:            this.questions.length,
            subjects:         [...new Set(this.questions.map(q => q.subject))],
            withExplanations: this.questions.filter(q => q.explanation).length,
            withExceptions:   this.questions.filter(q => q.exception).length
        };
    }

    validate() {
        const errors = [];
        this.questions.forEach((q, i) => {
            if (!q.text)                           errors.push(`Q${i+1}: Missing text`);
            const keys = Object.keys(q.options);
            if (keys.length < 2)                   errors.push(`Q${i+1}: Need ≥2 options`);
            if (!q.answer)                         errors.push(`Q${i+1}: Missing answer`);
            else if (!q.options[q.answer])         errors.push(`Q${i+1}: Answer "${q.answer}" not in options`);
            keys.forEach(k => {
                if (!q.options[k]?.trim())         errors.push(`Q${i+1}: Empty option ${k}`);
            });
        });
        return errors;
    }
}

// ─── URL constants ─────────────────────────────────────────────────────────
const _ARCHIVE_BASE = 'https://raw.githubusercontent.com/artificialiman/Questt-resources/refs/heads/main/archive';
const _QUESTT_BASE  = 'https://raw.githubusercontent.com/artificialiman/Questt/refs/heads/main';

// Map subject name → filename used in both repos
const SUBJECT_FILES = {
    Physics:     'JAMB_Physics_Q1-35.txt',
    Mathematics: 'JAMB_Mathematics_Q1-35.txt',
    Math:        'JAMB_Mathematics_Q1-35.txt',
    English:     'JAMB_English_Q1-35.txt',
    Chemistry:   'JAMB_Chemistry_Q1-35.txt',
    Biology:     'JAMB_Biology_Q1-35.txt',
    Literature:  'JAMB_Literature_Q1-35.txt',
    Government:  'JAMB_Government_Q1-35.txt',
    CRS:         'JAMB_CRS_Q1-35.txt',
    Commerce:    'JAMB_Commerce_Q1-35.txt',
    Accounting:  'JAMB_Accounting_Q1-35.txt',
    Economics:   'JAMB_Economics_Q1-35.txt'
};

/** period 1 → "01-02", period 3 → "05-06" */
function _periodToDayRange(period) {
    const s = (period * 2) - 1;
    return `${String(s).padStart(2,'0')}-${String(s+1).padStart(2,'0')}`;
}

/**
 * Load a single subject — archive first, Questt live second.
 * Returns [] silently if both fail.
 *
 * @param {string} subject  - Subject key matching SUBJECT_FILES
 * @param {number} [period] - Current period number (1, 2, 3 …)
 */
async function loadSubjectWithFallback(subject, period) {
    const filename = SUBJECT_FILES[subject];
    if (!filename) { console.warn(`No filename mapping for subject: ${subject}`); return []; }

    const parser = new QuestionParser();

    // 1 ── Questt-resources archive (permanent, grows every period)
    if (period && period >= 1) {
        try {
            const url       = `${_ARCHIVE_BASE}/day-${_periodToDayRange(period)}/${filename}`;
            const questions = await parser.parseFromUrl(url, subject);
            if (questions.length > 0) {
                console.log(`✓ ${subject} from archive (period ${period})`);
                return questions;
            }
        } catch (e) {
            console.warn(`Archive miss [${subject}]:`, e.message);
        }
    }

    // 2 ── Questt live repo (only populated during active upload window)
    try {
        const url       = `${_QUESTT_BASE}/${filename}`;
        const questions = await parser.parseFromUrl(url, subject);
        if (questions.length > 0) {
            console.log(`✓ ${subject} from Questt live`);
            return questions;
        }
    } catch (e) {
        console.warn(`Questt live miss [${subject}]:`, e.message);
    }

    console.warn(`✗ Could not load ${subject} from any source — returning []`);
    return [];
}

/**
 * Load multiple subjects and return a keyed object.
 * @param {string[]} subjects  - Array of subject keys
 * @param {number}   [period]  - Current period (skips archive step if omitted)
 * @returns {Promise<Object>}  { Physics: [...], Mathematics: [...], … }
 */
async function loadAllSubjects(subjects, period) {
    const allQuestions = {};
    for (const subject of subjects) {
        allQuestions[subject] = await loadSubjectWithFallback(subject, period);
    }
    return allQuestions;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestionParser, loadAllSubjects, loadSubjectWithFallback, SUBJECT_FILES };
}
