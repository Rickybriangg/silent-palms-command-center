import { prisma } from './prisma';

interface EmailResult { ok: boolean; connected: boolean; id?: string; error?: string }

// Sends an email via the Resend API using stored credentials
// (platform 'EMAIL': handle = from address, accessToken = Resend API key).
export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const acct = await prisma.socialAccount.findUnique({ where: { platform: 'EMAIL' } });
  if (!acct || !acct.connected || !acct.accessToken || !acct.handle) {
    return { ok: false, connected: false, error: 'Email is not connected. Add your provider API key + from-address in Settings → Email & Reviews.' };
  }
  if (!to) return { ok: false, connected: true, error: 'Recipient has no email address.' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${acct.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: acct.handle, to, subject, html, ...(acct.profileUrl ? { reply_to: acct.profileUrl } : {}) }),
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, connected: true, error: data?.message ?? 'Email provider rejected the request' };
    return { ok: true, connected: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, connected: true, error: e?.message ?? 'Failed to reach email provider' };
  }
}

// Branded HTML wrapper for all outgoing emails.
export function emailShell(body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#0f766e;padding:20px 24px;color:#fff">
      <h1 style="margin:0;font-size:20px">Silent Palms Villa</h1>
      <p style="margin:4px 0 0;font-size:12px;opacity:.85">Diani Beach, Kenya</p>
    </div>
    <div style="padding:24px;color:#1f2937;font-size:14px;line-height:1.6">${body}</div>
    <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center">
      Silent Palms Villa · Diani Beach · Kenya<br>You're receiving this because you booked or enquired with us.
    </div>
  </div>`;
}

export const templates = {
  bookingConfirmation: (g: any, b: any) => emailShell(`
    <h2 style="color:#0f766e;margin-top:0">Your booking is confirmed! 🌴</h2>
    <p>Hi ${g.firstName}, we're delighted to confirm your stay at Silent Palms Villa.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#64748b">Reference</td><td style="text-align:right;font-weight:bold">${b.referenceNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Unit</td><td style="text-align:right">${b.unit?.name ?? ''}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Check-in</td><td style="text-align:right">${new Date(b.checkIn).toDateString()}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Check-out</td><td style="text-align:right">${new Date(b.checkOut).toDateString()}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Nights</td><td style="text-align:right">${b.nights}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#0f766e;font-weight:bold">Total</td><td style="text-align:right;border-top:1px solid #e2e8f0;color:#0f766e;font-weight:bold">${b.currency} ${b.totalAmount.toLocaleString()}</td></tr>
    </table>
    <p>We can't wait to welcome you. Karibu Diani! 🏝️</p>`),

  reviewRequest: (g: any, reviewUrl: string) => emailShell(`
    <h2 style="color:#0f766e;margin-top:0">How was your stay, ${g.firstName}? ⭐</h2>
    <p>Thank you for choosing Silent Palms Villa. We'd love to hear about your experience — it helps us and future guests.</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${reviewUrl}" style="background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Leave a Google Review</a>
    </p>
    <p style="color:#64748b;font-size:13px">It only takes a minute and means the world to us. Asante sana! 🙏</p>`),

  promotion: (g: any, subject: string, message: string) => emailShell(`
    <h2 style="color:#0f766e;margin-top:0">${subject}</h2>
    <p>Hi ${g.firstName},</p>
    <div>${message.replace(/\n/g, '<br>')}</div>
    <p style="margin-top:20px"><a href="https://silentpalms.com" style="color:#0f766e;font-weight:bold">Book your Diani escape →</a></p>`),
};
