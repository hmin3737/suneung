export const GRADES = ['고1', '고2', '고3'] as const;

export function getExamType(grade: string, month: number): string {
  if (grade === '고3') {
    if (month === 11) return '수능';
    if (month === 6 || month === 9) return '평가원';
  }
  return '교육청';
}

export const MONTHS_BY_GRADE: Record<string, number[]> = {
  고1: [3, 4, 6, 9, 11],
  고2: [3, 4, 7, 10, 11],
  고3: [3, 4, 6, 7, 9, 10, 11],
};

export const MAIN_SUBJECTS = ['국어', '수학', '영어', '한국사', '사회', '과학', '제2외국어/한문'] as const;
export type MainSubject = (typeof MAIN_SUBJECTS)[number];

export const SUB_SUBJECTS: Partial<Record<MainSubject, string[]>> = {
  사회: ['생활과윤리', '윤리와사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와법', '사회문화'],
  과학: ['물리학Ⅰ', '물리학Ⅱ', '화학Ⅰ', '화학Ⅱ', '생명과학Ⅰ', '생명과학Ⅱ', '지구과학Ⅰ', '지구과학Ⅱ'],
  '제2외국어/한문': ['독일어Ⅰ', '프랑스어Ⅰ', '스페인어Ⅰ', '중국어Ⅰ', '일본어Ⅰ', '러시아어Ⅰ', '아랍어Ⅰ', '베트남어Ⅰ', '한문Ⅰ'],
};

// DB에 저장되는 실제 과목명 반환
export function resolveSubject(main: string, sub: string): string {
  return SUB_SUBJECTS[main as MainSubject] ? sub : main;
}

// 누적비율(%)로 표시하는 절대평가 과목
const FOREIGN_LANG_SUBJECTS = SUB_SUBJECTS['제2외국어/한문'] ?? [];
export function isPercentSubject(subject: string): boolean {
  return subject === '영어' || (FOREIGN_LANG_SUBJECTS as string[]).includes(subject);
}

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);
