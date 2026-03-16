export const GRADES = ['고1', '고2', '고3'] as const;

export const EXAM_TYPES = {
  고1: ['교육청'],
  고2: ['교육청'],
  고3: ['교육청', '평가원', '수능'],
} as const;

export const MONTHS_BY_GRADE: Record<string, number[]> = {
  고1: [3, 4, 6, 9, 11],
  고2: [3, 4, 7, 10, 11],
  고3: [3, 4, 6, 7, 9, 10, 11],
};

export const SUBJECTS = [
  '국어',
  '수학',
  '영어',
  '한국사',
  '생활과윤리',
  '윤리와사상',
  '한국지리',
  '세계지리',
  '동아시아사',
  '세계사',
  '경제',
  '정치와법',
  '사회문화',
  '물리학1',
  '물리학2',
  '화학1',
  '화학2',
  '생명과학1',
  '생명과학2',
  '지구과학1',
  '지구과학2',
  '독일어',
  '프랑스어',
  '스페인어',
  '중국어',
  '일본어',
  '러시아어',
  '아랍어',
  '베트남어',
  '한문',
] as const;

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);
