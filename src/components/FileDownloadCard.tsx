'use client';

import { useState } from 'react';

type FileCardProps = {
  examId: number;
  fileType: 'problem' | 'answer' | 'ebs';
  available: boolean;
};

const FILE_INFO = {
  problem: { label: '문제지', icon: '📄', color: 'blue' },
  answer: { label: '정답지', icon: '✅', color: 'green' },
  ebs: { label: 'EBS 해설', icon: '📚', color: 'purple' },
} as const;

const COLOR_CLASSES = {
  blue: {
    card: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100',
    btn: 'bg-blue-600 hover:bg-blue-700',
    icon: 'bg-blue-50',
  },
  green: {
    card: 'border-green-200 hover:border-green-400 hover:shadow-green-100',
    btn: 'bg-green-600 hover:bg-green-700',
    icon: 'bg-green-50',
  },
  purple: {
    card: 'border-purple-200 hover:border-purple-400 hover:shadow-purple-100',
    btn: 'bg-purple-600 hover:bg-purple-700',
    icon: 'bg-purple-50',
  },
};

export default function FileDownloadCard({ examId, fileType, available }: FileCardProps) {
  const [loading, setLoading] = useState(false);
  const info = FILE_INFO[fileType];
  const colors = COLOR_CLASSES[info.color];

  const handleDownload = async () => {
    if (!available || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/download?examId=${examId}&type=${fileType}`);
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch {
      alert('다운로드 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`border-2 rounded-2xl p-6 transition-all shadow-sm ${
        available ? `${colors.card} hover:shadow-md cursor-pointer` : 'border-gray-100 opacity-40'
      }`}
      onClick={handleDownload}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`text-4xl p-3 rounded-xl ${colors.icon}`}>{info.icon}</div>
          <div>
            <div className="text-xl font-bold text-gray-800">{info.label}</div>
            <div className="text-sm text-gray-500">{available ? 'PDF 파일' : '준비 중'}</div>
          </div>
        </div>
        {available && (
          <button
            className={`${colors.btn} text-white px-6 py-3 rounded-xl font-bold text-base transition-colors`}
            disabled={loading}
          >
            {loading ? '⏳' : '다운로드'}
          </button>
        )}
      </div>
    </div>
  );
}
