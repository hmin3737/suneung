'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GRADES, MAIN_SUBJECTS, SUB_SUBJECTS, YEARS, MONTHS_BY_GRADE, resolveSubject, getExamType, isPercentSubject } from '@/lib/constants';

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

type Tab = 'single' | 'excel' | 'bulk';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('single');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/exams');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setExams(data.exams || []);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까? S3 파일도 함께 삭제됩니다.')) return;
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 font-medium">로그아웃</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          {([['single', '개별 입력'], ['excel', '엑셀 일괄 입력'], ['bulk', 'PDF 일괄 업로드']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all border-2 ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'single' && <SingleUploadForm onDone={fetchExams} />}
        {tab === 'excel' && <ExcelUploadForm />}
        {tab === 'bulk' && <BulkFileForm onDone={fetchExams} />}

        {/* 시험 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4">등록된 시험 ({exams.length}개)</h2>
          {loading ? <p className="text-gray-400">로딩 중...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left py-2 px-2">학년</th><th className="text-left py-2 px-2">연도</th>
                    <th className="text-left py-2 px-2">월</th><th className="text-left py-2 px-2">종류</th>
                    <th className="text-left py-2 px-2">과목</th><th className="text-center py-2 px-2">문제</th>
                    <th className="text-center py-2 px-2">정답</th><th className="text-center py-2 px-2">EBS</th>
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
                        <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600 font-medium">삭제</button>
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

// ─── 개별 입력 폼 ───────────────────────────────────────
function SingleUploadForm({ onDone }: { onDone: () => void }) {
  const [grade, setGrade] = useState('고3');
  const [year, setYear] = useState(YEARS[0]);
  const [month, setMonth] = useState(11);
  const [mainSubject, setMainSubject] = useState('국어');
  const [subSubject, setSubSubject] = useState('');
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [ebsFile, setEbsFile] = useState<File | null>(null);
  const [cutoffMin, setCutoffMin] = useState<Record<string, string>>({});
  const [cutoffMax, setCutoffMax] = useState<Record<string, string>>({});
  const [engPct, setEngPct] = useState<Record<string, string>>({});
  const [maxScore, setMaxScore] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const months = MONTHS_BY_GRADE[grade] || [];
  const examType = getExamType(grade, month);
  const subList = SUB_SUBJECTS[mainSubject as keyof typeof SUB_SUBJECTS] ?? null;
  const resolvedSubject = resolveSubject(mainSubject, subSubject || subList?.[0] || mainSubject);
  const isEnglish = isPercentSubject(resolvedSubject);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const form = new FormData();
      form.append('grade', grade);
      form.append('year', String(year));
      form.append('month', String(month));
      form.append('examType', examType);
      form.append('subject', resolvedSubject);
      if (problemFile) form.append('problem', problemFile);
      if (answerFile) form.append('answer', answerFile);
      if (ebsFile) form.append('ebs', ebsFile);
      if (maxScore) form.append('max_standard_score', maxScore);
      for (let i = 1; i <= 9; i++) {
        if (isEnglish) {
          if (engPct[i]) form.append(`eng_pct_${i}`, engPct[i]);
        } else {
          if (cutoffMin[i]) form.append(`grade_${i}_min`, cutoffMin[i]);
          if (cutoffMax[i]) form.append(`grade_${i}_max`, cutoffMax[i]);
        }
      }
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      if (res.ok) {
        setMessage('저장 완료!');
        setProblemFile(null); setAnswerFile(null); setEbsFile(null);
        setCutoffMin({}); setCutoffMax({}); setEngPct({}); setMaxScore('');
        onDone();
      } else {
        const err = await res.json();
        setMessage(`오류: ${err.error}`);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-700 mb-5">개별 입력</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">학년</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}
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
            <div className="border-2 border-gray-100 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 font-semibold">
              {examType} <span className="text-xs font-normal">(자동)</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">과목</label>
            <select value={mainSubject} onChange={(e) => { setMainSubject(e.target.value); setSubSubject(''); }}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
              {MAIN_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 세부 과목 */}
        {subList && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">세부 과목</label>
            <div className="flex flex-wrap gap-2">
              {subList.map((sub) => (
                <button type="button" key={sub} onClick={() => setSubSubject(sub)}
                  className={`py-1 px-3 rounded-lg text-sm font-bold border-2 transition-all ${(subSubject || subList[0]) === sub ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                  {sub}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">저장 과목: <strong>{resolvedSubject}</strong></p>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500">등급컷</label>
            {!isEnglish && (
              <div className="flex items-center gap-1">
                <input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)}
                  className="w-20 border-2 border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:border-blue-500 focus:outline-none"
                  placeholder="최고점" />
                <span className="text-xs text-gray-500">표준점수 최고점</span>
              </div>
            )}
          </div>

          {isEnglish ? (
            <div>
              <p className="text-xs text-blue-600 mb-2">영어 절대평가 — 각 등급 누적비율(%) 입력</p>
              <div className="grid grid-cols-9 gap-2">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((g) => (
                  <div key={g} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{g}등급</span>
                    <input type="number" step="0.01" min="0" max="100"
                      value={engPct[g] || ''}
                      onChange={(e) => setEngPct((p) => ({ ...p, [g]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-1 py-2 text-center text-xs focus:border-blue-500 focus:outline-none"
                      placeholder="%" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-2">단일값은 하한만 입력. 범위면 하한~상한 모두 입력.</p>
              <div className="grid grid-cols-9 gap-2">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((g) => (
                  <div key={g} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{g}등급</span>
                    <input type="number" value={cutoffMin[g] || ''}
                      onChange={(e) => setCutoffMin((p) => ({ ...p, [g]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-1 py-1 text-center text-xs focus:border-blue-500 focus:outline-none"
                      placeholder="하한" />
                    <input type="number" value={cutoffMax[g] || ''}
                      onChange={(e) => setCutoffMax((p) => ({ ...p, [g]: e.target.value }))}
                      className="w-full border-2 border-gray-100 rounded-lg px-1 py-1 text-center text-xs focus:border-blue-300 focus:outline-none bg-gray-50"
                      placeholder="상한" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {message && <p className={`text-sm font-medium ${message.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50">
          {loading ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}

// ─── CSV 일괄 입력 ────────────────────────────────────
function ExcelUploadForm() {
  const [csvType, setCsvType] = useState<'regular' | 'percent'>('regular');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setResult('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', csvType);
      const res = await fetch('/api/admin/excel-upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) setResult(`완료: ${data.count}행 처리${data.errors.length ? ` (오류 ${data.errors.length}개)` : ''}`);
      else setResult(`오류: ${data.error}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-700 mb-2">CSV 일괄 입력</h2>
      <p className="text-sm text-gray-500 mb-5">등급컷 데이터를 CSV로 한 번에 입력합니다. CSV는 엑셀에서 그대로 열립니다.</p>

      <div className="flex gap-2 mb-4">
        {(['regular', 'percent'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setCsvType(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${csvType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {t === 'regular' ? '일반과목 (국어/수학/탐구 등)' : '절대평가 (영어/제2외국어/한문)'}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-5">
        <a href={`/api/admin/template?type=${csvType}`} download
          className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm">
          📥 CSV 양식 다운로드
        </a>
        <p className="text-sm text-gray-400 self-center">양식을 다운받아 작성 후 업로드하세요.</p>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
          <input type="file" accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-blue-50 file:text-blue-700 file:font-medium" />
          {file && <p className="text-xs text-green-600 mt-2">{file.name}</p>}
        </div>
        {result && (
          <p className={`text-sm font-medium p-3 rounded-lg ${result.startsWith('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {result}
          </p>
        )}
        <button type="submit" disabled={loading || !file}
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50">
          {loading ? '업로드 중...' : '업로드'}
        </button>
      </form>
    </div>
  );
}

// ─── PDF 일괄 업로드 ──────────────────────────────────
function BulkFileForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ filename: string; status: string }[]>([]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setResult([]);
    try {
      const form = new FormData();
      form.append('zip', file);
      const res = await fetch('/api/admin/bulk-files', { method: 'POST', body: form });
      let data: { results?: { filename: string; status: string }[]; error?: string };
      try {
        data = await res.json();
      } catch {
        setResult([{ filename: '서버 오류', status: `HTTP ${res.status} — JSON 파싱 실패` }]);
        return;
      }
      if (res.ok) { setResult(data.results ?? []); onDone(); }
      else setResult([{ filename: '오류', status: data.error ?? `HTTP ${res.status}` }]);
    } catch (err) {
      setResult([{ filename: '네트워크 오류', status: String(err) }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-700 mb-2">PDF 일괄 업로드</h2>
      <p className="text-sm text-gray-500 mb-4">PDF 파일들을 ZIP으로 압축해서 한 번에 업로드합니다.</p>

      <div className="bg-blue-50 rounded-xl p-4 mb-5 text-sm text-blue-700">
        <p className="font-bold mb-1">파일명 규칙:</p>
        <code className="block">{'{학년도}_{학년}_{월}월_{과목}_{종류}.pdf'}</code>
        <p className="mt-2 text-xs text-blue-500">종류: 문제 / 정답 / EBS해설</p>
        <div className="mt-2 text-xs text-blue-600 space-y-0.5">
          <p>예) 2026_고3_11월_국어_문제.pdf</p>
          <p>예) 2026_고3_6월_수학_정답.pdf</p>
          <p>예) 2026_고1_3월_영어_EBS해설.pdf</p>
        </div>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
          <input type="file" accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-blue-50 file:text-blue-700 file:font-medium" />
          {file && <p className="text-xs text-green-600 mt-2">{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</p>}
        </div>
        {result.length > 0 && (
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl">
            {result.map((r, i) => (
              <div key={i} className={`flex justify-between text-xs px-4 py-2 border-b border-gray-50 ${r.status === '완료' ? 'text-green-700' : 'text-red-500'}`}>
                <span>{r.filename}</span>
                <span className="font-medium">{r.status}</span>
              </div>
            ))}
          </div>
        )}
        <button type="submit" disabled={loading || !file}
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50">
          {loading ? '업로드 중...' : 'ZIP 업로드'}
        </button>
      </form>
    </div>
  );
}
