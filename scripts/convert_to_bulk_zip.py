#!/usr/bin/env python3
"""
평가원 시험 파일들을 bulk-files API 형식 ZIP으로 변환.
형식: {year}_고3_{month}월_{subject}_{type}.pdf
"""

import os
import re
import zipfile
import unicodedata
from pathlib import Path


def nfc(s: str) -> str:
    return unicodedata.normalize('NFC', s)

BASE = Path("/Users/hmin3737/Documents/suneung/suneung/files")
OUTPUT_ZIP = Path("/Users/hmin3737/Documents/suneung/suneung/scripts/converted_bulk.zip")

EXAMS = [
    ("2024학년도 9평", 2024, 9),
    ("2024학년도 6평", 2024, 6),
    ("2023학년도 9평", 2023, 9),
    ("2023학년도 6평", 2023, 6),
    ("2022학년도 9평", 2022, 9),
    ("2022학년도 6평", 2022, 6),
]

GRADE = "고3"

SOCIAL_MAP = {
    "생활과윤리":  "생활과윤리",
    "생활과 윤리": "생활과윤리",
    "윤리와사상":  "윤리와사상",
    "윤리와 사상": "윤리와사상",
    "한국지리":   "한국지리",
    "세계지리":   "세계지리",
    "동아시아사":  "동아시아사",
    "세계사":    "세계사",
    "경제":      "경제",
    "정치와법":   "정치와법",
    "정치와 법":  "정치와법",
    "사회문화":   "사회문화",
    "사회·문화":  "사회문화",
    "사회∙문화":  "사회문화",
    "사회・문화":  "사회문화",
}

FOREIGN_MAP = {
    "독일어Ⅰ":  "독일어Ⅰ",
    "프랑스어Ⅰ": "프랑스어Ⅰ",
    "스페인어Ⅰ": "스페인어Ⅰ",
    "중국어Ⅰ":  "중국어Ⅰ",
    "일본어Ⅰ":  "일본어Ⅰ",
    "러시아어Ⅰ": "러시아어Ⅰ",
    "아랍어Ⅰ":  "아랍어Ⅰ",
    "베트남어Ⅰ": "베트남어Ⅰ",
    "한문Ⅰ":   "한문Ⅰ",
}


def normalize_level(s: str) -> str:
    """Normalize level suffixes: II→Ⅱ, I→Ⅰ, 2→Ⅱ, 1→Ⅰ at end of string."""
    s = re.sub(r'\s+II$', 'Ⅱ', s)
    s = re.sub(r'\s+I$',  'Ⅰ', s)
    s = re.sub(r'II$',   'Ⅱ', s)
    s = re.sub(r'I$',    'Ⅰ', s)
    s = re.sub(r'2$',    'Ⅱ', s)
    s = re.sub(r'1$',    'Ⅰ', s)
    return s


def extract_science_subject(fname: str) -> str | None:
    stem = Path(nfc(fname)).stem
    stem = re.sub(r'^\d+\s+', '', stem)            # remove "01 "
    stem = re.sub(r'^과탐[（(]', '', stem)           # remove "과탐("
    stem = re.sub(r'^4교시_과학탐구영역_', '', stem)  # remove prefix
    stem = re.sub(r'[）)]\s*(문제지|정답표|문제|정답)?$', '', stem)  # remove ")"
    stem = re.sub(r'\s+(문제지|정답표|문제|정답)$', '', stem)
    stem = re.sub(r'_(문제지|정답표|문제|정답)$', '', stem)
    stem = stem.strip()
    stem = normalize_level(stem)
    stem = stem.replace(' ', '')
    return stem if stem else None


def extract_social_subject(fname: str) -> str | None:
    stem = Path(nfc(fname)).stem
    stem = re.sub(r'^\d+\s+', '', stem)
    stem = re.sub(r'^사탐[（(]', '', stem)
    stem = re.sub(r'^4교시_사회탐구영역_', '', stem)
    stem = re.sub(r'[）)]\s*(문제지|정답표|문제|정답)?$', '', stem)
    stem = re.sub(r'\s+(문제지|정답표|문제|정답)$', '', stem)
    stem = re.sub(r'_(문제지|정답표|문제|정답)$', '', stem)
    stem = stem.strip()
    # normalize spaces out, try map
    key = stem.replace(' ', '').replace('·', '').replace('∙', '').replace('・', '')
    # also try with spaces preserved
    for k, v in SOCIAL_MAP.items():
        if k.replace(' ', '') == key or k == stem:
            return v
    return None


