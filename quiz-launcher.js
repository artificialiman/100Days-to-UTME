// quiz-launcher.js - Handles Quiz Initialization and Question Loading

/**
 * Quiz Configuration
 * Centralized config for easy updates
 */
const QUIZ_CONFIG = {
    // Question sources
    questionBanks: {
        // Primary: Local files in 100Days repo root (permanent fallback)
        local: {
            baseUrl: '.',
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
        },
        
        // Secondary: Questt repo (fresh questions when available)
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
    
    // Fallback order: try local first, then github
    fallbackOrder: ['local', 'github'],
    
    // Quiz settings
    duration: 900, // 15 minutes in seconds
    questionsPerSubject: 35,
    
    // Cluster definitions
    clusters: {
        science: [
            {
                name: 'Science Cluster A',
                subjects: ['Mathematics', 'English', 'Physics', 'Chemistry'],
                description: 'For Engineering, Medicine, Sciences'
            },
            {
                name: 'Science Cluster B',
                subjects: ['Biology', 'English', 'Physics', 'Chemistry'],
                description: 'For Medicine, Pharmacy, Nursing'
            }
        ],
        art: [
            {
                name: 'Arts Cluster A',
                subjects: ['English', 'Literature', 'Government', 'CRS'],
                description: 'For Law, Mass Comm, Languages'
            }
        ],
        commercial: [
            {
                name: 'Commercial Cluster A',
                subjects: ['English', 'Accounting', 'Commerce', 'Economics'],
                description: 'For Accounting, Business Admin'
            },
            {
                name: 'Commercial Cluster B',
                subjects: ['English', 'Mathematics', 'Economics', 'Government'],
                description: 'For Economics, Finance'
            },
            {
                name: 'Commercial Cluster C',
                subjects: ['English', 'Economics', 'Government', 'Commerce'],
                description: 'For Public Admin, Business'
            }
        ]
    }
};

/**
 * Quiz Launcher Class
 * Handles loading questions with fallback chain
 */
class QuizLauncher {
    constructor(config = QUIZ_CONFIG) {
        this.config = config;
        this.cache = {}; // Cache loaded questions
    }
    
    /**
     * Get URL for a subject from specific source
     */
    getQuestionUrl(subject, sourceName) {
        const source = this.config.questionBanks[sourceName];
        if (!source) {
            throw new Error(`Invalid source: ${sourceName}`);
        }
        
        const filename = source.subjects[subject];
        if (!filename) {
            throw new Error(`Subject "${subject}" not found in ${sourceName} source`);
        }
        
        return `${source.baseUrl}/${filename}`;
    }
    
    /**
     * Try to load from a specific source
     */
    async tryLoadFromSource(subject, sourceName) {
        try {
            const url = this.getQuestionUrl(subject, sourceName);
            console.log(`Trying ${sourceName}: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            const parser = new QuestionParser();
            const questions = parser.parse(text, subject);
            
            console.log(`✓ Loaded ${questions.length} ${subject} questions from ${sourceName}`);
            return questions;
            
        } catch (error) {
            console.warn(`Failed to load ${subject} from ${sourceName}:`, error.message);
            return null;
        }
    }
    
    /**
     * Load questions for a single subject with fallback chain
     */
    async loadSubject(subject) {
        // Check cache first
        if (this.cache[subject]) {
            console.log(`Using cached questions for ${subject}`);
            return this.cache[subject];
        }
        
        // Try each source in fallback order
        for (const sourceName of this.config.fallbackOrder) {
            const questions = await this.tryLoadFromSource(subject, sourceName);
            if (questions && questions.length > 0) {
                // Cache successful load
                this.cache[subject] = questions;
                return questions;
            }
        }
        
        // All sources failed
        throw new Error(`Failed to load ${subject} from all sources: ${this.config.fallbackOrder.join(', ')}`);
    }
    
    /**
     * Load questions for multiple subjects (cluster)
     */
    async loadCluster(subjects) {
        const allQuestions = [];
        const errors = [];
        
        for (const subject of subjects) {
            try {
                const questions = await this.loadSubject(subject);
                allQuestions.push(...questions);
            } catch (error) {
                errors.push({ subject, error: error.message });
            }
        }
        
        if (errors.length > 0) {
            console.warn('Some subjects failed to load:', errors);
        }
        
        if (allQuestions.length === 0) {
            throw new Error('No questions loaded. All subjects failed.');
        }
        
        return {
            questions: allQuestions,
            errors,
            loadedSubjects: subjects.length - errors.length,
            totalSubjects: subjects.length
        };
    }
    
    /**
     * Get cluster definition
     */
    getCluster(stream, clusterIndex = 0) {
        const streamClusters = this.config.clusters[stream];
        if (!streamClusters) {
            throw new Error(`Invalid stream: ${stream}`);
        }
        
        if (clusterIndex >= streamClusters.length) {
            throw new Error(`Cluster index ${clusterIndex} not found for ${stream}`);
        }
        
        return streamClusters[clusterIndex];
    }
    
    /**
     * Start quiz from URL parameters
     * Expected formats:
     * - quiz.html?subject=Physics
     * - quiz.html?stream=science&cluster=0
     * - quiz.html?subjects=Physics,Mathematics,English,Chemistry
     */
    async initializeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // Single subject mode
        if (params.has('subject')) {
            const subject = params.get('subject');
            return await this.loadSubject(subject);
        }
        
        // Cluster mode
        if (params.has('stream')) {
            const stream = params.get('stream');
            const clusterIndex = parseInt(params.get('cluster') || '0');
            const cluster = this.getCluster(stream, clusterIndex);
            const result = await this.loadCluster(cluster.subjects);
            return result.questions;
        }
        
        // Custom subjects mode
        if (params.has('subjects')) {
            const subjects = params.get('subjects').split(',');
            const result = await this.loadCluster(subjects);
            return result.questions;
        }
        
        throw new Error('No valid quiz parameters found. Use ?subject=X or ?stream=X&cluster=Y');
    }
}

/**
 * Helper function to start quiz from cluster page
 * Call this from your cluster selection buttons
 */
function startQuiz(stream, clusterIndex = 0) {
    // Validate cluster exists
    const cluster = QUIZ_CONFIG.clusters[stream]?.[clusterIndex];
    if (!cluster) {
        alert(`Error: Cluster not found for ${stream} cluster ${clusterIndex}`);
        return;
    }
    
    // Show loading state
    const loadingHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(0,0,0,0.9); display: flex; align-items: center; 
                    justify-content: center; z-index: 9999;">
            <div style="text-align: center; color: white;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
                    Loading Your Test
                </div>
                <div style="font-size: 1rem; opacity: 0.8;">
                    ${cluster.name} - ${cluster.subjects.join(', ')}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    // Navigate to quiz
    setTimeout(() => {
        window.location.href = `quiz.html?stream=${stream}&cluster=${clusterIndex}`;
    }, 500);
}

/**
 * Helper function to start single-subject quiz
 */
function startSubjectQuiz(subject) {
    const loadingHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(0,0,0,0.9); display: flex; align-items: center; 
                    justify-content: center; z-index: 9999;">
            <div style="text-align: center; color: white;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div style="font-size: 1.5rem; font-weight: 600;">
                    Loading ${subject} Practice Test
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    setTimeout(() => {
        window.location.href = `quiz.html?subject=${subject}`;
    }, 500);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuizLauncher, QUIZ_CONFIG, startQuiz, startSubjectQuiz };
}
