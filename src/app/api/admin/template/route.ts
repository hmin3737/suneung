import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const wb = XLSX.utils.book_new();

  // ── 시트 1: 일반 과목 등급컷 (국어/수학/탐구 등) ──
  const regularHeaders = [
    '학년(고1/고2/고3)', '학년도', '월', '과목',
    '1등급_하한', '1등급_상한',
    '2등급_하한', '2등급_상한',
    '3등급_하한', '3등급_상한',
    '4등급_하한', '4등급_상한',
    '5등급_하한', '5등급_상한',
    '6등급_하한', '6등급_상한',
    '7등급_하한', '7등급_상한',
    '8등급_하한', '8등급_상한',
    '9등급_하한', '9등급_상한',
    '표준점수_최고점',
  ];
  const regularExample = [
    '고3', 2026, 11, '국어',
    131, 134,
    124, 130,
    113, 123,
    100, 112,
    87, 99,
    73, 86,
    60, 72,
    50, 59,
    '', '',
    150,
  ];
  const regularNote = ['※ 단일값이면 하한만 입력 (상한 비워두기)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
  const ws1 = XLSX.utils.aoa_to_sheet([regularHeaders, regularExample, regularNote]);
  ws1['!cols'] = regularHeaders.map(() => ({ wch: 14 }));
  XLSX.utils.book_append_sheet(wb, ws1, '일반과목_등급컷');

  // ── 시트 2: 영어 등급컷 ──
  const engHeaders = [
    '학년(고1/고2/고3)', '학년도', '월',
    '1등급_누적비율(%)', '2등급_누적비율(%)', '3등급_누적비율(%)',
    '4등급_누적비율(%)', '5등급_누적비율(%)', '6등급_누적비율(%)',
    '7등급_누적비율(%)', '8등급_누적비율(%)', '9등급_누적비율(%)',
  ];
  const engExample = ['고3', 2026, 11, 4.35, 11.37, 23.56, 40.12, 60.34, 75.88, 89.01, 96.44, 100];
  const ws2 = XLSX.utils.aoa_to_sheet([engHeaders, engExample]);
  ws2['!cols'] = engHeaders.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws2, '영어_등급비율');

  // ── 시트 3: 파일 일괄 업로드 명명 규칙 안내 ──
  const guideData = [
    ['PDF 파일 일괄 업로드 명명 규칙'],
    [''],
    ['형식: {학년도}_{학년}_{월}월_{과목}_{종류}.pdf'],
    [''],
    ['예시:'],
    ['2026_고3_11월_국어_문제.pdf'],
    ['2026_고3_11월_국어_정답.pdf'],
    ['2026_고3_11월_국어_EBS해설.pdf'],
    ['2026_고3_6월_수학_문제.pdf'],
    ['2026_고1_3월_영어_문제.pdf'],
    [''],
    ['종류는 반드시: 문제 / 정답 / EBS해설'],
    ['여러 파일을 ZIP으로 압축해서 한 번에 업로드 가능'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(guideData);
  ws3['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws3, '파일명_규칙');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="suneung_template.xlsx"',
    },
  });
}
