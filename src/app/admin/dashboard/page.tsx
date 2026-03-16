'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GRADES, SUBJECTS, YEARS, MONTHS_BY_GRADE } from '@/lib/constants';

type Exam = {
  id: number;
  grade: string;
  year: number;
  month: number;
  exam_type: string;
  subject: string;
  problem_s3_key: string | null;
  answer_s3_key: string | null;
  ebs_s3_key: string | null;
};

const EXAM_TYPE_OPTIONS: Record<string, string[]> = {
  고1: ['교육청'],
  고2: ['교육청'],
  고3: ['교육청', '평가원', '수능'],
};

export default function AdminDashboard() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [grade, setGrade] = useState('고3');
  const [year, setYear] = useState(YEARS[0]);
  const [month, setMonth] = useState(11);
  const [examType, setExamType] = useState('수능');
  const [subject, setSubject] = useState('국어');
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [ebsFile, setEbsFile] = useState<File | null>(null);
  const [cutoffs, setCutoffs] = useState<Record<string, string>>({});

  const months = MONTHS_BY_GRADE[grade] || [];
  const examTypes = EXAM_TYPE_OPTIONS[grade] || ['교육청'];

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/exams');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setExams(data.exams || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('grade', grade);
      form.append('year', String(year));
      form.append('month', String(month));
      form.append('examType', examType);
      form.append('subject', subject);
      if (problemFile) form.append('problem', problemFile);
      if (answerFile) form.append('answer', answerFile);
      if (ebsFile) form.append('ebs', ebsFile);
      for (let i = 1; i <= 9; i++) {
        const val = cutoffs[`grade_${i}`];
        if (val) form.append(`grade_${i}`, val);
      }

      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      if (res.ok) {
        setMessage('저장 완료!');
        setProblemFile(null);
        setAnswerFile(null);
        setEbsFile(null);
        setCutoffs({});
        fetchExams();
      } else {
        const err = await res.json();
        setMessage(`오류: ${err.error}`);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까? S3 파일도 함께 삭제됩니다.')) return;
    await fetch('/api/admin/exams', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchExams();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 font-medium">
            로그아웃
          </button>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-700 mb-5">시험 자료 추가 / 수정</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">학년</label>
                <select value={grade} onChange={(e) => { setGrade(e.target.value); setExamType(EXAM_TYPE_OPTIONS[e.target.value]?.[0] || '교육청'); }}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">학년도</label>
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">월</label>
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {months.map((m) => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">시험 종류</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {examTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">과목</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 파일 업로드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['problem', 'answer', 'ebs'] as const).map((type) => {
                const labels = { problem: '📄 문제지 PDF', answer: '✅ 정답지 PDF', ebs: '📚 EBS 해설 PDF' };
                const fileMap = { problem: problemFile, answer: answerFile, ebs: ebsFile };
                const setters = { problem: setProblemFile, answer: setAnswerFile, ebs: setEbsFile };
                return (
                  <div key={type} className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">{labels[type]}</label>
                    <input type="file" accept=".pdf" onChange={(e) => setters[type](e.target.files?.[0] || null)}
                      className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:border-0 file:rounded-lg file:bg-blue-50 file:text-blue-700 file:font-medium" />
                    {fileMap[type] && <p className="text-xs text-green-600 mt-1">{fileMap[type]!.name}</p>}
                  </div>
                );
              })}
            </div>

            {/* 등급컷 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">등급컷 (빈칸 가능)</label>
              <div className="grid grid-cols-9 gap-2">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((g) => (
                  <div key={g} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{g}등급</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cutoffs[`grade_${g}`] || ''}
                      onChange={(e) => setCutoffs((prev) => ({ ...prev, [`grade_${g}`]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-1 py-2 text-center text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="-"
                    />
                  </div>
                ))}
              </div>
            </div>

            {message && (
              <p className={`text-sm font-medium ${message.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>
                {message}
              </p>
            )}

            <button type="submit" disabled={submitLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50">
              {submitLoading ? '저장 중...' : '저장 (추가/수정)'}
            </button>
          </form>
        </div>

        {/* 시험 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4">등록된 시험 ({exams.length}개)</h2>
          {loading ? (
            <p className="text-gray-400">로딩 중...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left py-2 px-2">학년</th>
                    <th className="text-left py-2 px-2">연도</th>
                    <th className="text-left py-2 px-2">월</th>
                    <th className="text-left py-2 px-2">종류</th>
                    <th className="text-left py-2 px-2">과목</th>
                    <th className="text-center py-2 px-2">문제</th>
                    <th className="text-center py-2 px-2">정답</th>
                    <th className="text-center py-2 px-2">EBS</th>
                    <th className="text-center py-2 px-2">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium">{e.grade}</td>
                      <td className="py-2 px-2">{e.year}</td>
                      <td className="py-2 px-2">{e.month}월</td>
                      <td className="py-2 px-2">{e.exam_type}</td>
                      <td className="py-2 px-2">{e.subject}</td>
                      <td className="py-2 px-2 text-center">{e.problem_s3_key ? '✅' : '—'}</td>
                      <td className="py-2 px-2 text-center">{e.answer_s3_key ? '✅' : '—'}</td>
                      <td className="py-2 px-2 text-center">{e.ebs_s3_key ? '✅' : '—'}</td>
                      <td className="py-2 px-2 text-center">
                        <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600 font-medium">
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {exams.length === 0 && <p className="text-gray-400 text-center py-8">등록된 시험이 없습니다.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
