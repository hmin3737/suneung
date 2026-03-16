import { NextRequest, NextResponse } from 'next/server';

export const config = { api: { bodyParser: { sizeLimit: '500mb' } } };
import { isAdminAuthenticated } from '@/lib/auth';
import { uploadToS3, buildS3Key, type FileType } from '@/lib/s3';
import { getExamType } from '@/lib/constants';
import db from '@/lib/db';
import AdmZip from 'adm-zip';

// 파일명 파싱: {학년도}_{학년}_{월}월_{과목}_{종류}.(pdf|zip)
// 예) 2026_고3_11월_국어_문제.pdf / 2026_고3_11월_영어_듣기파일.zip
function parseFilename(filename: string): {
  year: number; grade: string; month: number; subject: string; fileType: FileType;
} | null {
  const normalized = filename.normalize('NFC');
  const base = normalized.replace(/\.(pdf|zip)$/i, '');
  const parts = base.split('_');
  console.log('[parse]', JSON.stringify(filename), '→ parts:', parts);
  if (parts.length < 5) return null;

  const year = parseInt(parts[0]);
  const grade = parts[1];
  const monthStr = parts[2].replace('월', '');
  const month = parseInt(monthStr);
  const typePart = parts[parts.length - 1];
  const subject = parts.slice(3, parts.length - 1).join('_');

  if (isNaN(year) || isNaN(month) || !grade || !subject) return null;

  const typeMap: Record<string, FileType> = {
    '문제': 'problem',
    '정답': 'answer',
    'EBS해설': 'ebs',
    '듣기대본': 'listening_script',
    '듣기파일': 'listening_zip',
  };
  const fileType = typeMap[typePart];
  if (!fileType) return null;

  return { year, grade, month, subject, fileType };
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const formData = await req.formData();
  const zipFile = formData.get('zip') as File | null;
  if (!zipFile) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const buf = Buffer.from(await zipFile.arrayBuffer());
  console.log('[bulk-files] zip size:', buf.length);
  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch (e) {
    console.error('[bulk-files] AdmZip parse error:', e);
    return NextResponse.json({ error: `ZIP 파싱 실패: ${(e as Error).message}` }, { status: 400 });
  }
  const entries = zip.getEntries();
  console.log('[bulk-files] entries:', entries.length);

  const results: { filename: string; status: string }[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const filename = entry.name;
    const lc = filename.toLowerCase();
    if (!lc.endsWith('.pdf') && !lc.endsWith('.zip')) {
      results.push({ filename, status: '스킵 (PDF/ZIP 아님)' });
      continue;
    }

    const parsed = parseFilename(filename);
    if (!parsed) {
      results.push({ filename, status: '파일명 형식 오류' });
      continue;
    }

    const { year, grade, month, subject, fileType } = parsed;
    const examType = getExamType(grade, month);

    // DB에 exam 없으면 생성
    let exam = db
      .prepare('SELECT id FROM exams WHERE grade=? AND year=? AND month=? AND subject=?')
      .get(grade, year, month, subject) as { id: number } | undefined;

    const s3Key = buildS3Key(grade, year, month, examType, subject, fileType);
    const keyColumn: Record<FileType, string> = {
      problem: 'problem_s3_key', answer: 'answer_s3_key', ebs: 'ebs_s3_key',
      listening_script: 'listening_script_s3_key', listening_zip: 'listening_zip_s3_key',
    };
    const col = keyColumn[fileType];

    if (!exam) {
      db.prepare(`INSERT OR IGNORE INTO exams (grade,year,month,exam_type,subject) VALUES (?,?,?,?,?)`).run(grade, year, month, examType, subject);
      exam = db.prepare('SELECT id FROM exams WHERE grade=? AND year=? AND month=? AND subject=?').get(grade, year, month, subject) as { id: number };
    }

    db.prepare(`UPDATE exams SET ${col}=? WHERE id=?`).run(s3Key, exam.id);

    try {
      const fileData = entry.getData();
      const contentType = fileType === 'listening_zip' ? 'application/zip' : 'application/pdf';
      await uploadToS3(s3Key, fileData, contentType);
      results.push({ filename, status: '완료' });
    } catch (e) {
      results.push({ filename, status: `S3 오류: ${(e as Error).message}` });
    }
  }

  return NextResponse.json({ ok: true, results });
}
