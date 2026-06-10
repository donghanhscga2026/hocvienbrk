import { NextRequest, NextResponse } from 'next/server';
import { processBounceEmails } from '@/lib/email-campaign-runner';

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await processBounceEmails(3);

    return NextResponse.json({
      success: true,
      scanned: stats.scanned,
      hardBounced: stats.hardBounced,
      softBounced: stats.softBounced,
      fakeEmails: stats.fakeEmails,
      errors: stats.errors,
      senderDetails: stats.senderDetails?.map((s: any) => ({
        email: s.email,
        scanned: s.scanned,
        hardBounced: s.hardBounced,
        softBounced: s.softBounced,
        error: s.error
      }))
    });
  } catch (error: any) {
    console.error('[ScanBounces] Cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
