#!/usr/bin/env python3
"""
Question Parser for 100Days-to-UTME
Parses .txt question files into JSON format for HTML embedding.

NOTE: We do NOT HTML-escape question text. Questions are embedded as JSON
and rendered via element.textContent (not innerHTML), so the browser handles
special characters natively. Escaping would cause &lt; to appear literally.
"""

import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

SUBJECT_KEYWORDS = {
    'physics':     ['physics', 'phy'],
    'mathematics': ['mathematics', 'math', 'maths'],
    'english':     ['english', 'eng'],
    'chemistry':   ['chemistry', 'chem'],
    'biology':     ['biology', 'bio'],
    'literature':  ['literature', 'lit'],
    'government':  ['government', 'govt'],
    'crs':         ['crs', 'christian', 'religious'],
    'accounting':  ['accounting', 'acct'],
    'commerce':    ['commerce', 'comm'],
    'economics':   ['economics', 'econ', 'eco'],
}


def detect_subject(filename: str) -> Optional[str]:
    filename_lower = filename.lower()
    for subject, keywords in SUBJECT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in filename_lower:
                return subject.capitalize()
    return None


def parse_question_file(file_path: Path) -> Tuple[List[Dict], str, List[str]]:
    questions = []
    errors = []

    subject = detect_subject(file_path.name)
    if not subject:
        errors.append(f"Could not detect subject from filename: {file_path.name}")
        subject = file_path.stem.replace('_', ' ').replace('-', ' ').title()

    try:
        content = file_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        errors.append(f"File encoding error — not UTF-8: {file_path.name}")
        return [], subject, errors
    except Exception as e:
        errors.append(f"Failed to read file: {e}")
        return [], subject, errors

    content = content.replace('\r\n', '\n')
    question_blocks = re.split(r'\n\s*\n+', content.strip())

    for block_idx, block in enumerate(question_blocks):
        block = block.strip()
        if not block:
            continue
        try:
            question_data = parse_question_block(block, block_idx + 1)
            if question_data:
                questions.append(question_data)
            else:
                errors.append(f"Block {block_idx + 1}: Failed to parse question")
        except Exception as e:
            errors.append(f"Block {block_idx + 1}: {e}")

    return questions, subject, errors


def parse_question_block(block: str, expected_num: int) -> Optional[Dict]:
    lines = [line.strip() for line in block.split('\n') if line.strip()]

    if len(lines) < 6:
        return None

    question_match = re.match(r'^(\d+)\.\s*(.+)$', lines[0])
    if not question_match:
        return None

    question_num  = int(question_match.group(1))
    question_text = question_match.group(2).strip()

    options = {}
    option_pattern = re.compile(r'^([A-D])\.\s*(.+)$', re.IGNORECASE)

    for line in lines[1:]:
        m = option_pattern.match(line)
        if m:
            options[m.group(1).upper()] = m.group(2).strip()

    if len(options) != 4 or not all(o in options for o in 'ABCD'):
        return None

    answer = None
    answer_pattern = re.compile(r'^Answer:\s*([A-D])$', re.IGNORECASE)
    for line in lines:
        m = answer_pattern.match(line)
        if m:
            answer = m.group(1).upper()
            break

    if not answer:
        return None

    return {
        'id':      question_num,
        'text':    question_text,
        'optionA': options['A'],
        'optionB': options['B'],
        'optionC': options['C'],
        'optionD': options['D'],
        'answer':  answer,
    }


def validate_questions(questions: List[Dict], expected_count: int = 35) -> List[str]:
    errors = []

    if len(questions) != expected_count:
        errors.append(f"Expected {expected_count} questions, got {len(questions)}")

    ids = [q['id'] for q in questions]
    if len(ids) != len(set(ids)):
        dupes = {i for i in ids if ids.count(i) > 1}
        errors.append(f"Duplicate question IDs: {dupes}")

    expected_ids = list(range(1, len(questions) + 1))
    if sorted(ids) != expected_ids:
        missing = set(expected_ids) - set(ids)
        if missing:
            errors.append(f"Missing question numbers: {sorted(missing)}")

    for q in questions:
        qid = q['id']
        if not q['text']:
            errors.append(f"Q{qid}: Empty question text")
        for opt in 'ABCD':
            if not q.get(f'option{opt}'):
                errors.append(f"Q{qid}: Empty option {opt}")
        if q['answer'] not in 'ABCD':
            errors.append(f"Q{qid}: Invalid answer '{q['answer']}'")

    return errors


def parse_file(file_path: str) -> Dict:
    path = Path(file_path)

    if not path.exists():
        return {'success': False, 'subject': None, 'questions': [], 'question_count': 0,
                'errors': [f"File not found: {file_path}"], 'filename': path.name}

    questions, subject, parse_errors = parse_question_file(path)
    validation_errors = validate_questions(questions) if questions else []
    all_errors = parse_errors + validation_errors

    return {
        'success':        len(all_errors) == 0,
        'subject':        subject,
        'questions':      questions,   # raw — no HTML escaping
        'question_count': len(questions),
        'errors':         all_errors,
        'filename':       path.name,
    }


def batch_parse(file_paths: List[str]) -> Dict[str, Dict]:
    return {Path(fp).name: parse_file(fp) for fp in file_paths}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python parser.py <file.txt> [more.txt ...]")
        sys.exit(1)

    file_paths = sys.argv[1:]

    if len(file_paths) == 1:
        result = parse_file(file_paths[0])
        print(f"\nSubject: {result['subject']}")
        print(f"Questions: {result['question_count']}")
        print(f"Success: {result['success']}")
        if result['errors']:
            for e in result['errors']:
                print(f"  ❌ {e}")
        else:
            print("  ✅ All validations passed")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        results = batch_parse(file_paths)
        successful = sum(1 for r in results.values() if r['success'])
        for filename, result in results.items():
            status = "✅" if result['success'] else "❌"
            print(f"{status} {filename} — {result['subject']} ({result['question_count']} Q)")
        print(f"\nSummary: {successful}/{len(results)} files OK")
        with open("batch_parse_results.json", 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
