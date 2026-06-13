'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Instagram, Facebook, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ContentCalendar } from '@/components/marketing/ContentCalendar';
import { CampaignCard } from '@/components/marketing/CampaignCard';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram size={12} />,
  FACEBOOK: <Facebook size={12} />,
  TIKTOK: <span className="text-[10px] font-bold">TK</span>,
  TWITTER: <span className="text-[10px] font-bold">X</span>,
  GOOGLE_BUSINESS: <span className="text-[10px] font-bold">G</span>,
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
};

// The next workflow action available for a post in a given status
const NEXT_ACTION: Record<string, { label: string; status: string } | null> = {
  DRAFT: { label: 'Submit for Approval', status: 'PENDING_APPROVAL' },
  PENDING_APPROVAL: { label: 'Approve', status: 'APPROVED' },
  APPROVED: { label: 'Schedule', status: 'SCHEDULED' },
  SCHEDULED: { label: 'Publish Now', status: 'PUBLISHED' },
  PUBLISHED: null,
};

export default function MarketingPage() {
  const [view, setView] = useState<'campaigns' | 'calendar' | 'posts'>('campaigns');
  const [modal, setModal] = useState<'campaign' | 'post' | null>(null);
  const qc = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/marketing/campaigns').then(r => r.data),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => api.get('/marketing/posts').then(r => r.data),
    enabled: view === 'posts',
  });

  // --- Mutations ---
  const createCampaign = useMutation({
    mutationFn: (data: any) => api.post('/marketing/campaigns', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign created'); setModal(null); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create campaign'),
  });
  const createPost = useMutation({
    mutationFn: (data: any) => api.post('/marketing/posts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-posts'] }); toast.success('Post created'); setModal(null); setView('posts'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create post'),
  });
  const advancePost = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/marketing/posts/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-posts'] }); toast.success('Post updated'); },
    onError: () => toast.error('Failed to update post'),
  });

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/marketing/upload-batch', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${res.data.message}`);
      qc.invalidateQueries({ queryKey: ['social-posts'] });
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div>
      <Header title="Marketing Automation" subtitle="Content calendar, campaigns & social scheduling" />

      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['campaigns', 'calendar', 'posts'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors', view === v ? 'bg-card shadow text-foreground' : 'text-muted-foreground')}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBatchUpload} />
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span><Upload size={14} /> Batch Upload</span>
              </Button>
            </label>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setModal(view === 'campaigns' ? 'campaign' : 'post')}>
              <Plus size={14} /> {view === 'campaigns' ? 'New Campaign' : 'New Post'}
            </Button>
          </div>
        </div>

        {/* Workflow Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-teal-500/10 border border-primary/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-primary mb-2">Content Workflow</h4>
          <div className="flex items-center gap-2 flex-wrap">
            {['Upload Content', 'AI Enhancement', 'Approval', 'Scheduling', 'Publishing', 'Analytics'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="text-xs bg-card border border-border px-3 py-1 rounded-full text-foreground">{step}</span>
                {i < arr.length - 1 && <span className="text-primary text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>

        {view === 'campaigns' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c: any) => <CampaignCard key={c.id} campaign={c} />)}
            {campaigns.length === 0 && (
              <div className="col-span-3 py-16 text-center text-muted-foreground text-sm">No campaigns yet. Create your first campaign.</div>
            )}
          </div>
        )}

        {view === 'calendar' && <ContentCalendar />}

        {view === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post: any) => {
              const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
              const next = NEXT_ACTION[post.status];
              return (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                        {PLATFORM_ICONS[post.platform] ?? <span className="text-[10px] font-bold">{post.platform?.[0]}</span>}
                      </div>
                      <span className="text-xs font-medium">{post.platform}</span>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[post.status] ?? 'bg-muted')}>{post.status}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3 mb-3">{post.caption}</p>
                  {tags.length > 0 && (
                    <p className="text-xs text-primary line-clamp-1">{tags.map((h: string) => `#${h}`).join(' ')}</p>
                  )}
                  {post.scheduledAt && (
                    <p className="text-xs text-muted-foreground mt-2">Scheduled: {new Date(post.scheduledAt).toLocaleString()}</p>
                  )}
                  {next && (
                    <Button
                      size="sm"
                      className="w-full text-xs mt-3 bg-primary hover:bg-primary/90"
                      disabled={advancePost.isPending}
                      onClick={() => advancePost.mutate({ id: post.id, status: next.status })}
                    >
                      {next.label}
                    </Button>
                  )}
                </motion.div>
              );
            })}
            {posts.length === 0 && (
              <div className="col-span-3 py-16 text-center text-muted-foreground text-sm">No posts yet. Create your first post.</div>
            )}
          </div>
        )}
      </div>

      {modal === 'campaign' && (
        <CampaignModal onClose={() => setModal(null)} onSubmit={(d) => createCampaign.mutate(d)} loading={createCampaign.isPending} />
      )}
      {modal === 'post' && (
        <PostModal onClose={() => setModal(null)} onSubmit={(d) => createPost.mutate(d)} loading={createPost.isPending} />
      )}
    </div>
  );
}

// ---------- Modals ----------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function CampaignModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', type: 'SOCIAL', description: '', budget: '', startDate: '', endDate: '', status: 'ACTIVE' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="New Campaign" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!form.name) return toast.error('Name is required'); onSubmit(form); }} className="space-y-3">
        <div><Label>Name</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Diani Beach Summer Escape" required /></div>
        <div>
          <Label>Type</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={e => set('type', e.target.value)}>
            {['SOCIAL', 'EMAIL', 'WHATSAPP', 'PAID_ADS', 'SEO'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Campaign goals & notes" rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Budget ($)</Label><Input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="1500" /></div>
          <div>
            <Label>Status</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
              {['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start</Label><Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
          <div><Label>End</Label><Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Create Campaign
        </Button>
      </form>
    </Modal>
  );
}

function PostModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ platform: 'INSTAGRAM', caption: '', hashtags: '', scheduledAt: '', status: 'DRAFT' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="New Social Post" onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!form.caption) return toast.error('Caption is required');
          onSubmit({
            platform: form.platform,
            caption: form.caption,
            status: form.status,
            scheduledAt: form.scheduledAt || null,
            hashtags: form.hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
          });
        }}
        className="space-y-3"
      >
        <div>
          <Label>Platform</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.platform} onChange={e => set('platform', e.target.value)}>
            {['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER', 'GOOGLE_BUSINESS'].map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div><Label>Caption</Label><Textarea value={form.caption} onChange={e => set('caption', e.target.value)} placeholder="🌴 Wake up to the Indian Ocean..." rows={3} required /></div>
        <div><Label>Hashtags (comma-separated)</Label><Input value={form.hashtags} onChange={e => set('hashtags', e.target.value)} placeholder="DianiBeach, Kenya, BeachVilla" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Schedule</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
              {['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Create Post
        </Button>
      </form>
    </Modal>
  );
}
