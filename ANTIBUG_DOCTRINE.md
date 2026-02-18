# 100Days-to-UTME — Antibug Doctrine & Op Manual
> **Rule Zero:** Every file has one job. Never let a fix in one file bleed into another file's job.

---

## 1. File Ownership Map

| File | Owns | Must NOT touch |
|---|---|---|
| `quiz-app.js` | Quiz state, UI rendering, navigation, timer, PDF generation | DOM structure, CSS classes not in quiz-styles.css |
| `question-parser.js` | JS-side `.txt` → question object parsing; `QuestionParser` class | Quiz UI, results, PDF |
| `quiz-template.html` | Structural HTML shell with `{{PLACEHOLDERS}}`; data validation; `initializeQuiz()` → `bootQuiz()` handoff | Any hardcoded content, quiz logic |
| `quiz-*.html` (generated) | **Never hand-edit** — YML owns these entirely | Everything |
| `quiz.html` | Dev/preview quiz page with embedded sample data | Generated file logic, workflow placeholders |
| `quiz-styles.css` | All quiz page styles | styles.css scope |
| `styles.css` | index + cluster page styles | Quiz page styles |
| `index.html` | Stream selection entry point | Notification UI, fake stats |
| `*_clusters.html` | Cluster/subject selection for each stream | Quiz logic, session state |
| `app.js` | Cluster/index page logic: timer, routing (`selectStream`, `selectCluster`, `launchQuiz`), modals | Quiz-page logic (quiz-app.js owns that) |
| `auto-quiz.yml` | CI pipeline: validate → generate → commit → archive → clear | HTML structure, CSS, JS logic, JSON handling |
| `parser.py` | `.txt` → JSON (stdout only) | File I/O beyond its input arg |
| `validate_questions.py` | Schema checking + validation report | Generating files |
| `generate_quiz.py` | Template population via Python `str.replace()` | Parsing, validation |
| `write_metadata.py` | Writes `metadata.json` from env vars | Any other file I/O |
| `collect_prev_questions.py` | Reads archive `.txt` files → JSON array | Writing to main-repo |

---

## 2. Bug History — All Resolved

### ✅ Bug 1 — index.html bloat
**Was:** Notification dropdown, fake upgrade button, broken footer copied from a richer mockup.  
**Fixed in:** `index.html` — notification dropdown removed from navbar; footer replaced with `site-footer` pattern matching cluster pages. Timer untouched.

### ✅ Bug 2 — Next/Prev buttons dead
**Was:** `quiz-launcher.js` referenced in script tags but the file does not exist. Browser silently fails the load; `QuizLauncher` and `QUIZ_CONFIG` are never defined; `DOMContentLoaded` in `quiz-app.js` throws immediately; zero event listeners ever attach.  
**Fixed in:** `quiz-template.html` + `quiz.html` — `quiz-launcher.js` script tag removed. `quiz-app.js` — replaced self-starting `DOMContentLoaded` with `bootQuiz(rawQuestions, metadata)` entry point called by the template after data validation.

### ✅ Bug 3 — No explanations on individual subject tests
**Was:** `renderQuestion()` never revealed the explanation div.  
**Fixed in:** `quiz-app.js` — `renderExplanation()` method added; called from `renderQuestion()` after every answer selection. Shows when an answer is selected; hides when none is selected.

### ✅ Bug 4 — Answer color bleed
**Was:** `.option:hover` and `.option.selected` shared identical background (`#fefce8`). Every hovered option looked permanently selected.  
**Fixed in:** `quiz-styles.css` — hover is cool blue (`#eff6ff` / `#bfdbfe` label), selected is warm gold. States are now visually unmistakable.

### ✅ Bug 5 — Submit should generate PDF
**Was:** `showResults()` was an `alert()` + `window.location.reload()` stub.  
**Fixed in:** `quiz-app.js` — `showResults()` calls `_generatePDF()` using jsPDF (loaded via cdnjs CDN). PDF contains: branded header, subject/period, score box with grade colour, time taken, full question-by-question breakdown table with tick/cross, paginated with footer. Graceful `alert()` fallback if jsPDF fails to load.

### ✅ Bug 6 — YML sed + JSON footgun
**Was:** `sed -i "s|{{QUESTIONS_JSON}}|$COMBINED_QUESTIONS|g"` — any `|` in question text silently corrupts output. Cluster generation used bash `declare -A`. Archive metadata used broken single-quoted heredoc so variables never expanded.  
**Fixed in:** `auto-quiz.yml` — all template population delegated to `generate_quiz.py`. Metadata writing delegated to `write_metadata.py`. Scripts run from `main-repo/` by full path with `PYTHONPATH=main-repo`; never copied to Questt.

