import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, setAdminCookie, clearAdminCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const ok = await verifyAdminPassword(password);
  if (!ok) {
    return NextResponse.json({ error: '비밀번호 오류' }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
