# Complete GitHub Actions Workflow

## Overview
**Trigger:** Every 2 days at 3 AM OR when `.txt` file uploaded to Questt repo 
**Start Date:** Feb 10, 2026  
**Cycle:** 50 cycles (Day 1-2, Day 3-4, ... Day 99-100)

---

## Workflow Steps

### 1. **Trigger Conditions**
```yaml
on:
  schedule:
    - cron: '0 3 */2 * *'  # 3 AM every 2 days
  push:
    branches: [main]
    paths:
      - '*.txt'  # Any .txt file upload
  workflow_dispatch:  # Manual trigger option
```

### 2. **Calculate Current Day**
```
Current Date - Feb 10, 2026 = Days Elapsed
Days Elapsed / 2 = Current Period (1-50)
Example: Feb 14 = Day 4 = Period 2 (Day 3-4)
```

### 3. **Check If Already Generated**
```
Check if quiz files exist in 100Days-to-UTME with metadata:
  <!-- Generated: Period 2, Day 3-4, 2026-02-12 -->

If exists AND period matches:
  → Skip generation (already done)
Else:
  → Proceed to generation
```

### 4. **Generate Quiz HTML Files**

**Action: Fetch questions from Questt**
```
Fetch all .txt files:
  - JAMB_Physics_Q1-35.txt
  - JAMB_Mathematics_Q1-35.txt
  - JAMB_English_Q1-35.txt
  - JAMB_Chemistry_Q1-35.txt
  - JAMB_Biology_Q1-35.txt (if exists)
  - etc.
```

**Action: Parse and embed questions**
```python
for each subject_file:
  parse questions → JSON array
  embed into quiz-{subject}.html template
  add metadata: <!-- Period X, Day Y-Z, Date -->
```

**Action: Generate cluster quizzes**
```python
# Science Cluster A
combine: [Physics, Math, English, Chemistry] → quiz-science-cluster-a.html

# Science Cluster B  
combine: [Biology, Physics, English, Chemistry] → quiz-science-cluster-b.html

# Arts Cluster A
combine: [English, Literature, Government, CRS] → quiz-arts-cluster-a.html

# Commercial Cluster A
combine: [English, Accounting, Commerce, Economics] → quiz-commercial-cluster-a.html
```

### 5. **Deploy to 100Days-to-UTME**
```
Commit generated files:
  - quiz-physics.html
  - quiz-mathematics.html
  - quiz-english.html
  - quiz-chemistry.html
  - quiz-science-cluster-a.html
  - quiz-science-cluster-b.html
  - quiz-arts-cluster-a.html
  - quiz-commercial-cluster-a.html

Commit message: "Generate quizzes for Day X-Y (Period Z)"
Push to 100Days-to-UTME main branch
```

### 6. **Archive to Questt-resources**
```
Create folder structure:
  questt-resources/
    archive/
      day-01-02/
        JAMB_Physics_Q1-35.txt
        JAMB_Mathematics_Q1-35.txt
        JAMB_English_Q1-35.txt
        JAMB_Chemistry_Q1-35.txt
        metadata.json (date, period, subjects)

Copy all .txt files from Questt → questt-resources/archive/day-XX-YY/
Commit message: "Archive questions for Day X-Y"
Push to Questt-resources main branch
```

### 7. **Clear Questt Repo**
```
Delete all .txt files from Questt repo
Commit message: "Clear used questions (Day X-Y)"
Push to Questt main branch

Result: Questt repo is now empty, ready for manual upload of next batch
```

---

## File Structure After One Cycle

**Questt (empty, awaiting manual upload):**
```
questt/
  README.md
  (empty - you upload Day 3-4 questions here)
```

**100Days-to-UTME (live quizzes):**
```
100Days-to-UTME/
  quiz-physics.html (Day 1-2 questions embedded)
  quiz-mathematics.html (Day 1-2 questions embedded)
  quiz-science-cluster-a.html (Day 1-2, 140 questions)
  ...
```

**Questt-resources (archive):**
```
questt-resources/
  archive/
    day-01-02/
      JAMB_Physics_Q1-35.txt
      JAMB_Mathematics_Q1-35.txt
      metadata.json
```

---

## Your Workflow (Manual Part)

**Every 2 days:**
1. Get notification: "Questt repo cleared, upload Day 3-4 questions"
2. Upload new `.txt` files to Questt via GitHub web
3. Automation triggers immediately (or waits until 3 AM)
4. New quizzes go live
5. Old questions archived
6. Repeat

---

## Automation Handles

✅ Calculating current day/period  
✅ Checking if already generated  
✅ Fetching questions from Questt  
✅ Parsing and embedding into HTML  
✅ Generating individual + cluster quizzes  
✅ Deploying to 100Days-to-UTME  
✅ Archiving to Questt-resources  
✅ Clearing Questt repo  
✅ All git commits and pushes  

---

## You Handle

📝 Uploading new question `.txt` files every 2 days  
📝 Ensuring questions increase in difficulty  

---

## Failure Safeguards

1. **Duplicate check:** Won't regenerate if period already done
2. **Manual trigger:** Can run workflow manually if needed
3. **Metadata tracking:** Each quiz file knows its period/date
4. **Archive backup:** All questions preserved forever
5. **GitHub Actions logs:** See exactly what happened each run

---

## Required Secrets (One-time Setup)

Need GitHub Personal Access Token with permissions to:
- Read from Questt repo
- Write to 100Days-to-UTME repo
- Write to Questt-resources repo

Stored as: `GITHUB_TOKEN` (secret in 100Days-to-UTME repo settings)

---

## Cost

**Free.** GitHub Actions: 2,000 minutes/month free
This workflow uses ~2 minutes per run = 30 runs/month = 60 minutes/month

---

**Ready for me to generate the actual `.github/workflows/auto-quiz.yml` file?**
