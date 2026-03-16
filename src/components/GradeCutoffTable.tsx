'use client';

import { GradeCutoff } from '@/lib/db';
import { isPercentSubject, ELECTIVE_LABELS } from '@/lib/constants';

type Props = {
  subject: string;
  cutoffs: GradeCutoff[];
};

const GRADE_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-gray-400',
];

function GradeCell({ index, value }: { index: number; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full ${GRADE_COLORS[index]} flex items-center justify-center text-white font-bold text-base`}>
        {index + 1}
      </div>
      <div className="text-base font-bold text-gray-700 text-center leading-tight">{value ?? '—'}</div>
      <div className="text-xs text-gray-400">{index + 1}등급</div>
    </div>
  );
}

function RegularSection({ title, cutoff }: { title: string; cutoff: GradeCutoff }) {
  const grades = Array.from({ length: 9 }, (_, i) => ({
    min: cutoff[`grade_${i + 1}_min` as keyof GradeCutoff] as number | null,
    max: cutoff[`grade_${i + 1}_max` as keyof GradeCutoff] as number | null,
  }));
  if (grades.every((g) => g.min === null)) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        {cutoff.max_standard_score !== null && (
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            표준점수 최고점: {cutoff.max_standard_score}점
          </span>
        )}
      </div>
      <div className="grid grid-cols-9 gap-2">
        {grades.map((g, i) => {
          const display =
            g.min === null ? null :
            g.max !== null && g.max !== g.min ? `${g.min}~${g.max}` :
            `${g.min}`;
          return <GradeCell key={i} index={i} value={display} />;
        })}
      </div>
    </div>
  );
}

function PercentSection({ cutoff }: { cutoff: GradeCutoff }) {
  const pcts = Array.from({ length: 9 }, (_, i) =>
    cutoff[`eng_pct_${i + 1}` as keyof GradeCutoff] as number | null
  );
  if (pcts.every((v) => v === null)) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">등급 비율</h3>
        <span className="text-sm text-gray-400">절대평가 누적비율</span>
      </div>
      <div className="grid grid-cols-9 gap-2">
        {pcts.map((pct, i) => (
          <GradeCell key={i} index={i} value={pct !== null ? `${pct}%` : null} />
        ))}
      </div>
    </div>
  );
}

export default function GradeCutoffTable({ subject, cutoffs }: Props) {
  if (!cutoffs || cutoffs.length === 0) return null;

  if (isPercentSubject(subject)) {
    const base = cutoffs.find((c) => c.sub_subject === '') ?? cutoffs[0];
    return <PercentSection cutoff={base} />;
  }

  // 선택과목 없는 과목
  if (cutoffs.every((c) => c.sub_subject === '')) {
    return <RegularSection title="등급컷" cutoff={cutoffs[0]} />;
  }

  // 국어/수학: 선택과목별 섹션
  return (
    <div className="flex flex-col gap-4">
      {cutoffs.map((c) => {
        const label = c.sub_subject === '' ? '등급컷' : `${ELECTIVE_LABELS[c.sub_subject] ?? c.sub_subject} 등급컷`;
        return <RegularSection key={c.sub_subject} title={label} cutoff={c} />;
      })}
    </div>
  );
}
