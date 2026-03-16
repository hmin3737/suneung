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
    grade_1 INTEGER,
    grade_2 INTEGER,
    grade_3 INTEGER,
    grade_4 INTEGER,
    grade_5 INTEGER,
    grade_6 INTEGER,
    grade_7 INTEGER,
    grade_8 INTEGER,
    grade_9 INTEGER
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
