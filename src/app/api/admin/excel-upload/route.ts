import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getExamType, isPercentSubject } from '@/lib/constants';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function n(v: string | undefined): number | null {
  if (!v || v.trim() === '' || v.startsWith('※')) return null;
  const num = parseFloat(v.trim());
  return isNaN(num) ? null : num;
}

function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  return clean.split('\n').filter(Boolean).map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim())
  );
}

function upsertExam(grade: string, year: number, month: number, subject: string): number {
  const examType = getExamType(grade, month);
  const existing = db
    .prepare('SELECT id FROM exams WHERE grade=? AND year=? AND month=? AND subject=?')
    .get(grade, year, month, subject) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db
    .prepare('INSERT INTO exams (grade,year,month,exam_type,subject) VALUES (?,?,?,?,?)')
    .run(grade, year, month, examType, subject);
  return result.lastInsertRowid as number;
}

function upsertCutoff(examId: number, subSubject: string, data: Record<string, number | null>) {
  const cols = Object.keys(data);
  const vals = cols.map((c) => data[c]);
  const existing = db.prepare('SELECT id FROM grade_cutoffs WHERE exam_id=? AND sub_subject=?').get(examId, subSubject);
  if (existing) {
    db.prepare(`UPDATE grade_cutoffs SET ${cols.map((c) => `${c}=?`).join(',')} WHERE exam_id=? AND sub_subject=?`).run(...vals, examId, subSubject);
  } else {
    db.prepare(`INSERT INTO grade_cutoffs (exam_id,sub_subject,${cols.join(',')}) VALUES (?,?,${cols.map(() => '?').join(',')})`).run(examId, subSubject, ...vals);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const type = (formData.get('type') as string) ?? 'regular';
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: '데이터 없음' }, { status: 400 });

  const header = rows[0];
  const dataRows = rows.slice(1);
  let count = 0;
  const errors: string[] = [];

  for (const row of dataRows) {
    if (!row[0] || row[0].startsWith('※')) continue;
    const get = (col: string) => row[header.indexOf(col)];

    const grade = get('학년(고1/고2/고3)');
    const year = n(get('학년도'));
    const month = n(get('월'));
    const subject = get('과목');
    const subSubject = get('선택과목') ?? '';

    if (!grade || !year || !month || !subject) { errors.push(`스킵: ${row.join(',')}`); continue; }

    const examId = upsertExam(grade, year, month, subject);

    if (type === 'percent') {
      const data: Record<string, number | null> = { max_standard_score: null };
      for (let i = 1; i <= 9; i++) {
        data[`eng_pct_${i}`] = n(get(`${i}등급_누적비율(%)`));
        data[`grade_${i}_min`] = null;
        data[`grade_${i}_max`] = null;
      }
      upsertCutoff(examId, subSubject, data);
    } else {
      const data: Record<string, number | null> = { max_standard_score: n(get('표준점수_최고점')) };
      for (let i = 1; i <= 9; i++) {
        data[`grade_${i}_min`] = n(get(`${i}등급_하한`));
        data[`grade_${i}_max`] = n(get(`${i}등급_상한`));
        data[`eng_pct_${i}`] = null;
      }
      upsertCutoff(examId, subSubject, data);
    }
    count++;
  }

  return NextResponse.json({ ok: true, count, errors });
}
