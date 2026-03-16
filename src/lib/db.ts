import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'suneung.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    exam_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    problem_s3_key TEXT,
    answer_s3_key TEXT,
    ebs_s3_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS grade_cutoffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

    -- 국어/수학/탐구 등: 범위 (max = null 이면 단일값)
    grade_1_min INTEGER, grade_1_max INTEGER,
    grade_2_min INTEGER, grade_2_max INTEGER,
    grade_3_min INTEGER, grade_3_max INTEGER,
    grade_4_min INTEGER, grade_4_max INTEGER,
    grade_5_min INTEGER, grade_5_max INTEGER,
    grade_6_min INTEGER, grade_6_max INTEGER,
    grade_7_min INTEGER, grade_7_max INTEGER,
    grade_8_min INTEGER, grade_8_max INTEGER,
    grade_9_min INTEGER, grade_9_max INTEGER,

    -- 영어 절대평가: 누적비율 (%)
    eng_pct_1 REAL, eng_pct_2 REAL, eng_pct_3 REAL,
    eng_pct_4 REAL, eng_pct_5 REAL, eng_pct_6 REAL,
    eng_pct_7 REAL, eng_pct_8 REAL, eng_pct_9 REAL,

    -- 표준점수 최고점
    max_standard_score INTEGER
  );
`);

export default db;

export type Exam = {
  id: number;
  grade: string;
  year: number;
  month: number;
  exam_type: string;
  subject: string;
  problem_s3_key: string | null;
  answer_s3_key: string | null;
  ebs_s3_key: string | null;
};

export type GradeCutoff = {
  id: number;
  exam_id: number;
  grade_1_min: number | null; grade_1_max: number | null;
  grade_2_min: number | null; grade_2_max: number | null;
  grade_3_min: number | null; grade_3_max: number | null;
  grade_4_min: number | null; grade_4_max: number | null;
  grade_5_min: number | null; grade_5_max: number | null;
  grade_6_min: number | null; grade_6_max: number | null;
  grade_7_min: number | null; grade_7_max: number | null;
  grade_8_min: number | null; grade_8_max: number | null;
  grade_9_min: number | null; grade_9_max: number | null;
  eng_pct_1: number | null; eng_pct_2: number | null; eng_pct_3: number | null;
  eng_pct_4: number | null; eng_pct_5: number | null; eng_pct_6: number | null;
  eng_pct_7: number | null; eng_pct_8: number | null; eng_pct_9: number | null;
  max_standard_score: number | null;
};
