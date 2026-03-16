import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

function toCSV(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'regular';

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  if (type === 'percent') {
    const rows = [
      ['학년(고1/고2/고3)', '학년도', '월', '과목',
        '1등급_누적비율(%)', '2등급_누적비율(%)', '3등급_누적비율(%)',
        '4등급_누적비율(%)', '5등급_누적비율(%)', '6등급_누적비율(%)',
        '7등급_누적비율(%)', '8등급_누적비율(%)', '9등급_누적비율(%)'],
      ['고3', 2026, 11, '영어', 4.35, 11.37, 23.56, 40.12, 60.34, 75.88, 89.01, 96.44, 100],
      ['고3', 2026, 11, '일본어Ⅰ', 5.12, 13.44, 27.81, 45.33, 63.21, 78.55, 91.02, 97.34, 100],
    ];
    return new NextResponse('\uFEFF' + toCSV(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="suneung_절대평가_template.csv"',
      },
    });
  }

  // 일반 과목
  const rows = [
    ['학년(고1/고2/고3)', '학년도', '월', '과목',
      '1등급_하한', '1등급_상한', '2등급_하한', '2등급_상한',
      '3등급_하한', '3등급_상한', '4등급_하한', '4등급_상한',
      '5등급_하한', '5등급_상한', '6등급_하한', '6등급_상한',
      '7등급_하한', '7등급_상한', '8등급_하한', '8등급_상한',
      '9등급_하한', '9등급_상한', '표준점수_최고점'],
    ['고3', 2026, 11, '국어',
      131, 134, 124, 130, 113, 123, 100, 112,
      87, 99, 73, 86, 60, 72, 50, 59, '', '', 150],
    ['※단일값은 하한만 입력, 범위면 하한+상한 모두 입력', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  return new NextResponse('\uFEFF' + toCSV(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="suneung_일반과목_template.csv"',
    },
  });
}
