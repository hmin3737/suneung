type GradeCutoffTableProps = {
  cutoffs: {
    grade_1: number | null;
    grade_2: number | null;
    grade_3: number | null;
    grade_4: number | null;
    grade_5: number | null;
    grade_6: number | null;
    grade_7: number | null;
    grade_8: number | null;
    grade_9: number | null;
  };
};

const GRADE_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-gray-400',
];

export default function GradeCutoffTable({ cutoffs }: GradeCutoffTableProps) {
  const grades = [
    cutoffs.grade_1,
    cutoffs.grade_2,
    cutoffs.grade_3,
    cutoffs.grade_4,
    cutoffs.grade_5,
    cutoffs.grade_6,
    cutoffs.grade_7,
    cutoffs.grade_8,
    cutoffs.grade_9,
  ];

  const hasData = grades.some((v) => v !== null);
  if (!hasData) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-4">등급컷</h3>
      <div className="grid grid-cols-9 gap-2">
        {grades.map((score, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full ${GRADE_COLORS[i]} flex items-center justify-center text-white font-bold text-base`}
            >
              {i + 1}
            </div>
            <div className="text-lg font-bold text-gray-700">{score ?? '-'}</div>
            <div className="text-xs text-gray-400">{i + 1}등급</div>
          </div>
        ))}
      </div>
    </div>
  );
}
