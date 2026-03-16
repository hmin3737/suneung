import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getExamType } from '@/lib/constants';
import db from '@/lib/db';
import * as XLSX from 'xlsx';

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const num = parseFloat(String(v));
  return isNaN(num) ? null : num;
}

function upsertExam(grade: string, year: number, month: number, subject: string) {
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

function upsertCutoff(examId: number, data: Record<string, number | null>) {
  const existing = db.prepare('SELECT id FROM grade_cutoffs WHERE exam_id=?').get(examId);
  const cols = Object.keys(data);
  const vals = cols.map((c) => data[c]);

  if (existing) {
    const setClause = cols.map((c) => `${c}=?`).join(',');
    db.prepare(`UPDATE grade_cutoffs SET ${setClause} WHERE exam_id=?`).run(...vals, examId);
  } else {
    const placeholders = cols.map(() => '?').join(',');
    db.prepare(
      `INSERT INTO grade_cutoffs (exam_id,${cols.join(',')}) VALUES (?,${placeholders})`
    ).run(examId, ...vals);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const results: { sheet: string; rows: number; errors: string[] }[] = [];

  // ── 시트 1: 일반과목_등급컷 ──
  const ws1 = wb.Sheets['일반과목_등급컷'];
  if (ws1) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws1);
    let count = 0;
    const errors: string[] = [];
    for (const row of rows) {
      // 안내 행 스킵
      const grade = String(row['학년(고1/고2/고3)'] ?? '').trim();
      if (!grade || grade.startsWith('※')) continue;
      const year = n(row['학년도']);
      const month = n(row['월']);
      const subject = String(row['과목'] ?? '').trim();
      if (!grade || !year || !month || !subject) { errors.push(`스킵: ${JSON.stringify(row)}`); continue; }

      const examId = upsertExam(grade, year, month, subject);
      const data: Record<string, number | null> = { max_standard_score: n(row['표준점수_최고점']) };
      for (let i = 1; i <= 9; i++) {
        data[`grade_${i}_min`] = n(row[`${i}등급_하한`]);
        data[`grade_${i}_max`] = n(row[`${i}등급_상한`]);
      }
      upsertCutoff(examId, data);
      count++;
    }
    results.push({ sheet: '일반과목_등급컷', rows: count, errors });
  }

  // ── 시트 2: 영어_등급비율 ──
  const ws2 = wb.Sheets['영어_등급비율'];
  if (ws2) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws2);
    let count = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const grade = String(row['학년(고1/고2/고3)'] ?? '').trim();
      if (!grade) continue;
      const year = n(row['학년도']);
      const month = n(row['월']);
      if (!year || !month) { errors.push(`스킵: ${JSON.stringify(row)}`); continue; }

      const examId = upsertExam(grade, year, month, '영어');
      const data: Record<string, number | null> = { max_standard_score: null };
      for (let i = 1; i <= 9; i++) {
        data[`eng_pct_${i}`] = n(row[`${i}등급_누적비율(%)`]);
        data[`grade_${i}_min`] = null;
        data[`grade_${i}_max`] = null;
      }
      upsertCutoff(examId, data);
      count++;
    }
    results.push({ sheet: '영어_등급비율', rows: count, errors });
  }

  return NextResponse.json({ ok: true, results });
}
