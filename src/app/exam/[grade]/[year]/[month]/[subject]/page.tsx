import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import db from '@/lib/db';
import { getExamType } from '@/lib/constants';
import type { GradeCutoff } from '@/lib/db';
import FileDownloadCard from '@/components/FileDownloadCard';
import GradeCutoffTable from '@/components/GradeCutoffTable';
import AdBanner from '@/components/AdBanner';

type Params = { grade: string; year: string; month: string; subject: string };

function getExam(params: Params) {
  const grade = decodeURIComponent(params.grade);
  const year = parseInt(params.year);
  const month = parseInt(params.month);
  const subject = decodeURIComponent(params.subject);

  const exam = db
    .prepare(
      `SELECT id, grade, year, month, exam_type, subject,
        problem_s3_key, answer_s3_key, ebs_s3_key
       FROM exams WHERE grade=? AND year=? AND month=? AND subject=? LIMIT 1`
    )
    .get(grade, year, month, subject) as {
      id: number; grade: string; year: number; month: number;
      exam_type: string; subject: string;
      problem_s3_key: string | null; answer_s3_key: string | null; ebs_s3_key: string | null;
      listening_script_s3_key: string | null; listening_zip_s3_key: string | null;
    } | undefined;

  if (!exam) return null;

  const cutoffs = db
    .prepare(`SELECT * FROM grade_cutoffs WHERE exam_id=? ORDER BY sub_subject ASC`)
    .all(exam.id) as GradeCutoff[];

  return { ...exam, cutoffs };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  const exam = getExam(resolvedParams);
  if (!exam) return { title: '시험을 찾을 수 없습니다' };

  const examType = getExamType(exam.grade, exam.month);
  const typeLabel = examType === '수능'
    ? `${exam.year}년 수능`
    : examType === '평가원'
    ? `${exam.year}년 ${exam.month}월 평가원`
    : `${exam.year}년 ${exam.month}월 ${exam.grade} 교육청`;

  const title = `${typeLabel} ${exam.subject} 기출문제 & 등급컷`;
  const description = `${typeLabel} ${exam.subject} 기출문제, 정답지, EBS 해설 무료 다운로드. 등급컷 정보 제공.`;

  return {
    title: `${title} | 수능 자료실`,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function ExamPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const exam = getExam(resolvedParams);
  if (!exam) notFound();

  const examType = getExamType(exam.grade, exam.month);
  const typeLabel = examType === '수능'
    ? `${exam.year}년 수능`
    : examType === '평가원'
    ? `${exam.year}년 ${exam.month}월 평가원`
    : `${exam.year}년 ${exam.month}월 ${exam.grade} 교육청`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full flex justify-center py-3 bg-white border-b border-gray-100">
        <AdBanner slot="1234567890" format="horizontal" className="w-full max-w-4xl" />
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← 홈으로</Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            {typeLabel} {exam.subject} 기출문제
          </h1>
          <p className="text-gray-500">문제지 · 정답지 · EBS 해설 무료 다운로드 & 등급컷</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">{exam.grade}</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">
              {exam.year} {exam.month}월 {exam.exam_type}
            </span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">{exam.subject}</span>
          </div>

          <div className="flex flex-col gap-3">
            <FileDownloadCard examId={exam.id} fileType="problem" available={!!exam.problem_s3_key} />
            <FileDownloadCard examId={exam.id} fileType="answer" available={!!exam.answer_s3_key} />
            <FileDownloadCard examId={exam.id} fileType="ebs" available={!!exam.ebs_s3_key} />
            {(exam.listening_script_s3_key || exam.listening_zip_s3_key) && (
              <>
                <FileDownloadCard examId={exam.id} fileType="listening_script" available={!!exam.listening_script_s3_key} />
                <FileDownloadCard examId={exam.id} fileType="listening_zip" available={!!exam.listening_zip_s3_key} />
              </>
            )}
          </div>

          <div className="flex justify-center my-2">
            <AdBanner slot="0987654321" format="rectangle" className="w-full max-w-sm" />
          </div>

          {exam.cutoffs.length > 0 && (
            <GradeCutoffTable subject={exam.subject} cutoffs={exam.cutoffs} />
          )}

          <div className="flex justify-center mt-4">
            <AdBanner slot="1122334455" format="horizontal" className="w-full max-w-4xl" />
          </div>
        </div>
      </main>

      <footer className="text-center text-gray-400 text-sm py-8 border-t border-gray-100 bg-white mt-10">
        수능 자료실 · 수능/평가원/교육청 기출 무료 다운로드
      </footer>
    </div>
  );
}
