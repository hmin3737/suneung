import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { uploadToS3, buildS3Key } from '@/lib/s3';
import db from '@/lib/db';

function num(v: FormDataEntryValue | null) {
  if (!v || v === '') return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

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

  // 등급컷 파싱
  const cutoffData: Record<string, number | null> = {};
  for (let i = 1; i <= 9; i++) {
    cutoffData[`grade_${i}_min`] = num(formData.get(`grade_${i}_min`));
    cutoffData[`grade_${i}_max`] = num(formData.get(`grade_${i}_max`));
    cutoffData[`eng_pct_${i}`] = num(formData.get(`eng_pct_${i}`));
  }
  cutoffData['max_standard_score'] = num(formData.get('max_standard_score'));

  const hasCutoffs = Object.values(cutoffData).some((v) => v !== null);

  // 기존 시험 확인
  const existing = db
    .prepare('SELECT id FROM exams WHERE grade=? AND year=? AND month=? AND subject=?')
    .get(grade, year, month, subject) as { id: number } | undefined;

  let examId: number;

  const problemKey = problemFile?.size ? buildS3Key(grade, year, month, examType, subject, 'problem') : null;
  const answerKey = answerFile?.size ? buildS3Key(grade, year, month, examType, subject, 'answer') : null;
  const ebsKey = ebsFile?.size ? buildS3Key(grade, year, month, examType, subject, 'ebs') : null;

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
  if (hasCutoffs) {
    const existingCutoff = db.prepare('SELECT id FROM grade_cutoffs WHERE exam_id=?').get(examId);
    const cols = Object.keys(cutoffData);
    const vals = cols.map((c) => cutoffData[c]);

    if (existingCutoff) {
      const setClause = cols.map((c) => `${c}=?`).join(',');
      db.prepare(`UPDATE grade_cutoffs SET ${setClause} WHERE exam_id=?`).run(...vals, examId);
    } else {
      const placeholders = cols.map(() => '?').join(',');
      db.prepare(
        `INSERT INTO grade_cutoffs (exam_id,${cols.join(',')}) VALUES (?,${placeholders})`
      ).run(examId, ...vals);
    }
  }

  // S3 업로드
  const uploads: Promise<void>[] = [];
  if (problemFile?.size && problemKey)
    uploads.push(uploadToS3(problemKey, Buffer.from(await problemFile.arrayBuffer()), 'application/pdf'));
  if (answerFile?.size && answerKey)
    uploads.push(uploadToS3(answerKey, Buffer.from(await answerFile.arrayBuffer()), 'application/pdf'));
  if (ebsFile?.size && ebsKey)
    uploads.push(uploadToS3(ebsKey, Buffer.from(await ebsFile.arrayBuffer()), 'application/pdf'));
  await Promise.all(uploads);

  return NextResponse.json({ ok: true, examId });
}
