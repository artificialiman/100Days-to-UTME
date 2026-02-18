#!/usr/bin/env python3
"""
Quiz Generator for 100Days-to-UTME
Generates:
  - individual quiz HTML files (quiz-mathematics.html, etc.)
  - cluster quiz HTML files (quiz-science-cluster-a.html, etc.)
  - cluster listing pages (science_clusters.html, art_clusters.html, commercial_clusters.html)

All output is pure static HTML — zero JS routing.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from parser import parse_file
except ImportError:
    print("Error: parser.py must be in the same directory as generate_quiz.py", file=sys.stderr)
    sys.exit(1)


# ── Cluster definitions ───────────────────────────────────────────────────────

CLUSTERS = {
    "science-cluster-a":    ["mathematics", "english", "physics", "chemistry"],
    "science-cluster-b":    ["biology",     "english", "physics", "chemistry"],
    "arts-cluster-a":       ["english", "literature", "government", "crs"],
    "commercial-cluster-a": ["english", "accounting", "commerce", "economics"],
    "commercial-cluster-b": ["english", "mathematics", "economics", "government"],
    "commercial-cluster-c": ["english", "economics", "government", "commerce"],
}

# Listing pages: which clusters + individual subjects each page shows
STREAM_PAGES = {
    "science_clusters.html": {
        "title": "Science Practice",
        "stream": "Science",
        "badge_class": "bg-blue-100 text-blue-700",
        "btn_class": "btn-primary",
        "clusters": [
            {
                "name": "Engineering & Tech",
                "code": "MEPC",
                "file": "quiz-science-cluster-a.html",
                "subjects": ["Mathematics", "English Language", "Physics", "Chemistry"],
                "for": ["Engineering (All disciplines)", "Computer Science", "Mathematics", "Architecture"],
            },
            {
                "name": "Medical & Life Sciences",
                "code": "BEPC",
                "file": "quiz-science-cluster-b.html",
                "subjects": ["Biology", "English Language", "Physics", "Chemistry"],
                "for": ["Medicine & Surgery", "Pharmacy", "Nursing", "Biochemistry"],
            },
        ],
        "individuals": [
            {"emoji": "📐", "name": "Mathematics",    "file": "quiz-mathematics.html"},
            {"emoji": "⚡", "name": "Physics",        "file": "quiz-physics.html"},
            {"emoji": "🧪", "name": "Chemistry",      "file": "quiz-chemistry.html"},
            {"emoji": "🧬", "name": "Biology",        "file": "quiz-biology.html"},
            {"emoji": "📖", "name": "English Language","file": "quiz-english.html"},
        ],
    },
    "art_clusters.html": {
        "title": "Arts & Humanities Practice",
        "stream": "Arts & Humanities",
        "badge_class": "bg-purple-100 text-purple-700",
        "btn_class": "btn-art",
        "clusters": [
            {
                "name": "Humanities & Social Sciences",
                "code": "ELGC",
                "file": "quiz-arts-cluster-a.html",
                "subjects": ["English Language", "Literature in English", "Government", "CRS"],
                "for": ["Law", "Mass Communication", "International Relations", "Political Science"],
            },
        ],
        "individuals": [
            {"emoji": "📖", "name": "English Language",     "file": "quiz-english.html"},
            {"emoji": "📚", "name": "Literature in English","file": "quiz-literature.html"},
            {"emoji": "🏛️", "name": "Government",           "file": "quiz-government.html"},
            {"emoji": "✝️",  "name": "CRS",                 "file": "quiz-crs.html"},
        ],
    },
    "commercial_clusters.html": {
        "title": "Commercial Practice",
        "stream": "Commercial",
        "badge_class": "bg-teal-100 text-teal-700",
        "btn_class": "btn-commerce",
        "clusters": [
            {
                "name": "Accounting & Business",
                "code": "EACE",
                "file": "quiz-commercial-cluster-a.html",
                "subjects": ["English Language", "Accounting", "Commerce", "Economics"],
                "for": ["Accounting", "Business Administration"],
            },
            {
                "name": "Economics & Finance",
                "code": "EMEG",
                "file": "quiz-commercial-cluster-b.html",
                "subjects": ["English Language", "Mathematics", "Economics", "Government"],
                "for": ["Economics", "Banking & Finance"],
            },
            {
                "name": "Public Admin & Business",
                "code": "EEGC",
                "file": "quiz-commercial-cluster-c.html",
                "subjects": ["English Language", "Economics", "Government", "Commerce"],
                "for": ["Public Administration", "Business Management"],
            },
        ],
        "individuals": [
            {"emoji": "📖", "name": "English Language","file": "quiz-english.html"},
            {"emoji": "📊", "name": "Accounting",      "file": "quiz-accounting.html"},
            {"emoji": "💼", "name": "Commerce",        "file": "quiz-commerce.html"},
            {"emoji": "💰", "name": "Economics",       "file": "quiz-economics.html"},
            {"emoji": "🏛️", "name": "Government",      "file": "quiz-government.html"},
        ],
    },
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def find_subject_file(subject: str, txt_files: list) -> Path | None:
    for f in txt_files:
        if subject.lower() in f.name.lower():
            return f
    return None


# ── Quiz generation ───────────────────────────────────────────────────────────

def generate_quiz(template_path, output_path, questions, subject_name, subjects_list,
                  period, day_range, generated_date, validation_status, timer_minutes):
    template = template_path.read_text(encoding="utf-8")
    replacements = {
        "{{SUBJECT_NAME}}":      subject_name,
        "{{PERIOD}}":            str(period),
        "{{DAY_RANGE}}":         day_range,
        "{{GENERATED_DATE}}":    generated_date,
        "{{VALIDATION_STATUS}}": validation_status,
        "{{SUBJECTS_LIST}}":     subjects_list,
        "{{TOTAL_QUESTIONS}}":   str(len(questions)),
        "{{TIMER_DURATION}}":    f"{timer_minutes}:00",
        "{{TIMER_MINUTES}}":     str(timer_minutes),
        "{{QUESTIONS_JSON}}":    json.dumps(questions, ensure_ascii=False),
    }
    result = template
    for k, v in replacements.items():
        result = result.replace(k, v)
    output_path.write_text(result, encoding="utf-8")
    print(f"✅ Generated: {output_path.name} ({len(questions)} questions)")


def run_individual(args, txt_files, template_path, output_dir):
    generated, skipped = [], []
    for txt_file in txt_files:
        result = parse_file(str(txt_file))
        if not result["success"] or result["question_count"] == 0:
            print(f"⚠️  Skipping {txt_file.name}: {result['errors']}")
            skipped.append(txt_file.name)
            continue
        subject = result["subject"]
        output_file = output_dir / f"quiz-{subject.lower()}.html"
        generate_quiz(template_path, output_file, result["questions"], subject, subject,
                      args.period, args.day_range, args.generated_date,
                      args.validation_status, 15)
        generated.append(output_file.name)
    return generated, skipped


def run_clusters(args, txt_files, template_path, output_dir):
    generated, skipped = [], []
    for cluster_name, required_subjects in CLUSTERS.items():
        combined_questions, subjects_found = [], []
        for subject in required_subjects:
            match = find_subject_file(subject, txt_files)
            if not match:
                print(f"⚠️  Missing '{subject}' for {cluster_name}")
                continue
            result = parse_file(str(match))
            if result["success"] and result["question_count"] > 0:
                combined_questions.extend(result["questions"])
                subjects_found.append(subject.capitalize())
        if not combined_questions:
            print(f"⚠️  Skipping {cluster_name} — no valid questions found")
            skipped.append(cluster_name)
            continue
        output_file = output_dir / f"quiz-{cluster_name}.html"
        generate_quiz(template_path, output_file, combined_questions,
                      cluster_name.replace("-", " ").title(),
                      ", ".join(subjects_found),
                      args.period, args.day_range, args.generated_date,
                      args.validation_status, 60)
        generated.append(output_file.name)
    return generated, skipped


# ── Listing page generation ───────────────────────────────────────────────────

def _cluster_card(cluster, available_files, badge_class, btn_class):
    available = cluster["file"] in available_files
    subjects_html = "".join(f'<span class="subject-tag">{s}</span>' for s in cluster["subjects"])
    for_html = "".join(f"<li>• {item}</li>" for item in cluster["for"])

    if available:
        action = f'<a href="{cluster["file"]}" class="btn {btn_class} w-full mt-lg"><i class="fas fa-play"></i> Start Cluster Exam</a>'
    else:
        action = '<button class="btn btn-disabled w-full mt-lg" disabled><i class="fas fa-hourglass-half"></i> Not Yet Available</button>'

    return f"""
            <div class="card cluster-card">
                <div class="card-body">
                    <div class="flex items-center justify-between mb-lg">
                        <h3 class="text-xl font-semibold">{cluster["name"]}</h3>
                        <span class="badge {badge_class} px-3 py-1 rounded-full text-sm font-semibold">{cluster["code"]}</span>
                    </div>
                    <div class="cluster-subjects">{subjects_html}</div>
                    <ul class="text-sm text-muted space-y-1 mt-lg">{for_html}</ul>
                    <div class="flex gap-sm mt-lg text-sm text-muted">
                        <div class="flex items-center gap-xs"><i class="fas fa-list"></i><span>140 Questions</span></div>
                        <div class="flex items-center gap-xs"><i class="fas fa-clock"></i><span>60 Minutes</span></div>
                    </div>
                    {action}
                </div>
            </div>"""


def _subject_card(subject, available_files):
    available = subject["file"] in available_files
    if available:
        action = f'<a href="{subject["file"]}" class="btn btn-primary w-full btn-sm"><i class="fas fa-play"></i> Start</a>'
    else:
        action = '<button class="btn btn-disabled w-full btn-sm" disabled><i class="fas fa-hourglass-half"></i> Soon</button>'

    return f"""
            <div class="card"><div class="card-body text-center">
                <div class="text-5xl mb-md">{subject["emoji"]}</div>
                <h3 class="text-lg font-semibold mb-sm">{subject["name"]}</h3>
                <div class="flex justify-center gap-sm mb-lg text-sm text-muted">
                    <div class="flex items-center gap-xs"><i class="fas fa-list-ol"></i><span>35 Q</span></div>
                    <div class="flex items-center gap-xs"><i class="fas fa-clock"></i><span>15 min</span></div>
                </div>
                {action}
            </div></div>"""


def generate_listing_page(output_path, page_cfg, available_files, day_range):
    title  = page_cfg["title"]
    stream = page_cfg["stream"]
    badge  = page_cfg["badge_class"]
    btn    = page_cfg["btn_class"]

    clusters_html  = "".join(_cluster_card(c, available_files, badge, btn) for c in page_cfg["clusters"])
    subjects_html  = "".join(_subject_card(s, available_files) for s in page_cfg["individuals"])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - GrantApp AI</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="animated-bg"></div>

    <nav class="navbar">
        <a href="index.html" class="navbar-brand">GrantApp AI</a>
        <div class="navbar-menu">
            <a href="#" class="nav-link tooltip"><i class="fas fa-chart-line"></i><span class="tooltip-content">Analytics Dashboard</span></a>
            <a href="#" class="nav-link tooltip"><i class="fas fa-user-graduate"></i><span class="tooltip-content">My Profile</span></a>
        </div>
    </nav>

    <div class="container">
        <div class="breadcrumbs">
            <a href="index.html" class="breadcrumb-item">Home</a>
            <span class="breadcrumb-separator">›</span>
            <span class="breadcrumb-item">{stream}</span>
            <span class="breadcrumb-separator">›</span>
            <span class="breadcrumb-current">Choose Practice Mode</span>
        </div>
    </div>

    <div class="container">
        <div class="progress-steps">
            <div class="progress-step"><div class="step-number">1</div><div class="step-label">Choose Stream</div></div>
            <div class="progress-step active"><div class="step-number">2</div><div class="step-label">Select Mode</div></div>
            <div class="progress-step"><div class="step-number">3</div><div class="step-label">Start Practice</div></div>
            <div class="progress-line"></div>
            <div class="progress-fill" style="width: 66%"></div>
        </div>
    </div>

    <section class="hero">
        <div class="container-narrow">
            <h1 class="hero-title font-luxury">{title}</h1>
            <p class="hero-subtitle">Choose between full cluster exams or individual subject practice.</p>
            <div class="text-center mt-lg">
                <span class="badge {badge} px-4 py-2 rounded-full text-sm font-semibold">
                    <i class="fas fa-calendar-day"></i> Day {day_range}
                </span>
            </div>
        </div>
    </section>

    <section class="container-narrow py-xl">
        <h2 class="text-3xl font-bold mb-xl text-center"><i class="fas fa-layer-group"></i> Cluster Exams</h2>
        <p class="text-center text-muted mb-2xl">Full JAMB-style exam · 4 subjects · 140 questions · 60 minutes</p>
        <div class="cluster-grid">{clusters_html}</div>
    </section>

    <div class="container-narrow">
        <div class="flex items-center gap-md my-3xl">
            <div class="flex-1 border-t border-neutral-300"></div>
            <span class="text-muted font-semibold">OR</span>
            <div class="flex-1 border-t border-neutral-300"></div>
        </div>
    </div>

    <section class="container-narrow py-xl">
        <h2 class="text-3xl font-bold mb-xl text-center"><i class="fas fa-book"></i> Individual Subjects</h2>
        <p class="text-center text-muted mb-2xl">35 questions · 15 minutes</p>
        <div class="grid grid-4 gap-lg">{subjects_html}</div>
    </section>

    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>GrantApp AI</h4>
                    <p class="text-sm">Intelligent exam preparation platform for Nigerian students.</p>
                </div>
                <div class="footer-section">
                    <h4>Contact</h4>
                    <a href="https://wa.me/2348000000000" class="footer-contact" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i><span>WhatsApp Support</span></a>
                    <a href="mailto:support@grantapp.ai" class="footer-contact"><i class="fas fa-envelope"></i><span>support@grantapp.ai</span></a>
                </div>
                <div class="footer-section">
                    <h4>Office</h4>
                    <p class="text-sm"><i class="fas fa-map-marker-alt"></i> Lagos, Nigeria</p>
                </div>
            </div>
            <div class="footer-bottom"><p>© 2026 GrantApp AI. All rights reserved.</p></div>
        </div>
    </footer>

    <script src="app.js"></script>
</body>
</html>"""

    output_path.write_text(html, encoding="utf-8")
    print(f"✅ Generated: {output_path.name}")


