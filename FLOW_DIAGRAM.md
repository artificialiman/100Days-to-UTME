# Quiz System Flow - Visual Guide

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

Step 1: Choose Stream
┌──────────────┐
│  index.html  │  User selects: Science / Arts / Commercial
└──────┬───────┘
       │
       ▼
       
Step 2: Choose Cluster
┌────────────────────────┐
│ science_clusters.html  │  User sees:
│                        │  - Cluster A (Math+Phys+Chem+Eng)
│  ┌──────────────────┐ │  - Cluster B (Bio+Phys+Chem+Eng)
│  │ Cluster A Card   │ │  - Individual subjects
│  │                  │ │
│  │ [Start Test] ←───┼─┼── onclick="startQuiz('science', 0)"
│  └──────────────────┘ │
└────────┬───────────────┘
         │
         ▼
         
Step 3: Loading (quiz-launcher.js handles this)
┌─────────────────────────────────────┐
│  Quiz Launcher                      │
│  ┌───────────────────────────────┐ │
│  │ 1. Read URL parameters        │ │  quiz.html?stream=science&cluster=0
│  │ 2. Find cluster definition    │ │  → [Math, English, Physics, Chemistry]
│  │ 3. Load each subject:         │ │
│  │    - Fetch Physics.txt        │ │
│  │    - Fetch Math.txt           │ │  From GitHub/Local/QuestionBank
│  │    - Fetch English.txt        │ │
│  │    - Fetch Chemistry.txt      │ │
│  │ 4. Parse all questions        │ │
│  │ 5. Combine into one array     │ │
│  └───────────────────────────────┘ │
└─────────┬───────────────────────────┘
          │
          ▼
          
Step 4: Quiz Interface (quiz.html)
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐   │
│  │ Header: Timer | Physics | Q1 of 35         │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌────────────────────────────┐     │
│  │ Sidebar  │  │ Question Card              │     │
│  │          │  │                             │     │
│  │ [1][2]   │  │ Q1: Question text here...  │     │
│  │ [3][4]   │  │                             │     │
│  │ ...      │  │ A. Option A                 │     │
│  │ [35]     │  │ B. Option B ✓               │     │
│  │          │  │ C. Option C                 │     │
│  │          │  │ D. Option D                 │     │
│  │          │  │                             │     │
│  │          │  │ [Prev] [Clear] [Next]       │     │
│  └──────────┘  └────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## 🔧 Configuration System

```javascript
// quiz-launcher.js - SINGLE SOURCE OF TRUTH

QUIZ_CONFIG = {
    // Where are questions stored?
    questionBanks: {
        github: { ... },      // Your current Questt repo
        local: { ... },       // If you move to project
        questionBank: { ... } // If you create separate repo
    },
    
    // Which source to use? (EASY TO SWITCH)
    activeSource: 'github',  // ← Change this one line
    
    // What clusters exist?
    clusters: {
        science: [
            { subjects: ['Math', 'English', 'Physics', 'Chemistry'] },
            { subjects: ['Biology', 'English', 'Physics', 'Chemistry'] }
        ],
        art: [...],
        commercial: [...]
    }
}
```

## 📝 Answer to Your Questions

### Q1: "How does science cluster lead to quiz?"

```html
<!-- In science_clusters.html -->

<!-- Add these scripts ONCE at bottom -->
<script src="question-parser.js"></script>
<script src="quiz-launcher.js"></script>

<!-- Update your buttons -->
<button class="btn btn-primary" onclick="startQuiz('science', 0)">
    Start Practice Test
</button>
                                     ↓
                    This function is in quiz-launcher.js
                                     ↓
                    It redirects to: quiz.html?stream=science&cluster=0
                                     ↓
                    quiz.html loads and reads these parameters
                                     ↓
                    Loads: Math, English, Physics, Chemistry questions
```

### Q2: "What when I upload art and commercial clusters?"

```html
<!-- Create art_clusters.html -->
<button onclick="startQuiz('art', 0)">
    Start Arts Test
</button>

<!-- Create commercial_clusters.html -->
<button onclick="startQuiz('commercial', 0)">
    Start Commercial Test
</button>

<!-- Add subjects to quiz-launcher.js -->
subjects: {
    'Literature': 'JAMB_Literature_Q1-35.txt',
    'Government': 'JAMB_Government_Q1-35.txt',
    'Commerce': 'JAMB_Commerce_Q1-35.txt',
    // etc...
}
```

### Q3: "If I move questions to separate question bank?"

**Option A: Create new repo "QuestionBank"**
```javascript
// In quiz-launcher.js - Change TWO lines:

questionBanks: {
    questionBank: {
        baseUrl: 'https://raw.githubusercontent.com/artificialiman/QuestionBank/main',
        subjects: {
            'Physics': 'physics/questions.txt',
            'Mathematics': 'math/questions.txt'
        }
    }
},

activeSource: 'questionBank'  // ← Just change this!
```

**Option B: Move to project folder**
```
/100Days-to-UTME/
└── questions/
    ├── physics.txt
    ├── math.txt
    └── english.txt
```

```javascript
// In quiz-launcher.js:
questionBanks: {
    local: {
        baseUrl: './questions',
        subjects: {
            'Physics': 'physics.txt'
        }
    }
},
activeSource: 'local'  // ← Just change this!
```

## 🎯 Key Points

### You DON'T Need To:
❌ Manually update hrefs in every cluster page  
❌ Write separate code for each cluster  
❌ Copy-paste question loading code  
❌ Remember complex URL patterns  

### You ONLY Need To:
✅ Add 2 scripts to each cluster page  
✅ Use `startQuiz('stream', clusterIndex)` on buttons  
✅ Configure quiz-launcher.js ONCE  
✅ Deploy and it works!  

## 🚀 From Zero to Working Quiz

**Minute 1-2: Copy Files**
```bash
# Copy 5 files to your project
quiz.html
quiz-styles.css
quiz-app.js
question-parser.js
quiz-launcher.js
```

**Minute 3-5: Update science_clusters.html**
```html
<!-- Bottom of file, before </body> -->
<script src="question-parser.js"></script>
<script src="quiz-launcher.js"></script>

<!-- Update any cluster button -->
<button onclick="startQuiz('science', 0)">Start Test</button>
```

**Minute 6: Test**
```
1. Open science_clusters.html
2. Click "Start Test"
3. Watch questions load
4. Take quiz!
```

**Done!** ✅

## 💡 Example Scenarios

### Scenario 1: Add Biology
```javascript
// In quiz-launcher.js, add to subjects:
'Biology': 'JAMB_Biology_Q1-35.txt',

// In clusters, create new cluster:
{
    name: 'Medical Sciences',
    subjects: ['Biology', 'English', 'Physics', 'Chemistry']
}

// In science_clusters.html:
<button onclick="startQuiz('science', 1)">
    Start Medical Sciences Test
</button>
```

### Scenario 2: Move to New Repo
```javascript
// In quiz-launcher.js:
questionBanks: {
    myNewRepo: {
        baseUrl: 'https://raw.githubusercontent.com/artificialiman/JambQuestions/main',
        subjects: { ... }
    }
},
activeSource: 'myNewRepo'  // ONE LINE CHANGE
```

### Scenario 3: Mix and Match
```javascript
// Load 2 subjects from GitHub, 2 from local
// The system handles it automatically!
<button onclick="startQuiz('science', 0)">
    Start Mixed Test
</button>
```

That's it! The system is flexible and handles all the complexity for you. 🎉
