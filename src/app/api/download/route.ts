import { NextRequest, NextResponse } from 'next/server';
import { getPresignedDownloadUrl } from '@/lib/s3';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get('examId');
  const fileType = searchParams.get('type') as 'problem' | 'answer' | 'ebs' | 'listening_script' | 'listening_zip';

  if (!examId || !fileType) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 });
  }

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(parseInt(examId)) as {
    problem_s3_key: string | null;
    answer_s3_key: string | null;
    ebs_s3_key: string | null;
    listening_script_s3_key: string | null;
    listening_zip_s3_key: string | null;
  } | undefined;

  if (!exam) {
    return NextResponse.json({ error: '시험 없음' }, { status: 404 });
  }

  const keyMap = {
    problem: exam.problem_s3_key,
    answer: exam.answer_s3_key,
    ebs: exam.ebs_s3_key,
    listening_script: exam.listening_script_s3_key,
    listening_zip: exam.listening_zip_s3_key,
  };

  const s3Key = keyMap[fileType];
  if (!s3Key) {
    return NextResponse.json({ error: '파일 없음' }, { status: 404 });
  }

  const url = await getPresignedDownloadUrl(s3Key);
  return NextResponse.json({ url });
}