def extract_foreign_subject(fname: str) -> str | None:
    stem = Path(nfc(fname)).stem
    stem = re.sub(r'^\d+\s+', '', stem)
    stem = re.sub(r'^5교시_제2외국어\s*한문영역_', '', stem)
    stem = re.sub(r'\s+(문제지|정답표|문제|정답)$', '', stem)
    stem = re.sub(r'_(문제지|정답표|문제|정답)$', '', stem)
    stem = stem.strip().rstrip('_').strip()
    stem = normalize_level(stem)
    # Fix "러시아Ⅰ" -> "러시아어Ⅰ"
    stem = re.sub(r'^러시아Ⅰ$', '러시아어Ⅰ', stem)
    return FOREIGN_MAP.get(stem, None)


def get_root_subject(stem: str) -> str | None:
    s = nfc(stem)
    if '국어' in s: return '국어'
    if '수학' in s: return '수학'
    if '영어' in s: return '영어'
    if '한국사' in s: return '한국사'
    return None


def get_filetype_from_name(stem: str, dir_name: str) -> str:
    s = nfc(stem)
    d = nfc(dir_name)
    # Directory name takes priority
    if '정답' in d: return '정답'
    if '문제' in d: return '문제'
    # File stem
    if re.search(r'_(정답표|정답지|정답)$', s): return '정답'
    if re.search(r'_(문제지|문제)$', s): return '문제'
    if '정답' in s: return '정답'
    return '문제'


def process_exam(exam_dir: str, year: int, month: int, zip_out: zipfile.ZipFile):
    base_path = BASE / exam_dir
    prefix = f"{year}_{GRADE}_{month}월"
    added = 0
    errors = []

    # Collect all directories, determine which -2 dupes to skip
    all_dirs = [d for d in base_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
    dir_names_nfc = {nfc(d.name) for d in all_dirs}

    def has_v2(name_nfc):
        return (name_nfc + '-2') in dir_names_nfc

    for item in sorted(base_path.iterdir()):
        raw_name = item.name
        if raw_name.startswith('.'):
            continue
        item_name = nfc(raw_name)

        # ── Root-level PDFs (국어, 수학, 영어, 한국사) ─────────────────────
        if item.is_file() and item.suffix.lower() == '.pdf':
            subject = get_root_subject(item_name[:-4])  # strip .pdf
            if not subject:
                print(f"  [SKIP] root file (unknown subject): {item_name}")
                continue
            stem_nfc = nfc(Path(item_name).stem)
            ftype = get_filetype_from_name(stem_nfc, '')
            target = f"{prefix}_{subject}_{ftype}.pdf"
            print(f"  {item_name:50s} → {target}")
            zip_out.write(str(item), target)
            added += 1
            continue

        # ── Subdirectories ──────────────────────────────────────────────────
        if not item.is_dir():
            continue

        dir_name = item_name  # NFC version

        # Determine category
        if '과학탐구' in dir_name:
            category = 'science'
        elif '사회탐구' in dir_name:
            category = 'social'
        elif '제2외국어' in dir_name or '외국어한문' in dir_name:
            category = 'foreign'
        else:
            print(f"  [SKIP] dir (unknown category): {dir_name}")
            continue

        # Skip base version when -2 exists (duplicate)
        if not dir_name.endswith('-2') and has_v2(dir_name):
            print(f"  [SKIP] dir (using -2 version): {dir_name}")
            continue

        dir_ftype = '정답' if '정답' in dir_name else '문제'

        for pdf in sorted(item.iterdir()):
            pdf_name = nfc(pdf.name)
            if pdf_name.startswith('.') or pdf.suffix.lower() != '.pdf':
                continue

            if category == 'science':
                subject = extract_science_subject(pdf_name)
            elif category == 'social':
                subject = extract_social_subject(pdf_name)
            elif category == 'foreign':
                subject = extract_foreign_subject(pdf_name)
            else:
                subject = None

            if not subject:
                msg = f"  [ERROR] no subject: {exam_dir}/{dir_name}/{pdf_name}"
                print(msg)
                errors.append(msg)
                continue

            target = f"{prefix}_{subject}_{dir_ftype}.pdf"
            print(f"  {dir_name}/{pdf_name:45s} → {target}")
            zip_out.write(str(pdf), target)
            added += 1

    return added, errors


def main():
    print(f"출력 ZIP: {OUTPUT_ZIP}\n")
    total_added = 0
    all_errors = []

    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zf:
        for exam_dir, year, month in EXAMS:
            print(f"\n{'='*60}")
            print(f"처리 중: {exam_dir}  ({year}년 {month}월)")
            print('='*60)
            n, errs = process_exam(exam_dir, year, month, zf)
            total_added += n
            all_errors.extend(errs)
            print(f"  → {n}개 추가")

    print(f"\n{'='*60}")
    print(f"완료: 총 {total_added}개 파일 → {OUTPUT_ZIP}")
    if all_errors:
        print(f"\n오류 {len(all_errors)}개:")
        for e in all_errors:
            print(f"  {e}")
    else:
        print("오류 없음.")


if __name__ == '__main__':
    main()
