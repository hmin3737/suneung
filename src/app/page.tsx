'use client';

import { useState, useEffect, useCallback } from 'react';
import ExamSelector from '@/components/ExamSelector';
import FileDownloadCard from '@/components/FileDownloadCard';
import GradeCutoffTable from '@/components/GradeCutoffTable';
import AdBanner from '@/components/AdBanner';
import { MONTHS_BY_GRADE, getExamType } from '@/lib/constants';

type CutoffItem = {
  id: number;
  exam_id: number;
  sub_subject: string;
  grade_1_min: number | null; grade_1_max: number | null;
  grade_2_min: number | null; grade_2_max: number | null;
  grade_3_min: number | null; grade_3_max: number | null;
  grade_4_min: number | null; grade_4_max: number | null;
  grade_5_min: number | null; grade_5_max: number | null;
  grade_6_min: number | null; grade_6_max: number | null;
  grade_7_min: number | null; grade_7_max: number | null;
  grade_8_min: number | null; grade_8_max: number | null;
  grade_9_min: number | null; grade_9_max: number | null;
  eng_pct_1: number | null; eng_pct_2: number | null; eng_pct_3: number | null;
  eng_pct_4: number | null; eng_pct_5: number | null; eng_pct_6: number | null;
  eng_pct_7: number | null; eng_pct_8: number | null; eng_pct_9: number | null;
  max_standard_score: number | null;
};

type ExamData = {
  id: number;
  grade: string;
  year: number;
  month: number;
  exam_type: string;
  subject: string;
  problem_s3_key: string | null;
  answer_s3_key: string | null;
  ebs_s3_key: string | null;
  listening_script_s3_key: string | null;
  listening_zip_s3_key: string | null;
  cutoffs: CutoffItem[];
};

const currentYear = new Date().getFullYear();

export default function Home() {
  const [selection, setSelection] = useState({
    grade: '고3',
    year: currentYear,
    month: 11,
    subject: '국어',
  });
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleChange = (key: keyof typeof selection, value: string | number) => {
    setSelection((prev) => ({ ...prev, [key]: value }));
    setSearched(false);
    setExam(null);
  };

  const search = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        grade: selection.grade,
        year: String(selection.year),
        month: String(selection.month),
        subject: selection.subject,
      });
      const res = await fetch(`/api/exams?${params}`);
      const data = await res.json();
      setExam(data.exam);
    } catch {
      setExam(null);
    } finally {
      setLoading(false);
    }
  }, [selection]);

  const examTypeLabel = getExamType(selection.grade, selection.month);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 상단 광고 */}
      <div className="w-full flex justify-center py-3 bg-white border-b border-gray-100">
        <AdBanner slot="1234567890" format="horizontal" className="w-full max-w-4xl" />
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3">
            수능 자료실
          </h1>
          <p className="text-lg text-gray-500">
            수능 · 평가원 · 교육청 기출문제 & 등급컷 무료 다운로드
          </p>
        </div>

        {/* 선택 영역 */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-6">
          <ExamSelector selection={selection} onChange={handleChange} />

          <button
            onClick={search}
            disabled={loading}
            className="mt-6 w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-2xl font-extrabold rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98"
          >
            {loading ? '검색 중...' : '자료 검색'}
          </button>
        </div>

        {/* 결과 영역 */}
        {searched && !loading && (
          <>
            {exam ? (
              <div className="flex flex-col gap-4">
                {/* 시험 정보 */}
                <div className="flex items-center gap-3 px-2">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                    {exam.grade}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">
                    {exam.year}년도 {exam.month}월 {exam.exam_type}
                  </span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                    {exam.subject}
                  </span>
                </div>

                {/* 파일 다운로드 */}
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

                {/* 중간 광고 */}
                <div className="flex justify-center my-2">
                  <AdBanner slot="0987654321" format="rectangle" className="w-full max-w-sm" />
                </div>

                {/* 등급컷 */}
                <GradeCutoffTable subject={exam.subject} cutoffs={exam.cutoffs} />

                {/* 하단 광고 */}
                <div className="flex justify-center mt-4">
                  <AdBanner slot="1122334455" format="horizontal" className="w-full max-w-4xl" />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-xl font-bold text-gray-500">
                  {selection.year}년도 {selection.month}월 {selection.grade} {selection.subject} 자료가 아직 없습니다.
                </p>
                <p className="text-sm text-gray-400 mt-2">준비 중이거나 해당 시험이 없을 수 있습니다.</p>
              </div>
            )}
          </>
        )}

        {!searched && (
          <div className="text-center text-gray-400 py-16">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg">위에서 학년, 연도, 월, 과목을 선택하고 검색하세요.</p>
          </div>
        )}
      </main>

      <footer className="text-center text-gray-400 text-sm py-8 border-t border-gray-100 bg-white mt-10">
        수능 자료실 · 수능/평가원/교육청 기출 무료 다운로드
      </footer>
    </div>
  );
}
