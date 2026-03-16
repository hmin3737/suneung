import { MetadataRoute } from 'next';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://suneung.nemento.men';

export default function sitemap(): MetadataRoute.Sitemap {
  const exams = db
    .prepare('SELECT grade, year, month, subject FROM exams ORDER BY year DESC, month DESC')
    .all() as { grade: string; year: number; month: number; subject: string }[];

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...exams.map((e) => ({
      url: `${BASE_URL}/exam/${encodeURIComponent(e.grade)}/${e.year}/${e.month}/${encodeURIComponent(e.subject)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
