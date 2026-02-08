// question-parser.js - Complete Parser for JAMB Question Files

/**
 * Parse question text files into structured JSON format
 * Handles the format:
 * 1. Question text
 * A. Option A
 * B. Option B
 * C. Option C
 * D. Option D
 * Answer: A
 * Explanation: ...
 * Exception: ...
 */

class QuestionParser {
    constructor() {
        this.questions = [];
    }
    
    /**
     * Parse a complete question file text
     * @param {string} text - Raw text from question file
     * @param {string} subject - Subject name (Physics, Math, etc.)
     * @returns {Array} Array of parsed question objects
     */
    parse(text, subject) {
        this.questions = [];
        const lines = text.split('\n');
        let currentQuestion = null;
        let collectingExplanation = false;
        let collectingException = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and header
            if (!line || line.startsWith('JAMB ') || line.includes('EXCEPTIONAL QUESTIONS')) {
                continue;
            }
            
            // Match question number pattern (e.g., "1. " or "35. ")
            const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (questionMatch) {
                // Save previous question if exists
                if (currentQuestion) {
                    this.questions.push(currentQuestion);
                }
                
                // Start new question
                currentQuestion = {
                    id: parseInt(questionMatch[1]),
                    subject: subject,
                    text: questionMatch[2],
                    options: {},
                    answer: null,
                    explanation: '',
                    exception: ''
                };
                collectingExplanation = false;
                collectingException = false;
                continue;
            }
            
            // Match options (A., B., C., D.)
            const optionMatch = line.match(/^([A-D])\.\s+(.+)$/);
            if (optionMatch && currentQuestion) {
                currentQuestion.options[optionMatch[1]] = optionMatch[2];
                collectingExplanation = false;
                collectingException = false;
                continue;
            }
            
            // Match answer
            if (line.startsWith('Answer:') && currentQuestion) {
                currentQuestion.answer = line.replace('Answer:', '').trim();
                collectingExplanation = false;
                collectingException = false;
                continue;
            }
            
            // Match explanation
            if (line.startsWith('Explanation:') && currentQuestion) {
                currentQuestion.explanation = line.replace('Explanation:', '').trim();
                collectingExplanation = true;
                collectingException = false;
                continue;
            }
            
            // Match exception
            if (line.startsWith('Exception:') && currentQuestion) {
                currentQuestion.exception = line.replace('Exception:', '').trim();
                collectingExplanation = false;
                collectingException = true;
                continue;
            }
            
            // Continue collecting explanation
            if (collectingExplanation && line && currentQuestion) {
                currentQuestion.explanation += ' ' + line;
                continue;
            }
            
            // Continue collecting exception
            if (collectingException && line && currentQuestion) {
                currentQuestion.exception += ' ' + line;
                continue;
            }
        }
        
        // Don't forget the last question
        if (currentQuestion) {
            this.questions.push(currentQuestion);
        }
        
        return this.questions;
    }
    
    /**
     * Parse from a URL
     * @param {string} url - URL to question file
     * @param {string} subject - Subject name
     * @returns {Promise<Array>} Parsed questions
     */
    async parseFromUrl(url, subject) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
            }
            const text = await response.text();
            return this.parse(text, subject);
        } catch (error) {
            console.error('Error parsing from URL:', error);
            throw error;
        }
    }
    
    /**
     * Export questions as JSON
     * @returns {string} JSON string
     */
    toJSON() {
        return JSON.stringify(this.questions, null, 2);
    }
    
    /**
     * Export questions as JavaScript file content
     * @param {string} variableName - Variable name for the questions array
     * @returns {string} JavaScript file content
     */
    toJavaScript(variableName = 'QUESTIONS') {
        return `// Auto-generated question file
const ${variableName} = ${JSON.stringify(this.questions, null, 2)};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${variableName};
}
`;
    }
    
    /**
     * Get statistics about parsed questions
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            total: this.questions.length,
            subjects: [...new Set(this.questions.map(q => q.subject))],
            withExplanations: this.questions.filter(q => q.explanation).length,
            withExceptions: this.questions.filter(q => q.exception).length,
            optionCounts: this.questions.map(q => Object.keys(q.options).length)
        };
    }
    
    /**
     * Validate all questions
     * @returns {Array} Array of validation errors
     */
    validate() {
        const errors = [];
        
        this.questions.forEach((q, index) => {
            // Check required fields
            if (!q.text) {
                errors.push(`Question ${index + 1}: Missing question text`);
            }
            
            // Check options
            const optionKeys = Object.keys(q.options);
            if (optionKeys.length < 2) {
                errors.push(`Question ${index + 1}: Need at least 2 options`);
            }
            
            // Check answer
            if (!q.answer) {
                errors.push(`Question ${index + 1}: Missing answer`);
            } else if (!optionKeys.includes(q.answer)) {
                errors.push(`Question ${index + 1}: Answer "${q.answer}" not in options [${optionKeys.join(', ')}]`);
            }
            
            // Check for empty options
            optionKeys.forEach(key => {
                if (!q.options[key] || q.options[key].trim() === '') {
                    errors.push(`Question ${index + 1}: Empty option ${key}`);
                }
            });
        });
        
        return errors;
    }
}

// Utility function to load all subjects
async function loadAllSubjects() {
    const baseUrl = 'https://raw.githubusercontent.com/artificialiman/Questt/refs/heads/main';
    const subjects = ['Physics', 'Mathematics', 'English', 'Chemistry'];
    const parser = new QuestionParser();
    const allQuestions = {};
    
    for (const subject of subjects) {
        try {
            console.log(`Loading ${subject}...`);
            const url = `${baseUrl}/JAMB_${subject}_Q1-35.txt`;
            const questions = await parser.parseFromUrl(url, subject);
            allQuestions[subject] = questions;
            console.log(`✓ Loaded ${questions.length} ${subject} questions`);
        } catch (error) {
            console.error(`✗ Failed to load ${subject}:`, error);
            allQuestions[subject] = [];
        }
    }
    
    return allQuestions;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestionParser, loadAllSubjects };
}
