const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Tractor <noreply@yourdomain.com>';

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email] Verification code for ${to}: ${code}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: 'Your Tractor login code',
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Resend API error ${res.status}: ${body}`);
  }
}
