import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { uploadToS3, buildS3Key, type FileType } from '@/lib/s3';
import { getElectives } from '@/lib/constants';
import db from '@/lib/db';

function num(v: FormDataEntryValue | null) {
  if (!v || v === '') return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function upsertCutoff(examId: number, subSubject: string, data: Record<string, number | null>) {
  const hasCutoffs = Object.values(data).some((v) => v !== null);
  if (!hasCutoffs) return;

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
  const grade = formData.get('grade') as string;
  const year = parseInt(formData.get('year') as string);
  const month = parseInt(formData.get('month') as string);
  const examType = formData.get('examType') as string;
  const subject = formData.get('subject') as string;

  const problemFile = formData.get('problem') as File | null;
  const answerFile = formData.get('answer') as File | null;
  const ebsFile = formData.get('ebs') as File | null;
  const listeningScriptFile = formData.get('listening_script') as File | null;
  const listeningZipFile = formData.get('listening_zip') as File | null;

  // 기존 시험 확인
  const existing = db
    .prepare('SELECT id FROM exams WHERE grade=? AND year=? AND month=? AND subject=?')
    .get(grade, year, month, subject) as { id: number } | undefined;

  let examId: number;

  const k = (f: File | null, type: FileType) => f?.size ? buildS3Key(grade, year, month, examType, subject, type) : null;
  const problemKey = k(problemFile, 'problem');
  const answerKey = k(answerFile, 'answer');
  const ebsKey = k(ebsFile, 'ebs');
  const listeningScriptKey = k(listeningScriptFile, 'listening_script');
  const listeningZipKey = k(listeningZipFile, 'listening_zip');

  if (existing) {
    examId = existing.id;
    db.prepare(
      `UPDATE exams SET exam_type=?,
       problem_s3_key=COALESCE(?, problem_s3_key),
       answer_s3_key=COALESCE(?, answer_s3_key),
       ebs_s3_key=COALESCE(?, ebs_s3_key),
       listening_script_s3_key=COALESCE(?, listening_script_s3_key),
       listening_zip_s3_key=COALESCE(?, listening_zip_s3_key)
       WHERE id=?`
    ).run(examType, problemKey, answerKey, ebsKey, listeningScriptKey, listeningZipKey, examId);
  } else {
    const result = db
      .prepare(
        `INSERT INTO exams (grade, year, month, exam_type, subject, problem_s3_key, answer_s3_key, ebs_s3_key, listening_script_s3_key, listening_zip_s3_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(grade, year, month, examType, subject, problemKey, answerKey, ebsKey, listeningScriptKey, listeningZipKey);
    examId = result.lastInsertRowid as number;
  }

  // 등급컷 저장 (선택과목별)
  const electives = getElectives(subject);

  if (electives.length > 0) {
    // 국어/수학: 선택과목별 접두사 필드명 처리
    for (const elective of electives) {
      const prefix = `${elective}_`;
      const data: Record<string, number | null> = {
        max_standard_score: num(formData.get(`${prefix}max_standard_score`)),
      };
      for (let i = 1; i <= 9; i++) {
        data[`grade_${i}_min`] = num(formData.get(`${prefix}grade_${i}_min`));
        data[`grade_${i}_max`] = num(formData.get(`${prefix}grade_${i}_max`));
        data[`eng_pct_${i}`] = null;
      }
      upsertCutoff(examId, elective, data);
    }
  } else {
    // 일반 과목
    const isPercent = formData.get('is_percent') === '1';
    const data: Record<string, number | null> = {
      max_standard_score: isPercent ? null : num(formData.get('max_standard_score')),
    };
    for (let i = 1; i <= 9; i++) {
      if (isPercent) {
        data[`eng_pct_${i}`] = num(formData.get(`eng_pct_${i}`));
        data[`grade_${i}_min`] = null;
        data[`grade_${i}_max`] = null;
      } else {
        data[`grade_${i}_min`] = num(formData.get(`grade_${i}_min`));
        data[`grade_${i}_max`] = num(formData.get(`grade_${i}_max`));
        data[`eng_pct_${i}`] = null;
      }
    }
    upsertCutoff(examId, '', data);
  }

  // S3 업로드
  const uploads: Promise<void>[] = [];
  if (problemFile?.size && problemKey)
    uploads.push(uploadToS3(problemKey, Buffer.from(await problemFile.arrayBuffer()), 'application/pdf'));
  if (answerFile?.size && answerKey)
    uploads.push(uploadToS3(answerKey, Buffer.from(await answerFile.arrayBuffer()), 'application/pdf'));
  if (ebsFile?.size && ebsKey)
    uploads.push(uploadToS3(ebsKey, Buffer.from(await ebsFile.arrayBuffer()), 'application/pdf'));
  if (listeningScriptFile?.size && listeningScriptKey)
    uploads.push(uploadToS3(listeningScriptKey, Buffer.from(await listeningScriptFile.arrayBuffer()), 'application/pdf'));
  if (listeningZipFile?.size && listeningZipKey)
    uploads.push(uploadToS3(listeningZipKey, Buffer.from(await listeningZipFile.arrayBuffer()), 'application/zip'));
  await Promise.all(uploads);

  return NextResponse.json({ ok: true, examId });
}
