// Newsletter signup — stub v1 (no email backend connected yet).
// Accepts an email POST, logs it, returns success. In production this should
// integrate with Resend / Mailchimp / a custom subscriber table.

import { NextResponse, type NextRequest } from 'next/server';

/** Browser form posts come back to the page with a readable refusal; JSON clients keep the JSON error. */
function refuse(request: NextRequest, isJson: boolean, error: 'INVALID_BODY' | 'INVALID_EMAIL', message: string) {
  if (!isJson) {
    const page = new URL('/sign-in', request.url);
    page.searchParams.set('error', error === 'INVALID_EMAIL' ? 'invalid-email' : 'invalid-body');
    return NextResponse.redirect(page, { status: 303 });
  }
  return NextResponse.json({ ok: false, error, message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  let email: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  try {
    if (isJson) {
      const body = (await request.json()) as { email?: string };
      email = body.email;
    } else {
      const form = await request.formData();
      const raw = form.get('email');
      if (typeof raw === 'string') email = raw;
    }
  } catch {
    return refuse(request, isJson, 'INVALID_BODY', 'Email manquant ou format invalide.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return refuse(request, isJson, 'INVALID_EMAIL', 'Adresse email invalide.');
  }

  console.log(`[argos] newsletter signup: ${email}`);

  // For form submissions, redirect back to /sign-in with a success flag.
  if (!isJson) {
    return NextResponse.redirect(new URL('/sign-in?subscribed=1', request.url), {
      status: 303,
    });
  }
  return NextResponse.json({ ok: true, message: 'Inscription enregistrée.' }, { status: 201 });
}
