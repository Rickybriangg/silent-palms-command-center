'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, User, Palmtree, Bell, Share2, CheckCircle2, Loader2, RefreshCw, Upload, Users, Globe, Mail, Star, Send } from 'lucide-react';
import { toast } from 'sonner';

const CHANNELS = [
  { key: 'CHANNEL_AIRBNB', label: 'Airbnb' },
  { key: 'CHANNEL_BOOKING', label: 'Booking.com' },
  { key: 'CHANNEL_EXPEDIA', label: 'Expedia' },
  { key: 'CHANNEL_VRBO', label: 'VRBO' },
];

const PLATFORMS = [
  { key: 'FACEBOOK', label: 'Facebook', needsAccountId: true, accountIdLabel: 'Page ID', tokenHint: 'Page Access Token (Graph API)', supported: true },
  { key: 'TWITTER', label: 'X / Twitter', needsAccountId: false, tokenHint: 'OAuth2 Bearer token (tweet.write)', supported: true },
  { key: 'INSTAGRAM', label: 'Instagram', needsAccountId: true, accountIdLabel: 'IG Business ID', tokenHint: 'Graph API token', supported: false },
  { key: 'TIKTOK', label: 'TikTok', needsAccountId: false, tokenHint: 'Content Posting API token', supported: false },
  { key: 'GOOGLE_BUSINESS', label: 'Google Business', needsAccountId: true, accountIdLabel: 'Location ID', tokenHint: 'API token', supported: false },
  { key: 'WHATSAPP', label: 'WhatsApp Business', needsAccountId: true, accountIdLabel: 'Phone Number ID', tokenHint: 'Cloud API access token', supported: true },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: me } = useQuery({ queryKey: ['me-settings'], queryFn: () => api.get('/auth/me').then(r => r.data) });
  const profile = me ?? user;

  return (
    <div>
      <Header title="Settings" subtitle="Account, property & integrations" />
      <div className="p-6 space-y-6 max-w-3xl">
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4"><User size={16} className="text-primary" /><h3 className="font-semibold">My Profile</h3></div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground mb-1">Name</p><p className="font-medium">{profile?.firstName} {profile?.lastName}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Email</p><p className="font-medium">{profile?.email}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Role</p><p className="font-medium">{(profile?.role?.name ?? profile?.role)?.toString().replace(/_/g, ' ')}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Status</p><p className="font-medium text-emerald-600">Active</p></div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4"><Palmtree size={16} className="text-primary" /><h3 className="font-semibold">Property</h3></div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground mb-1">Name</p><p className="font-medium">Silent Palms Villa</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Location</p><p className="font-medium flex items-center gap-1"><MapPin size={12} /> Diani Beach, Kenya</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Units</p><p className="font-medium">Whole Villa, 2-Bedroom Unit</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Currency</p><p className="font-medium">USD ($)</p></div>
          </div>
        </section>

        <BookingChannels />

        <WebsiteIntegration />

        <EmailReviews />

        <ImportContacts />

        <SocialAccounts />

        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4"><Bell size={16} className="text-primary" /><h3 className="font-semibold">Notifications</h3></div>
          <div className="space-y-3 text-sm">
            {['New booking alerts', 'WhatsApp lead notifications', 'Daily revenue summary', 'Task reminders'].map(label => (
              <label key={label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary"><span className="inline-block h-4 w-4 translate-x-4 rounded-full bg-white" /></span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">Preference toggles are display-only in this build.</p>
        </section>
      </div>
    </div>
  );
}

function BookingChannels() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['social-accounts'], queryFn: () => api.get('/marketing/social-accounts').then(r => r.data) });
  const [urls, setUrls] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: ({ key, url }: { key: string; url: string }) =>
      api.put(`/marketing/social-accounts/${key}`, { profileUrl: url, connected: !!url }),
    onSuccess: () => { toast.success('Channel saved'); qc.invalidateQueries({ queryKey: ['social-accounts'] }); },
    onError: () => toast.error('Save failed'),
  });
  const sync = useMutation({
    mutationFn: () => api.post('/bookings/sync-ical'),
    onSuccess: (r) => toast.success(r.data?.message ?? 'Synced'),
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Sync failed'),
  });

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><RefreshCw size={16} className="text-primary" /><h3 className="font-semibold">Booking Channels</h3></div>
        <Button size="sm" variant="outline" className="text-xs gap-1" disabled={sync.isPending} onClick={() => sync.mutate()}>
          {sync.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync Now
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Paste each platform's iCal export URL to pull in reservations. Then click Sync Now (or it can be scheduled).</p>
      <div className="space-y-3">
        {CHANNELS.map(c => {
          const acct = accounts.find((a: any) => a.platform === c.key);
          const val = urls[c.key] ?? acct?.profileUrl ?? '';
          return (
            <div key={c.key} className="flex items-center gap-2">
              <span className="text-sm font-medium w-28 shrink-0">{c.label}{acct?.connected && <CheckCircle2 size={12} className="inline ml-1 text-emerald-500" />}</span>
              <Input className="h-8 text-sm flex-1" value={val} placeholder="https://…/calendar.ics" onChange={e => setUrls(u => ({ ...u, [c.key]: e.target.value }))} />
              <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" disabled={save.isPending} onClick={() => save.mutate({ key: c.key, url: val })}>Save</Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EmailReviews() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['social-accounts'], queryFn: () => api.get('/marketing/social-accounts').then(r => r.data) });
  const email = accounts.find((a: any) => a.platform === 'EMAIL');
  const gb = accounts.find((a: any) => a.platform === 'GOOGLE_BUSINESS');

  const [from, setFrom] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [testTo, setTestTo] = useState('');
  const [promo, setPromo] = useState({ subject: '', message: '', segment: 'all' });
  useEffect(() => { if (email) setFrom(email.handle ?? ''); }, [email]);
  useEffect(() => { if (gb) setReviewUrl(gb.profileUrl ?? ''); }, [gb]);

  const saveEmail = useMutation({
    mutationFn: () => api.put('/marketing/social-accounts/EMAIL', { handle: from, accessToken: apiKey, connected: true }),
    onSuccess: () => { toast.success('Email provider saved'); setApiKey(''); qc.invalidateQueries({ queryKey: ['social-accounts'] }); },
    onError: () => toast.error('Save failed'),
  });
  const saveReview = useMutation({
    mutationFn: () => api.put('/marketing/social-accounts/GOOGLE_BUSINESS', { profileUrl: reviewUrl, connected: !!reviewUrl }),
    onSuccess: () => { toast.success('Google review link saved'); qc.invalidateQueries({ queryKey: ['social-accounts'] }); },
    onError: () => toast.error('Save failed'),
  });
  const test = useMutation({
    mutationFn: () => api.post('/marketing/email/test', { to: testTo }),
    onSuccess: (r) => r.data?.delivered ? toast.success('Test email sent!') : toast.error(r.data?.error ?? 'Failed'),
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });
  const blast = useMutation({
    mutationFn: () => api.post('/marketing/email/blast', promo),
    onSuccess: (r) => { toast.success(r.data?.message ?? 'Sent'); setPromo({ subject: '', message: '', segment: 'all' }); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1"><Mail size={16} className="text-primary" /><h3 className="font-semibold">Email &amp; Reviews</h3></div>
      <p className="text-xs text-muted-foreground mb-4">Send branded booking confirmations, promotions and review requests by email. Reviews link straight to your Google Business Profile.</p>

      <div className="space-y-5">
        {/* Email provider */}
        <div className="space-y-2">
          <label className="text-xs font-medium flex items-center gap-1">Email Provider {email?.connected && <CheckCircle2 size={12} className="text-emerald-500" />}</label>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">From address</Label><Input className="h-8 text-sm" value={from} onChange={e => setFrom(e.target.value)} placeholder="bookings@silentpalms.com" /></div>
            <div><Label className="text-xs">Resend API key</Label><Input className="h-8 text-sm" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={email?.hasToken ? '•••• saved' : 're_xxxxxxxx'} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" disabled={saveEmail.isPending} onClick={() => saveEmail.mutate()}>Save Provider</Button>
            <div className="flex gap-1 flex-1">
              <Input className="h-8 text-xs" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@email.com" />
              <Button size="sm" variant="outline" className="text-xs gap-1" disabled={test.isPending || !testTo} onClick={() => test.mutate()}><Send size={12} /> Test</Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Create a free key at resend.com, verify your domain, then paste the key + a from-address on that domain.</p>
        </div>

        {/* Google review link */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium flex items-center gap-1"><Star size={12} className="text-amber-500" /> Google Review Link {gb?.connected && <CheckCircle2 size={12} className="text-emerald-500" />}</label>
          <div className="flex gap-2">
            <Input className="h-8 text-sm flex-1" value={reviewUrl} onChange={e => setReviewUrl(e.target.value)} placeholder="https://g.page/r/…/review" />
            <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" disabled={saveReview.isPending} onClick={() => saveReview.mutate()}>Save</Button>
          </div>
          <p className="text-[10px] text-muted-foreground">From Google Business Profile → Ask for reviews → copy your short review link. Review requests (Bookings → Request Review) will point guests here.</p>
        </div>

        {/* Promotional blast */}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <label className="text-xs font-medium">Send a Promotion</label>
          <Input className="h-8 text-sm" value={promo.subject} onChange={e => setPromo(p => ({ ...p, subject: e.target.value }))} placeholder="Subject — e.g. 20% off June stays 🌴" />
          <textarea className="w-full rounded-md border border-input bg-background p-2 text-sm" rows={3} value={promo.message} onChange={e => setPromo(p => ({ ...p, message: e.target.value }))} placeholder="Your promotional message…" />
          <div className="flex gap-2 items-center">
            <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={promo.segment} onChange={e => setPromo(p => ({ ...p, segment: e.target.value }))}>
              <option value="all">All contacts</option>
              <option value="leads">Leads only</option>
              <option value="vip">VIP guests</option>
            </select>
            <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 gap-1" disabled={blast.isPending || !promo.subject || !promo.message} onClick={() => blast.mutate()}>
              {blast.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Promotion
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function WebsiteIntegration() {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  const icalUrl = `${apiBase}/public/calendar.ics`;
  const copy = (text: string, what = 'Copied to clipboard') => { navigator.clipboard.writeText(text).then(() => toast.success(what)); };

  const inquirySnippet = `<!-- Silent Palms inquiry form -->
<form onsubmit="event.preventDefault();fetch('${apiBase}/public/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(this)))}).then(r=>r.json()).then(d=>{alert(d.message||'Thank you!');this.reset();});">
  <input name="name" placeholder="Your name" required />
  <input name="phone" placeholder="Phone / WhatsApp" required />
  <input name="email" type="email" placeholder="Email" />
  <input name="checkIn" type="date" /><input name="checkOut" type="date" />
  <textarea name="message" placeholder="Your message"></textarea>
  <button type="submit">Send Inquiry</button>
</form>`;

  const bookingSnippet = `<!-- Silent Palms LIVE booking widget — paste into your website -->
<div id="sp-booking"></div>
<script>
(function(){var API='${apiBase}';var el=document.getElementById('sp-booking');
fetch(API+'/public/units').then(r=>r.json()).then(function(units){
  el.innerHTML='<form id="spf">'+
   '<select name="unitId">'+units.map(function(u){return '<option value="'+u.id+'">'+u.name+' — $'+u.basePrice+'/night</option>'}).join('')+'</select>'+
   '<input name="checkIn" type="date" required><input name="checkOut" type="date" required>'+
   '<input name="adults" type="number" value="2" min="1" placeholder="Guests">'+
   '<input name="firstName" placeholder="First name" required><input name="lastName" placeholder="Last name">'+
   '<input name="phone" placeholder="Phone / WhatsApp" required><input name="email" type="email" placeholder="Email">'+
   '<button type="submit">Book Now</button><p id="spmsg"></p></form>';
  document.getElementById('spf').onsubmit=function(e){e.preventDefault();
    var d=Object.fromEntries(new FormData(this));
    fetch(API+'/public/booking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
     .then(r=>r.json()).then(function(res){document.getElementById('spmsg').textContent=res.message+(res.reference?(' Ref: '+res.reference):'');});
  };
});
})();
</script>`;

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1"><Globe size={16} className="text-primary" /><h3 className="font-semibold">Website Integration — SilentPalms.com</h3></div>
      <p className="text-xs text-muted-foreground mb-4">
        Two-way sync with your website: bookings & inquiries flow into the CRM automatically, and your live calendar can be shared with external platforms.
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium">1 · Live Booking Widget (checks availability, creates bookings)</label>
          <textarea readOnly value={bookingSnippet} rows={6} className="w-full mt-1 rounded-md border border-input bg-background p-2 text-[10px] font-mono" />
          <Button size="sm" variant="outline" className="text-xs mt-1" onClick={() => copy(bookingSnippet, 'Booking widget copied')}>Copy Booking Widget</Button>
        </div>
        <div>
          <label className="text-xs font-medium">2 · Inquiry Form (captures leads)</label>
          <textarea readOnly value={inquirySnippet} rows={4} className="w-full mt-1 rounded-md border border-input bg-background p-2 text-[10px] font-mono" />
          <Button size="sm" variant="outline" className="text-xs mt-1" onClick={() => copy(inquirySnippet, 'Inquiry form copied')}>Copy Inquiry Form</Button>
        </div>
        <div>
          <label className="text-xs font-medium">3 · Calendar Feed (iCal) — subscribe from Google / Airbnb / Booking.com</label>
          <div className="flex gap-2 mt-1">
            <Input className="h-8 text-xs font-mono" readOnly value={icalUrl} />
            <Button size="sm" variant="outline" className="text-xs" onClick={() => copy(icalUrl, 'Calendar URL copied')}>Copy</Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Paste the widget/form into a Custom HTML block on SilentPalms.com. Bookings appear under Bookings (high-value/group ones go to <strong>Awaiting Approval</strong>); inquiries appear under WhatsApp CRM. Add channel iCal URLs below to pull external reservations in.
        </p>
      </div>
    </section>
  );
}

function ImportContacts() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api.post('/guests/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(r.data?.message ?? 'Imported');
      qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Import failed');
    } finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1"><Users size={16} className="text-primary" /><h3 className="font-semibold">Import Marketing Contacts</h3></div>
      <p className="text-xs text-muted-foreground mb-4">Upload an Excel/CSV of clients (columns: firstName, lastName, phone, email). They're added as guests/leads for marketing & WhatsApp.</p>
      <label className="cursor-pointer inline-flex">
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" disabled={busy} asChild>
          <span>{busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload Contacts File</span>
        </Button>
      </label>
    </section>
  );
}

function SocialAccounts() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['social-accounts'], queryFn: () => api.get('/marketing/social-accounts').then(r => r.data) });

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1"><Share2 size={16} className="text-primary" /><h3 className="font-semibold">Social Accounts</h3></div>
      <p className="text-xs text-muted-foreground mb-4">
        Connect each platform so published posts go live automatically. Facebook & X/Twitter support auto-posting today;
        Instagram, TikTok & Google Business will store your details for now.
      </p>
      <div className="space-y-4">
        {PLATFORMS.map(p => {
          const acct = accounts.find((a: any) => a.platform === p.key);
          return <SocialRow key={p.key} platform={p} account={acct} onSaved={() => qc.invalidateQueries({ queryKey: ['social-accounts'] })} />;
        })}
      </div>
    </section>
  );
}

function SocialRow({ platform, account, onSaved }: { platform: any; account: any; onSaved: () => void }) {
  const [form, setForm] = useState({ profileUrl: '', handle: '', accountId: '', accessToken: '', connected: false });
  useEffect(() => {
    if (account) setForm({ profileUrl: account.profileUrl ?? '', handle: account.handle ?? '', accountId: account.accountId ?? '', accessToken: '', connected: account.connected ?? false });
  }, [account]);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => api.put(`/marketing/social-accounts/${platform.key}`, form),
    onSuccess: () => { toast.success(`${platform.label} saved`); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Save failed'),
  });

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{platform.label}</span>
          {account?.connected && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 size={11} /> Connected</span>}
          {!platform.supported && <span className="text-[10px] text-amber-600">store-only</span>}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={form.connected} onChange={e => set('connected', e.target.checked)} /> Active
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><Label className="text-xs">Profile / Page URL</Label><Input className="h-8 text-sm" value={form.profileUrl} onChange={e => set('profileUrl', e.target.value)} placeholder={`https://${platform.label.toLowerCase()}.com/silentpalms`} /></div>
        <div><Label className="text-xs">Handle</Label><Input className="h-8 text-sm" value={form.handle} onChange={e => set('handle', e.target.value)} placeholder="@silentpalms" /></div>
        {platform.needsAccountId && <div><Label className="text-xs">{platform.accountIdLabel}</Label><Input className="h-8 text-sm" value={form.accountId} onChange={e => set('accountId', e.target.value)} /></div>}
        <div className="col-span-2">
          <Label className="text-xs">{platform.tokenHint}</Label>
          <Input className="h-8 text-sm" type="password" value={form.accessToken} onChange={e => set('accessToken', e.target.value)}
            placeholder={account?.hasToken ? '•••••••• (saved — leave blank to keep)' : 'Paste API token'} />
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null} Save
        </Button>
      </div>
    </div>
  );
}
