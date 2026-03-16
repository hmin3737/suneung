import { GradeCutoff } from '@/lib/db';
import { isPercentSubject } from '@/lib/constants';

type Props = {
  subject: string;
  cutoff: GradeCutoff;
};

const GRADE_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-gray-400',
];

function GradeCell({ index, label, value }: { index: number; label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full ${GRADE_COLORS[index]} flex items-center justify-center text-white font-bold text-base`}>
        {index + 1}
      </div>
      <div className="text-base font-bold text-gray-700 text-center leading-tight">{value ?? '—'}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

export default function GradeCutoffTable({ subject, cutoff }: Props) {
  const isEnglish = isPercentSubject(subject);

  if (isEnglish) {
    const pcts = [
      cutoff.eng_pct_1, cutoff.eng_pct_2, cutoff.eng_pct_3,
      cutoff.eng_pct_4, cutoff.eng_pct_5, cutoff.eng_pct_6,
      cutoff.eng_pct_7, cutoff.eng_pct_8, cutoff.eng_pct_9,
    ];
    if (pcts.every((v) => v === null)) return null;

    return (
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">등급 비율</h3>
          <span className="text-sm text-gray-400">영어 절대평가 누적비율</span>
        </div>
        <div className="grid grid-cols-9 gap-2">
          {pcts.map((pct, i) => (
            <GradeCell
              key={i}
              index={i}
              label={`${i + 1}등급`}
              value={pct !== null ? `${pct}%` : null}
            />
          ))}
        </div>
      </div>
    );
  }

  // 일반 과목 (범위 or 단일값)
  const grades = Array.from({ length: 9 }, (_, i) => ({
    min: (cutoff as any)[`grade_${i + 1}_min`] as number | null,
    max: (cutoff as any)[`grade_${i + 1}_max`] as number | null,
  }));

  if (grades.every((g) => g.min === null)) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">등급컷</h3>
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
          return (
            <GradeCell key={i} index={i} label={`${i + 1}등급`} value={display} />
          );
        })}
      </div>
    </div>
  );
}
