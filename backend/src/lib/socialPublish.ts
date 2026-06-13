import { prisma } from './prisma';

interface PublishInput {
  caption: string;
  hashtags?: string[];
  mediaUrls?: string[];
}
interface PublishResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

const buildText = (input: PublishInput) => {
  const tags = (input.hashtags ?? []).map(h => `#${h}`).join(' ');
  return tags ? `${input.caption}\n\n${tags}` : input.caption;
};

// Publishes a post to the connected social platform using stored API credentials.
// Returns a clear error if the platform is not connected or not yet supported.
export async function publishToSocial(platform: string, input: PublishInput): Promise<PublishResult> {
  const account = await prisma.socialAccount.findUnique({ where: { platform } });
  if (!account || !account.connected || !account.accessToken) {
    return { ok: false, error: `${platform} is not connected. Add your API token in Settings → Social Accounts.` };
  }

  const text = buildText(input);

  try {
    switch (platform) {
      case 'FACEBOOK': {
        // Facebook Page feed post via Graph API. Requires a Page access token + page id.
        if (!account.accountId) return { ok: false, error: 'Facebook needs a Page ID. Add it in Settings.' };
        const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(account.accountId)}/feed`;
        const body = new URLSearchParams({ message: text, access_token: account.accessToken });
        const r = await fetch(url, { method: 'POST', body });
        const data: any = await r.json();
        if (!r.ok) return { ok: false, error: data?.error?.message ?? 'Facebook API error' };
        return { ok: true, externalId: data.id };
      }
      case 'TWITTER': {
        // X/Twitter API v2 create tweet. Requires an OAuth2 user-context Bearer token with tweet.write.
        const r = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 280) }),
        });
        const data: any = await r.json();
        if (!r.ok) return { ok: false, error: data?.detail ?? data?.title ?? 'X/Twitter API error' };
        return { ok: true, externalId: data?.data?.id };
      }
      case 'INSTAGRAM':
      case 'TIKTOK':
      case 'GOOGLE_BUSINESS':
        // These require media-container / multi-step flows (and IG/TikTok require hosted media).
        return { ok: false, error: `${platform} auto-publishing isn't wired yet. Facebook and X/Twitter are supported.` };
      default:
        return { ok: false, error: `Unknown platform: ${platform}` };
    }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Failed to reach the social platform' };
  }
}
