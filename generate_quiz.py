#!/usr/bin/env python3
"""
Quiz Generator for 100Days-to-UTME
Handles individual subject and cluster quiz generation.
Uses safe Python str.replace() for ALL placeholder injection —
including {{QUESTIONS_JSON}} and {{PREVIOUS_QUESTIONS_JSON}} —
so no sed, no heredocs, no shell variable expansion of JSON data.
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


CLUSTERS = {
    "science-cluster-a":    ["mathematics", "english", "physics", "chemistry"],
    "science-cluster-b":    ["biology",     "english", "physics", "chemistry"],
    "arts-cluster-a":       ["english", "literature", "government", "crs"],
    "commercial-cluster-a": ["english", "accounting", "commerce", "economics"],
    "commercial-cluster-b": ["english", "mathematics", "economics", "government"],
    "commercial-cluster-c": ["english", "economics", "government", "commerce"],
}


def load_previous_questions(prev_file: Path | None) -> list:
    """
    Load previous period questions from a JSON file.
    Returns [] safely if file is missing, empty, or malformed —
    the quiz still works, it just won't have previousQuizData.
    """
    if prev_file is None or not prev_file.exists():
        return []
    try:
        data = json.loads(prev_file.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        # Some archive formats nest under a key
        if isinstance(data, dict):
            for key in ("questions", "data", "items"):
                if isinstance(data.get(key), list):
                    return data[key]
        return []
    except Exception as e:
        print(f"⚠️  Could not load previous questions from {prev_file}: {e}", file=sys.stderr)
        return []


def find_subject_file(subject: str, txt_files: list[Path]) -> Path | None:
    """Find a .txt file whose name contains the subject keyword."""
    for f in txt_files:
        if subject.lower() in f.name.lower():
            return f
    return None


def generate_quiz(
    template_path: Path,
    output_path: Path,
    questions: list,
    previous_questions: list,
    subject_name: str,
    subjects_list: str,
    period: int,
    day_range: str,
    generated_date: str,
    validation_status: str,
    timer_minutes: int,
) -> None:
    """
    Substitute ALL placeholders in the template using Python str.replace().
    Safe for unicode, special characters, and large JSON payloads.
    Never touches the template file on disk — works entirely in memory.
    """
    template = template_path.read_text(encoding="utf-8")

    replacements = {
        "{{SUBJECT_NAME}}":           subject_name,
        "{{PERIOD}}":                 str(period),
        "{{DAY_RANGE}}":              day_range,
        "{{GENERATED_DATE}}":         generated_date,
        "{{VALIDATION_STATUS}}":      validation_status,
        "{{SUBJECTS_LIST}}":          subjects_list,
        "{{TOTAL_QUESTIONS}}":        str(len(questions)),
        "{{TIMER_DURATION}}":         f"{timer_minutes:02d}:00",
        "{{TIMER_MINUTES}}":          str(timer_minutes),
        # ensure_ascii=False preserves unicode (², θ, →, ≥, etc.)
        "{{QUESTIONS_JSON}}":         json.dumps(questions,          ensure_ascii=False),
        "{{PREVIOUS_QUESTIONS_JSON}}":json.dumps(previous_questions, ensure_ascii=False),
    }

    result = template
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    # Warn if any placeholder was not found in template (won't fail the build)
    for placeholder in replacements:
        if placeholder in template and placeholder in result:
            print(f"  ⚠️  Placeholder {placeholder} still present after replacement — check template", file=sys.stderr)

    output_path.write_text(result, encoding="utf-8")
    print(f"✅ Generated: {output_path} ({len(questions)} questions, {len(previous_questions)} prev)")


def run_individual(args, txt_files, template_path, output_dir, previous_questions):
    """Generate one quiz HTML per subject .txt file."""
    generated, skipped = [], []

    for txt_file in txt_files:
        result = parse_file(str(txt_file))

        if not result["success"] or result["question_count"] == 0:
            print(f"⚠️  Skipping {txt_file.name}: {result['errors']}")
            skipped.append(txt_file.name)
            continue

        subject = result["subject"]
        output_file = output_dir / f"quiz-{subject.lower()}.html"

        generate_quiz(
            template_path=template_path,
            output_path=output_file,
            questions=result["questions"],
            previous_questions=previous_questions,
            subject_name=subject,
            subjects_list=subject,
            period=args.period,
            day_range=args.day_range,
            generated_date=args.generated_date,
            validation_status=args.validation_status,
            timer_minutes=15,
        )
        generated.append(str(output_file))

    return generated, skipped


def run_clusters(args, txt_files, template_path, output_dir, previous_questions):
    """Generate one quiz HTML per cluster, combining questions from multiple subjects."""
    generated, skipped = [], []

    for cluster_name, required_subjects in CLUSTERS.items():
        combined_questions = []
        subjects_found = []

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

        generate_quiz(
            template_path=template_path,
            output_path=output_file,
            questions=combined_questions,
            previous_questions=previous_questions,
            subject_name=cluster_name.replace("-", " ").title(),
            subjects_list=", ".join(subjects_found),
            period=args.period,
            day_range=args.day_range,
            generated_date=args.generated_date,
            validation_status=args.validation_status,
            timer_minutes=60,
        )
        generated.append(str(output_file))

    return generated, skipped


def main():
    arg_parser = argparse.ArgumentParser(
        description="Generate quiz HTML files from question .txt files"
    )
    arg_parser.add_argument("--template",            required=True,  help="Path to quiz-template.html")
    arg_parser.add_argument("--output-dir",          required=True,  help="Directory to write generated quiz HTML files")
    arg_parser.add_argument("--questt-dir",          required=True,  help="Directory containing .txt question files")
    arg_parser.add_argument("--period",              required=True,  type=int)
    arg_parser.add_argument("--day-range",           required=True)
    arg_parser.add_argument("--generated-date",      required=True)
    arg_parser.add_argument("--validation-status",   required=True)
    arg_parser.add_argument("--mode", choices=["individual", "clusters", "all"], default="all")
    # Optional: path to a JSON file containing previous period's questions
    arg_parser.add_argument(
        "--prev-questions-file",
        required=False,
        default=None,
        help="Path to JSON file with previous period questions for embedding as previousQuizData"
    )

    args = arg_parser.parse_args()

    template_path = Path(args.template)
    output_dir    = Path(args.output_dir)
    questt_dir    = Path(args.questt_dir)
    prev_file     = Path(args.prev_questions_file) if args.prev_questions_file else None

    if not template_path.exists():
        print(f"Error: template not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    if not questt_dir.exists():
        print(f"Error: questt directory not found: {questt_dir}", file=sys.stderr)
        sys.exit(1)

    # Verify template has both required placeholders — warn but don't abort
    template_text = template_path.read_text(encoding="utf-8")
    for ph in ("{{QUESTIONS_JSON}}", "{{PREVIOUS_QUESTIONS_JSON}}"):
        if ph not in template_text:
            print(f"⚠️  Warning: {ph} not found in template. Output will contain literal placeholder.", file=sys.stderr)

    output_dir.mkdir(parents=True, exist_ok=True)
    txt_files = sorted(questt_dir.glob("*.txt"))

    if not txt_files:
        print(f"No .txt files found in {questt_dir}", file=sys.stderr)
        sys.exit(1)

    # Load previous questions once — shared across all generated files
    previous_questions = load_previous_questions(prev_file)
    if previous_questions:
        print(f"📦 Loaded {len(previous_questions)} previous period questions for embedding")
    else:
        print("ℹ️  No previous period questions — previousQuizData will be []")

    all_generated, all_skipped = [], []

    if args.mode in ("individual", "all"):
        g, s = run_individual(args, txt_files, template_path, output_dir, previous_questions)
        all_generated.extend(g)
        all_skipped.extend(s)

    if args.mode in ("clusters", "all"):
        g, s = run_clusters(args, txt_files, template_path, output_dir, previous_questions)
        all_generated.extend(g)
        all_skipped.extend(s)

    print(f"\n{'='*50}")
    print(f"Generated : {len(all_generated)} files")
    if all_skipped:
        print(f"Skipped   : {len(all_skipped)} ({', '.join(all_skipped)})")
    print(f"{'='*50}")

    sys.exit(0 if all_generated else 1)


if __name__ == "__main__":
    main()
