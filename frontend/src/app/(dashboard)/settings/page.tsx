'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, User, Palmtree, Bell, Share2, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = [
  { key: 'FACEBOOK', label: 'Facebook', needsAccountId: true, accountIdLabel: 'Page ID', tokenHint: 'Page Access Token (Graph API)', supported: true },
  { key: 'TWITTER', label: 'X / Twitter', needsAccountId: false, tokenHint: 'OAuth2 Bearer token (tweet.write)', supported: true },
  { key: 'INSTAGRAM', label: 'Instagram', needsAccountId: true, accountIdLabel: 'IG Business ID', tokenHint: 'Graph API token', supported: false },
  { key: 'TIKTOK', label: 'TikTok', needsAccountId: false, tokenHint: 'Content Posting API token', supported: false },
  { key: 'GOOGLE_BUSINESS', label: 'Google Business', needsAccountId: true, accountIdLabel: 'Location ID', tokenHint: 'API token', supported: false },
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
