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
      `SELECT id, grade, year, month, exam_type, subject,
        problem_s3_key, answer_s3_key, ebs_s3_key
       FROM exams
       WHERE grade = ? AND year = ? AND month = ? AND subject = ?
       LIMIT 1`
    )
    .get(grade, parseInt(year), parseInt(month), subject);

  if (!exam) return NextResponse.json({ exam: null });

  const cutoffs = db
    .prepare(`SELECT * FROM grade_cutoffs WHERE exam_id = ? ORDER BY sub_subject ASC`)
    .all((exam as any).id);

  return NextResponse.json({ exam: { ...(exam as object), cutoffs } });
}