def run_pages(args, txt_files, output_dir, generated_this_run=None):
    """Generate cluster listing pages with live/disabled links based on what was actually generated."""
    # Determine which quiz files exist (or were just generated this run)
    available_files = generated_this_run if generated_this_run is not None else set()

    generated = []
    for filename, page_cfg in STREAM_PAGES.items():
        output_path = output_dir / filename
        generate_listing_page(output_path, page_cfg, available_files, args.day_range)
        generated.append(filename)

    return generated


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("--template",           required=True)
    arg_parser.add_argument("--output-dir",         required=True)
    arg_parser.add_argument("--questt-dir",         required=True)
    arg_parser.add_argument("--period",             required=True, type=int)
    arg_parser.add_argument("--day-range",          required=True)
    arg_parser.add_argument("--generated-date",     required=True)
    arg_parser.add_argument("--validation-status",  required=True)
    arg_parser.add_argument("--mode", choices=["individual", "clusters", "pages", "all"], default="all")

    args = arg_parser.parse_args()

    template_path = Path(args.template)
    output_dir    = Path(args.output_dir)
    questt_dir    = Path(args.questt_dir)

    if not template_path.exists():
        print(f"Error: template not found: {template_path}", file=sys.stderr); sys.exit(1)
    if not questt_dir.exists():
        print(f"Error: questt-dir not found: {questt_dir}", file=sys.stderr); sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    txt_files = sorted(questt_dir.glob("*.txt"))

    if not txt_files and args.mode != "pages":
        print(f"No .txt files found in {questt_dir}", file=sys.stderr); sys.exit(1)

    all_generated, all_skipped = [], []

    if args.mode in ("individual", "all"):
        g, s = run_individual(args, txt_files, template_path, output_dir)
        all_generated.extend(g); all_skipped.extend(s)

    if args.mode in ("clusters", "all"):
        g, s = run_clusters(args, txt_files, template_path, output_dir)
        all_generated.extend(g); all_skipped.extend(s)

    if args.mode in ("pages", "all"):
        g = run_pages(args, txt_files, output_dir, set(all_generated))
        all_generated.extend(g)

    print(f"\n{'='*50}")
    print(f"Generated : {len(all_generated)} files")
    if all_skipped:
        print(f"Skipped   : {len(all_skipped)} ({', '.join(all_skipped)})")
    print(f"{'='*50}")

    sys.exit(0 if all_generated else 1)


if __name__ == "__main__":
    main()
