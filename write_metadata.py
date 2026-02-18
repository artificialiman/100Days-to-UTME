#!/usr/bin/env python3
"""
write_metadata.py
Called by auto-quiz.yml to write archive/day-X/metadata.json.
All values passed via environment variables — no shell interpolation into JSON.

Usage (from yml):
  env:
    PERIOD: ${{ steps.calc-period.outputs.period }}
    DAY_RANGE: ${{ steps.calc-period.outputs.day_range }}
    GEN_DATE: ${{ steps.calc-period.outputs.generated_date }}
    VALIDATION_STATUS: ${{ steps.validate.outputs.validation_status }}
    VALID_COUNT: ${{ steps.validate.outputs.valid_files }}
    TOTAL_COUNT: ${{ steps.validate.outputs.total_files }}
  run: python main-repo/write_metadata.py
"""

import json
import os
import sys

def main():
    day_range = os.environ.get("DAY_RANGE", "")
    if not day_range:
        print("ERROR: DAY_RANGE env var not set", file=sys.stderr)
        sys.exit(1)

    data = {
        "period":            int(os.environ.get("PERIOD", 1)),
        "day_range":         day_range,
        "generated_date":    os.environ.get("GEN_DATE", ""),
        "validation_status": os.environ.get("VALIDATION_STATUS", "UNKNOWN"),
        "total_files":       int(os.environ.get("TOTAL_COUNT", 0)),
        "valid_files":       int(os.environ.get("VALID_COUNT", 0)),
    }

    out_path = os.path.join(
        "archive-repo", "archive", f"day-{day_range}", "metadata.json"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"metadata.json written to {out_path}")

if __name__ == "__main__":
    main()
