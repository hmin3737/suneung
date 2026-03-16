'use client';

import { useState } from 'react';
import { GRADES, MONTHS_BY_GRADE, MAIN_SUBJECTS, SUB_SUBJECTS, YEARS } from '@/lib/constants';

type SelectionState = {
  grade: string;
  year: number;
  month: number;
  subject: string;
};

type Props = {
  selection: SelectionState;
  onChange: (key: keyof SelectionState, value: string | number) => void;
};

// selection.subject에서 mainSubject 역추출
function getMainFromSubject(subject: string): string {
  for (const [main, subs] of Object.entries(SUB_SUBJECTS)) {
    if (subs?.includes(subject)) return main;
  }
  return (MAIN_SUBJECTS as readonly string[]).includes(subject) ? subject : '국어';
}

export default function ExamSelector({ selection, onChange }: Props) {
  const months = MONTHS_BY_GRADE[selection.grade] || [];
  const [mainSubject, setMainSubject] = useState(() => getMainFromSubject(selection.subject));
  const subList = SUB_SUBJECTS[mainSubject as keyof typeof SUB_SUBJECTS] ?? null;

  const handleMainChange = (main: string) => {
    setMainSubject(main);
    const subs = SUB_SUBJECTS[main as keyof typeof SUB_SUBJECTS];
    // 세부과목이 있으면 첫 번째 세부과목, 없으면 main 자체
    onChange('subject', subs ? subs[0] : main);
  };

  const handleGradeChange = (g: string) => {
    onChange('grade', g);
    const newMonths = MONTHS_BY_GRADE[g] || [];
    if (!newMonths.includes(selection.month)) {
      onChange('month', newMonths[0] ?? 11);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 학년 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">학년</label>
          <div className="flex flex-col gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => handleGradeChange(g)}
                className={`py-4 rounded-xl text-xl font-bold transition-all border-2 ${
                  selection.grade === g
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 학년도 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">학년도</label>
          <select
            value={selection.year}
            onChange={(e) => onChange('year', parseInt(e.target.value))}
            className="py-4 px-3 rounded-xl text-xl font-bold border-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}년도</option>
            ))}
          </select>
        </div>

        {/* 월 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">시험 월</label>
          <div className="grid grid-cols-2 gap-2">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => onChange('month', m)}
                className={`py-3 rounded-xl text-lg font-bold transition-all border-2 ${
                  selection.month === m
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                }`}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>

        {/* 과목 (메인) */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">과목</label>
          <div className="flex flex-col gap-2">
            {MAIN_SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => handleMainChange(s)}
                className={`py-2 px-3 rounded-xl text-base font-bold transition-all border-2 text-left ${
                  mainSubject === s
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 세부 과목 */}
      {subList && (
        <div className="bg-blue-50 rounded-2xl p-4">
          <label className="text-sm font-semibold text-blue-600 mb-3 block">세부 과목 선택</label>
          <div className="flex flex-wrap gap-2">
            {subList.map((sub) => (
              <button
                key={sub}
                onClick={() => onChange('subject', sub)}
                className={`py-2 px-4 rounded-xl text-sm font-bold transition-all border-2 ${
                  selection.subject === sub
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
