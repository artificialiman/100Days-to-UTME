# Complete Integration Guide - Quiz System

## 🎯 Understanding the Flow

```
Cluster Page → Click Button → Quiz Launcher → Load Questions → Start Quiz
```

## 📁 File Structure

```
/100Days-to-UTME/
├── index.html                    # Home (stream selection)
├── science_clusters.html         # Science cluster selection
├── art_clusters.html            # Art cluster selection (create this)
├── commercial_clusters.html     # Commercial cluster selection (create this)
├── styles.css                   # Your existing styles
├── app.js                       # Your existing app logic
│
├── quiz.html                    # ← NEW: Main quiz interface
├── quiz-styles.css              # ← NEW: Quiz-specific styles
├── quiz-app.js                  # ← NEW: Quiz logic
├── question-parser.js           # ← NEW: Parses question files
└── quiz-launcher.js             # ← NEW: Handles question loading
```

## 🚀 Integration Steps

### Step 1: Add Quiz Files to Your Project

Copy these 5 new files:
- `quiz.html`
- `quiz-styles.css`
- `quiz-app.js`
- `question-parser.js`
- `quiz-launcher.js`

### Step 2: Configure Question Sources

Open `quiz-launcher.js` and update the configuration:

```javascript
const QUIZ_CONFIG = {
    questionBanks: {
        // Your current setup (GitHub)
        github: {
            baseUrl: 'https://raw.githubusercontent.com/artificialiman/Questt/refs/heads/main',
            subjects: {
                'Physics': 'JAMB_Physics_Q1-35.txt',
                'Mathematics': 'JAMB_Mathematics_Q1-35.txt',
                // ... etc
            }
        },
        
        // If you create a separate question bank repo
        questionBank: {
            baseUrl: 'https://raw.githubusercontent.com/artificialiman/QuestionBank/main',
            subjects: {
                'Physics': 'physics/questions.txt',
                'Mathematics': 'math/questions.txt'
            }
        },
        
        // If you move questions into your project
        local: {
            baseUrl: './questions',
            subjects: {
                'Physics': 'physics.txt',
                'Mathematics': 'mathematics.txt'
            }
        }
    },
    
    // Choose which source to use
    activeSource: 'github', // Change to 'questionBank' or 'local' as needed
    
    // Define your clusters
    clusters: {
        science: [
            {
                name: 'Science Cluster A',
                subjects: ['Mathematics', 'English', 'Physics', 'Chemistry']
            },
            {
                name: 'Science Cluster B',
                subjects: ['Biology', 'English', 'Physics', 'Chemistry']
            }
        ],
        art: [
            {
                name: 'Arts Cluster A',
                subjects: ['English', 'Literature', 'Government', 'CRS']
            }
        ],
        commercial: [
            {
                name: 'Commercial Cluster A',
                subjects: ['English', 'Accounting', 'Commerce', 'Economics']
            }
        ]
    }
};
```

### Step 3: Update Your Cluster Pages

#### For `science_clusters.html`:

**Add scripts at the bottom (before `</body>`):**
```html
<script src="question-parser.js"></script>
<script src="quiz-launcher.js"></script>
```

**Update your cluster buttons:**
```html
<!-- OLD WAY (manual) -->
<button class="btn btn-primary" onclick="window.location.href='quiz.html?subject=Physics'">
    Start Practice Test
</button>

<!-- NEW WAY (automatic) -->
<button class="btn btn-primary" onclick="startQuiz('science', 0)">
    <i class="fas fa-play"></i>
    Start Practice Test
</button>
```

#### Full Example Button:

```html
<div class="card cluster-card">
    <div class="card-body">
        <h3>Cluster A - Engineering & Sciences</h3>
        
        <div class="cluster-subjects">
            <span class="subject-tag">Mathematics</span>
            <span class="subject-tag">English</span>
            <span class="subject-tag">Physics</span>
            <span class="subject-tag">Chemistry</span>
        </div>
        
        <p class="text-muted">
            Perfect for Engineering, Computer Science, Architecture courses.
        </p>
        
        <!-- THE KEY LINE -->
        <button class="btn btn-primary w-full" onclick="startQuiz('science', 0)">
            <i class="fas fa-play"></i> Start Practice Test
        </button>
        
        <div class="text-xs text-muted mt-md text-center">
            <i class="fas fa-clock"></i> 15 minutes • 35 questions
        </div>
    </div>
</div>
```

### Step 4: Create Art & Commercial Cluster Pages

Copy `science_clusters_EXAMPLE.html` and modify:

#### `art_clusters.html`:
```html
<button onclick="startQuiz('art', 0)">
    Start Arts Cluster Test
</button>

<!-- Or single subject -->
<button onclick="startSubjectQuiz('Literature')">
    Practice Literature Only
</button>
```

#### `commercial_clusters.html`:
```html
<button onclick="startQuiz('commercial', 0)">
    Start Commercial Cluster A
</button>

<button onclick="startQuiz('commercial', 1)">
    Start Commercial Cluster B
</button>
```

## 🔄 How It Works

### When User Clicks Button:

1. **Button clicked**: `startQuiz('science', 0)`
2. **Loading screen appears** (animated spinner)
3. **Redirects to**: `quiz.html?stream=science&cluster=0`
4. **Quiz loads**:
   - Reads URL parameters
   - Finds cluster definition in config
   - Loads all subject questions
   - Starts timer
   - Displays first question

### URL Formats:

```javascript
// Single subject
quiz.html?subject=Physics

// Full cluster
quiz.html?stream=science&cluster=0

// Custom combination
quiz.html?subjects=Physics,Mathematics,English
```

