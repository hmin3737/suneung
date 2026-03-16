import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { deleteFromS3 } from '@/lib/s3';
import db, { Exam } from '@/lib/db';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }
  const exams = db.prepare('SELECT * FROM exams ORDER BY year DESC, month DESC').all();
  return NextResponse.json({ exams });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }
  const { id } = await req.json();
  const exam = db.prepare('SELECT * FROM exams WHERE id=?').get(id) as Exam | undefined;
  if (!exam) return NextResponse.json({ error: '없음' }, { status: 404 });

  const keys = [exam.problem_s3_key, exam.answer_s3_key, exam.ebs_s3_key].filter(Boolean) as string[];
  await Promise.all(keys.map(deleteFromS3));

  db.prepare('DELETE FROM exams WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
