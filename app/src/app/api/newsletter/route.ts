// Newsletter signup — stub v1 (no email backend connected yet).
// Accepts an email POST, logs it, returns success. In production this should
// integrate with Resend / Mailchimp / a custom subscriber table.

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  let email: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { email?: string };
      email = body.email;
    } else {
      const form = await request.formData();
      const raw = form.get('email');
      if (typeof raw === 'string') email = raw;
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', message: 'Email manquant ou format invalide.' },
      { status: 400 },
    );
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_EMAIL', message: 'Adresse email invalide.' },
      { status: 400 },
    );
  }

  console.log(`[argos] newsletter signup: ${email}`);

  // For form submissions, redirect back to /sign-in with a success flag.
  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL('/sign-in?subscribed=1', request.url), {
      status: 303,
    });
  }
  return NextResponse.json({ ok: true, message: 'Inscription enregistrée.' }, { status: 201 });
}