## 📦 Question Bank Scenarios

### Scenario 1: Current Setup (GitHub - Questt Repo)
✅ Already configured
```javascript
activeSource: 'github'
```
No changes needed!

### Scenario 2: Create Separate Question Bank Repo

**Create new repo**: `QuestionBank`

Structure:
```
QuestionBank/
├── physics/
│   └── jamb-questions.txt
├── mathematics/
│   └── jamb-questions.txt
└── english/
    └── jamb-questions.txt
```

**Update config:**
```javascript
questionBanks: {
    questionBank: {
        baseUrl: 'https://raw.githubusercontent.com/artificialiman/QuestionBank/main',
        subjects: {
            'Physics': 'physics/jamb-questions.txt',
            'Mathematics': 'mathematics/jamb-questions.txt'
        }
    }
},
activeSource: 'questionBank'
```

### Scenario 3: Move Questions Into Project

Create folder:
```
/100Days-to-UTME/
└── questions/
    ├── physics.txt
    ├── mathematics.txt
    ├── english.txt
    └── chemistry.txt
```

**Update config:**
```javascript
questionBanks: {
    local: {
        baseUrl: './questions',
        subjects: {
            'Physics': 'physics.txt',
            'Mathematics': 'mathematics.txt'
        }
    }
},
activeSource: 'local'
```

## 🎨 Customization Examples

### Change Quiz Duration:
```javascript
// In quiz-launcher.js
duration: 1800, // 30 minutes instead of 15
```

### Add New Subject:
```javascript
// In quiz-launcher.js
subjects: {
    'Physics': 'JAMB_Physics_Q1-35.txt',
    'Biology': 'JAMB_Biology_Q1-35.txt', // ← Add this
}
```

### Add New Cluster:
```javascript
clusters: {
    science: [
        {
            name: 'Science Cluster C',
            subjects: ['Mathematics', 'Physics', 'Further Math', 'Chemistry']
        }
    ]
}
```

Then add button:
```html
<button onclick="startQuiz('science', 2)">
    Start Cluster C
</button>
```

### Change Button Styles:
```html
<!-- Primary style -->
<button class="btn btn-primary" onclick="startQuiz('science', 0)">
    Start Test
</button>

<!-- Secondary style -->
<button class="btn btn-secondary" onclick="startSubjectQuiz('Physics')">
    Practice Physics
</button>

<!-- Accent style -->
<button class="btn btn-accent" onclick="startQuiz('science', 0)">
    Premium Test
</button>
```

## 🐛 Troubleshooting

### Issue: Questions Not Loading

**Check:**
1. Console for errors (F12 → Console)
2. Network tab (F12 → Network) - Are files loading?
3. Question file URLs are correct
4. CORS issues (GitHub raw URLs should work)

**Fix:**
```javascript
// Test individual subject loading
const launcher = new QuizLauncher();
launcher.loadSubject('Physics')
    .then(questions => console.log('Loaded:', questions))
    .catch(error => console.error('Failed:', error));
```

### Issue: Button Does Nothing

**Check:**
```html
<!-- Verify scripts are loaded -->
<script src="question-parser.js"></script>
<script src="quiz-launcher.js"></script>

<!-- Check browser console for errors -->
```

### Issue: Wrong Questions Loading

**Check cluster definition:**
```javascript
// In quiz-launcher.js
console.log('Cluster 0:', QUIZ_CONFIG.clusters.science[0]);
```

## ✅ Testing Checklist

Before going live, test:

- [ ] Click each cluster button from science_clusters.html
- [ ] Click individual subject buttons
- [ ] Timer counts down correctly
- [ ] Can navigate between questions
- [ ] Can flag questions
- [ ] Can clear answers
- [ ] Submit modal shows correct stats
- [ ] Works on mobile (iOS Safari, Chrome Android)
- [ ] Questions parse correctly (use parser-demo.html)
- [ ] All subjects load without errors

## 🚀 Quick Start Commands

```bash
# 1. Copy files to your project
cp quiz*.* question-parser.js quiz-launcher.js /path/to/100Days-to-UTME/

# 2. Update science_clusters.html
# Add scripts and update buttons (see examples above)

# 3. Test locally
# Open science_clusters.html in browser
# Click "Start Practice Test"
# Verify questions load

# 4. Deploy
git add .
git commit -m "Add quiz interface"
git push
```

## 📱 Mobile Testing

Test on real devices:
1. Open on iPhone (Safari)
2. Tap "Share" → "Add to Home Screen"
3. Open from home screen
4. Test offline functionality

## 🎓 Next Steps

After basic integration works:

1. **Add more subjects** to `quiz-launcher.js`
2. **Create art_clusters.html** following `science_clusters_EXAMPLE.html`
3. **Create commercial_clusters.html** same way
4. **Add results page** (show score, review answers)
5. **Add practice mode** (show explanations immediately)
6. **Track progress** (save scores to localStorage)

---

## Need Help?

Common questions answered:

**Q: Do I need to manually update every cluster page?**
A: No! Just add the two scripts and update buttons to use `startQuiz()`. The launcher handles everything.

**Q: What if I move my question bank?**
A: Just change `activeSource` in `quiz-launcher.js` - no other changes needed.

**Q: Can I mix different question sources?**
A: Yes! Define multiple sources and switch between them by changing `activeSource`.

**Q: How do I add a new cluster?**
A: Add to `clusters` object in `quiz-launcher.js`, then add button with `onclick="startQuiz('stream', index)"`.

You're all set! 🎉