### ✅ Bug 7 — Broken cluster routing in app.js
**Was:** `selectCluster()` routed to `practice_${cluster}.html` (files don't exist). `launchQuiz()` was undefined, making all art/commercial cluster buttons and individual subject buttons silent no-ops.  
**Fixed in:** `app.js` — `selectCluster()` maps shortcodes (`mepc`→`science-cluster-a`, `bepc`→`science-cluster-b`) then delegates to `launchQuiz()`. `launchQuiz(name)` routes to `quiz-${name}.html`. Exposed as `window.launchQuiz` for inline `onclick` attributes.

### ✅ Bug 8 — Data format mismatch
**Was:** `parser.py` outputs `{ optionA, optionB, optionC, optionD }`. `quiz-app.js` read `question.options['A']`. Options always rendered blank.  
**Fixed in:** `quiz-app.js` — `normalizeQuestions()` accepts both formats and converts to `{ options: {A,B,C,D} }` before rendering.

---

## 3. YML Rules

**It likes:**
- All template population done by `generate_quiz.py` with Python `str.replace()`
- All JSON reads done with `jq`, never `grep`/`awk` on JSON
- All metadata writing done by `write_metadata.py` reading env vars
- Scripts called as `PYTHONPATH=main-repo python main-repo/script.py`
- Steps `if:`-gated on prior step outputs

**It hates — never do these:**
- `sed` touching any `{{PLACEHOLDER}}` — especially `{{QUESTIONS_JSON}}`
- Adding a new `{{PLACEHOLDER}}` to `quiz-template.html` without adding the matching replacement in `generate_quiz.py`'s `replacements` dict
- Scripts copied to Questt repo — they run from `main-repo/`
- `rm -f *.py` in the clear step — scripts are never there
- `declare -A` bash associative arrays
- Heredoc with single-quoted EOF (`<<'EOF'`) when you need variable expansion

---

## 4. Routing Map (Complete)

| Entry point | Mechanism | Destination |
|---|---|---|
| `index.html` stream card | `onclick="selectStream('science')"` inline | `science_clusters.html` |
| `index.html` stream card | `onclick="selectStream('art')"` inline | `art_clusters.html` |
| `index.html` stream card | `onclick="selectStream('commercial')"` inline | `commercial_clusters.html` |
| `science_clusters.html` cluster button | `data-cluster="mepc"` → app.js `selectCluster` | `quiz-science-cluster-a.html` |
| `science_clusters.html` cluster button | `data-cluster="bepc"` → app.js `selectCluster` | `quiz-science-cluster-b.html` |
| `art_clusters.html` cluster button | `onclick="launchQuiz('arts-cluster-a')"` | `quiz-arts-cluster-a.html` |
| `commercial_clusters.html` cluster A | `onclick="launchQuiz('commercial-cluster-a')"` | `quiz-commercial-cluster-a.html` |
| `commercial_clusters.html` cluster B | `onclick="launchQuiz('commercial-cluster-b')"` | `quiz-commercial-cluster-b.html` |
| `commercial_clusters.html` cluster C | `onclick="launchQuiz('commercial-cluster-c')"` | `quiz-commercial-cluster-c.html` |
| Individual subject buttons | `onclick="launchQuiz('mathematics')"` etc. | `quiz-mathematics.html` etc. |

---

## 5. Generated Files Warning

`quiz-mathematics.html`, `quiz-arts-cluster-a.html`, `quiz-accounting.html` and all other `quiz-*.html` files were generated by the **old** workflow and still contain `<script src="quiz-launcher.js">`. They will be **automatically regenerated** on the next workflow run using the corrected `quiz-template.html`. Do not hand-edit them.

To force immediate regeneration: add a `.txt` question file to the Questt repo, or trigger `workflow_dispatch` from the Actions tab.

---

## 6. Script Load Order (Quiz Pages)

```
question-parser.js      ← class definitions (QuestionParser)
jspdf.umd.min.js        ← PDF library (cdnjs CDN)
quiz-app.js             ← bootQuiz(), QuizState, QuizUI, normalizeQuestions()
```

Never reorder these. `bootQuiz` is called inside `DOMContentLoaded` (after jsPDF has loaded synchronously from CDN before the DOM fires), so the order is safe.

---

## 7. CSS Scope Boundaries

```
styles.css        → index.html, *_clusters.html
quiz-styles.css   → quiz.html, quiz-template.html, all quiz-*.html
```

**Option state rule** (enforced in quiz-styles.css):
- `.option:hover`    = cool blue (`#eff6ff`) — "considering"
- `.option.selected` = warm gold (`#fefce8`) — "committed"
- These must never share the same background colour.

---

## 8. Change Protocol

Before touching any file, answer three questions:

1. **What is the smallest file that owns this problem?** Only edit that file.
2. **Does this change need a new CSS class?** Define it in the correct stylesheet, never inline.
3. **Does this change affect the YML pipeline?** If yes, verify the `generate_quiz.py` `replacements` dict covers it.

---

## 9. Never-Do List

- Never hand-edit any `quiz-*.html` file the YML generates — changes will be overwritten
- Never add `localStorage`/`sessionStorage` to quiz pages — quiz is stateless by design (`app.js` timer position and nav state are acceptable exceptions on cluster/index pages)
- Never use `eval()` outside the calculator
- Never add notification, leaderboard, or analytics UI requiring a backend — this is a static site
- Never commit `.py` scripts to the Questt repo
- Never rename `{{PLACEHOLDERS}}` without updating `generate_quiz.py`'s `replacements` dict
- Never add a `<script src="quiz-launcher.js">` tag anywhere — that file does not exist and must never exist
