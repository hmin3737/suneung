import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const grade = searchParams.get('grade');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const subject = searchParams.get('subject');

  if (!grade || !year || !month || !subject) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 });
  }

  const exam = db
    .prepare(
      `SELECT e.*,
        gc.grade_1_min, gc.grade_1_max, gc.grade_2_min, gc.grade_2_max,
        gc.grade_3_min, gc.grade_3_max, gc.grade_4_min, gc.grade_4_max,
        gc.grade_5_min, gc.grade_5_max, gc.grade_6_min, gc.grade_6_max,
        gc.grade_7_min, gc.grade_7_max, gc.grade_8_min, gc.grade_8_max,
        gc.grade_9_min, gc.grade_9_max,
        gc.eng_pct_1, gc.eng_pct_2, gc.eng_pct_3, gc.eng_pct_4, gc.eng_pct_5,
        gc.eng_pct_6, gc.eng_pct_7, gc.eng_pct_8, gc.eng_pct_9,
        gc.max_standard_score
       FROM exams e
       LEFT JOIN grade_cutoffs gc ON gc.exam_id = e.id
       WHERE e.grade = ? AND e.year = ? AND e.month = ? AND e.subject = ?
       LIMIT 1`
    )
    .get(grade, parseInt(year), parseInt(month), subject);

  return NextResponse.json({ exam: exam || null });
}
