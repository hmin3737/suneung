import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { uploadToS3, buildS3Key } from '@/lib/s3';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const formData = await req.formData();
  const grade = formData.get('grade') as string;
  const year = parseInt(formData.get('year') as string);
  const month = parseInt(formData.get('month') as string);
  const examType = formData.get('examType') as string;
  const subject = formData.get('subject') as string;

  const problemFile = formData.get('problem') as File | null;
  const answerFile = formData.get('answer') as File | null;
  const ebsFile = formData.get('ebs') as File | null;

  const grade1 = formData.get('grade_1') ? parseInt(formData.get('grade_1') as string) : null;
  const grade2 = formData.get('grade_2') ? parseInt(formData.get('grade_2') as string) : null;
  const grade3 = formData.get('grade_3') ? parseInt(formData.get('grade_3') as string) : null;
  const grade4 = formData.get('grade_4') ? parseInt(formData.get('grade_4') as string) : null;
  const grade5 = formData.get('grade_5') ? parseInt(formData.get('grade_5') as string) : null;
  const grade6 = formData.get('grade_6') ? parseInt(formData.get('grade_6') as string) : null;
  const grade7 = formData.get('grade_7') ? parseInt(formData.get('grade_7') as string) : null;
  const grade8 = formData.get('grade_8') ? parseInt(formData.get('grade_8') as string) : null;
  const grade9 = formData.get('grade_9') ? parseInt(formData.get('grade_9') as string) : null;

  // 기존 시험 확인
  const existing = db
    .prepare('SELECT id FROM exams WHERE grade=? AND year=? AND month=? AND subject=?')
    .get(grade, year, month, subject) as { id: number } | undefined;

  let examId: number;

  const problemKey = problemFile ? buildS3Key(grade, year, month, examType, subject, 'problem') : null;
  const answerKey = answerFile ? buildS3Key(grade, year, month, examType, subject, 'answer') : null;
  const ebsKey = ebsFile ? buildS3Key(grade, year, month, examType, subject, 'ebs') : null;

  if (existing) {
    examId = existing.id;
    db.prepare(
      `UPDATE exams SET exam_type=?,
       problem_s3_key=COALESCE(?, problem_s3_key),
       answer_s3_key=COALESCE(?, answer_s3_key),
       ebs_s3_key=COALESCE(?, ebs_s3_key)
       WHERE id=?`
    ).run(examType, problemKey, answerKey, ebsKey, examId);
  } else {
    const result = db
      .prepare(
        `INSERT INTO exams (grade, year, month, exam_type, subject, problem_s3_key, answer_s3_key, ebs_s3_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(grade, year, month, examType, subject, problemKey, answerKey, ebsKey);
    examId = result.lastInsertRowid as number;
  }

  // 등급컷 저장
  const hasCutoffs = [grade1, grade2, grade3, grade4, grade5, grade6, grade7, grade8, grade9].some(
    (v) => v !== null
  );
  if (hasCutoffs) {
    const existingCutoff = db.prepare('SELECT id FROM grade_cutoffs WHERE exam_id=?').get(examId);
    if (existingCutoff) {
      db.prepare(
        `UPDATE grade_cutoffs SET grade_1=?,grade_2=?,grade_3=?,grade_4=?,grade_5=?,grade_6=?,grade_7=?,grade_8=?,grade_9=? WHERE exam_id=?`
      ).run(grade1, grade2, grade3, grade4, grade5, grade6, grade7, grade8, grade9, examId);
    } else {
      db.prepare(
        `INSERT INTO grade_cutoffs (exam_id,grade_1,grade_2,grade_3,grade_4,grade_5,grade_6,grade_7,grade_8,grade_9) VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).run(examId, grade1, grade2, grade3, grade4, grade5, grade6, grade7, grade8, grade9);
    }
  }

  // S3 파일 업로드
  const uploads: Promise<void>[] = [];
  if (problemFile && problemKey) {
    uploads.push(uploadToS3(problemKey, Buffer.from(await problemFile.arrayBuffer()), 'application/pdf'));
  }
  if (answerFile && answerKey) {
    uploads.push(uploadToS3(answerKey, Buffer.from(await answerFile.arrayBuffer()), 'application/pdf'));
  }
  if (ebsFile && ebsKey) {
    uploads.push(uploadToS3(ebsKey, Buffer.from(await ebsFile.arrayBuffer()), 'application/pdf'));
  }
  await Promise.all(uploads);

  return NextResponse.json({ ok: true, examId });
}
