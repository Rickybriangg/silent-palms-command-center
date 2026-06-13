import { prisma } from './prisma';

interface WaResult { ok: boolean; externalId?: string; error?: string; connected: boolean }

// Sends a WhatsApp text message via the Meta WhatsApp Cloud API using stored
// credentials (platform 'WHATSAPP': accountId = Phone Number ID, accessToken = token).
// Returns connected:false when no credentials are configured so callers can still
// log the message locally and inform the user.
export async function sendWhatsApp(toPhone: string, body: string): Promise<WaResult> {
  const account = await prisma.socialAccount.findUnique({ where: { platform: 'WHATSAPP' } });
  if (!account || !account.connected || !account.accessToken || !account.accountId) {
    return { ok: false, connected: false, error: 'WhatsApp is not connected. Add your Cloud API token + Phone Number ID in Settings → Social Accounts.' };
  }

  const to = (toPhone || '').replace(/[^0-9]/g, ''); // E.164 digits, no '+'
  if (!to) return { ok: false, connected: true, error: 'Guest has no valid phone number.' };

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(account.accountId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
    });
    const data: any = await r.json();
    if (!r.ok) return { ok: false, connected: true, error: data?.error?.message ?? 'WhatsApp API error' };
    return { ok: true, connected: true, externalId: data?.messages?.[0]?.id };
  } catch (e: any) {
    return { ok: false, connected: true, error: e?.message ?? 'Failed to reach WhatsApp API' };
  }
}
