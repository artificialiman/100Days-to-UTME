#!/usr/bin/env python3
"""
collect_prev_questions.py

Reads the previous period's .txt files from the Questt-resources archive
and writes them as a single JSON array to an output file.

Called by auto-quiz.yml as a standalone step — keeps all JSON handling
in Python so the yml never touches JSON content in shell variables.

Usage:
    python3 collect_prev_questions.py \
        --archive-dir archive-repo/archive \
        --day-range   1-2 \
        --output-file /tmp/prev_questions.json
"""

import argparse
import json
import sys
from pathlib import Path

# parser.py must be importable — the yml copies it to the same directory
try:
    from parser import parse_file
except ImportError:
    # If not available, we just produce an empty file — never crash the build
    parse_file = None


def collect(archive_dir: Path, day_range: str, output_file: Path) -> int:
    """
    Collect all questions from archive/day-{day_range}/*.txt
    Write them as a JSON array to output_file.
    Returns the number of questions collected.
    """
    folder = archive_dir / f"day-{day_range}"

    if not folder.exists():
        print(f"ℹ️  Archive folder not found: {folder} — writing empty array")
        output_file.write_text("[]", encoding="utf-8")
        return 0

    if parse_file is None:
        print("⚠️  parser.py not available — writing empty array")
        output_file.write_text("[]", encoding="utf-8")
        return 0

    txt_files = sorted(folder.glob("*.txt"))
    if not txt_files:
        print(f"ℹ️  No .txt files in {folder} — writing empty array")
        output_file.write_text("[]", encoding="utf-8")
        return 0

    all_questions = []
    for txt in txt_files:
        try:
            result = parse_file(str(txt))
            if result.get("success") and result.get("questions"):
                all_questions.extend(result["questions"])
                print(f"  ✓ {txt.name}: {result['question_count']} questions")
            else:
                print(f"  ⚠ {txt.name}: parse failed or empty — skipped")
        except Exception as e:
            # Never let one bad file crash the whole step
            print(f"  ⚠ {txt.name}: error ({e}) — skipped")

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(
        json.dumps(all_questions, ensure_ascii=False),
        encoding="utf-8"
    )
    print(f"✅ Wrote {len(all_questions)} previous questions to {output_file}")
    return len(all_questions)


def main():
    parser = argparse.ArgumentParser(
        description="Collect previous period questions from archive into a JSON file"
    )
    parser.add_argument("--archive-dir",  required=True, help="Path to archive root (e.g. archive-repo/archive)")
    parser.add_argument("--day-range",    required=True, help="Previous period day range (e.g. 1-2)")
    parser.add_argument("--output-file",  required=True, help="Where to write the JSON output")
    args = parser.parse_args()

    archive_dir = Path(args.archive_dir)
    output_file = Path(args.output_file)

    count = collect(archive_dir, args.day_range, output_file)
    sys.exit(0)  # Always exit 0 — a missing archive is not a build failure


if __name__ == "__main__":
    main()
