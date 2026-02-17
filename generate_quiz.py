#!/usr/bin/env python3
"""
Quiz Generator for 100Days-to-UTME
Handles individual subject and cluster quiz generation.
Replaces all fragile bash sed/variable substitution with safe Python string replacement,
avoiding unicode corruption, & expansion, and shell variable size limits.
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
    subject_name: str,
    subjects_list: str,
    period: int,
    day_range: str,
    generated_date: str,
    validation_status: str,
    timer_minutes: int,
) -> None:
    """
    Substitute all placeholders in the template using Python str.replace().
    Safe for unicode, special characters, and large JSON payloads.
    """
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
        # ensure_ascii=False preserves unicode characters (², θ, →, etc.)
        "{{QUESTIONS_JSON}}":    json.dumps(questions, ensure_ascii=False),
    }

    result = template
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    output_path.write_text(result, encoding="utf-8")
    print(f"✅ Generated: {output_path} ({len(questions)} questions)")


def run_individual(args, txt_files, template_path, output_dir):
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


def run_clusters(args, txt_files, template_path, output_dir):
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
    arg_parser = argparse.ArgumentParser(description="Generate quiz HTML files from question .txt files")
    arg_parser.add_argument("--template",           required=True, help="Path to quiz-template.html")
    arg_parser.add_argument("--output-dir",         required=True, help="Directory to write generated quiz HTML files")
    arg_parser.add_argument("--questt-dir",         required=True, help="Directory containing .txt question files")
    arg_parser.add_argument("--period",             required=True, type=int)
    arg_parser.add_argument("--day-range",          required=True)
    arg_parser.add_argument("--generated-date",     required=True)
    arg_parser.add_argument("--validation-status",  required=True)
    arg_parser.add_argument("--mode", choices=["individual", "clusters", "all"], default="all")

    args = arg_parser.parse_args()

    template_path = Path(args.template)
    output_dir    = Path(args.output_dir)
    questt_dir    = Path(args.questt_dir)

    if not template_path.exists():
        print(f"Error: template not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    if not questt_dir.exists():
        print(f"Error: questt directory not found: {questt_dir}", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    txt_files = sorted(questt_dir.glob("*.txt"))

    if not txt_files:
        print(f"No .txt files found in {questt_dir}", file=sys.stderr)
        sys.exit(1)

    all_generated, all_skipped = [], []

    if args.mode in ("individual", "all"):
        g, s = run_individual(args, txt_files, template_path, output_dir)
        all_generated.extend(g)
        all_skipped.extend(s)

    if args.mode in ("clusters", "all"):
        g, s = run_clusters(args, txt_files, template_path, output_dir)
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
