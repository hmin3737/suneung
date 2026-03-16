import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

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
      `SELECT e.*, gc.grade_1, gc.grade_2, gc.grade_3, gc.grade_4, gc.grade_5,
              gc.grade_6, gc.grade_7, gc.grade_8, gc.grade_9
       FROM exams e
       LEFT JOIN grade_cutoffs gc ON gc.exam_id = e.id
       WHERE e.grade = ? AND e.year = ? AND e.month = ? AND e.subject = ?
       LIMIT 1`
    )
    .get(grade, parseInt(year), parseInt(month), subject);

  return NextResponse.json({ exam: exam || null });
}
