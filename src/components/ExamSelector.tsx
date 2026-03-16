'use client';

import { GRADES, MONTHS_BY_GRADE, SUBJECTS, YEARS, EXAM_TYPES } from '@/lib/constants';

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

export default function ExamSelector({ selection, onChange }: Props) {
  const months = MONTHS_BY_GRADE[selection.grade] || [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 학년 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">학년</label>
        <div className="flex flex-col gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => onChange('grade', g)}
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
            <option key={y} value={y}>
              {y}년도
            </option>
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

      {/* 과목 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">과목</label>
        <select
          value={selection.subject}
          onChange={(e) => onChange('subject', e.target.value)}
          className="py-4 px-3 rounded-xl text-xl font-bold border-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-white"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
