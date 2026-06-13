'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Instagram, Facebook, X, Loader2, ImagePlus, Pencil } from 'lucide-react';
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

const NEXT_ACTION: Record<string, { label: string; status: string } | null> = {
  DRAFT: { label: 'Submit for Approval', status: 'PENDING_APPROVAL' },
  PENDING_APPROVAL: { label: 'Approve', status: 'APPROVED' },
  APPROVED: { label: 'Schedule', status: 'SCHEDULED' },
  SCHEDULED: { label: 'Publish Now', status: 'PUBLISHED' },
  PUBLISHED: null,
};

const MAX_IMG_BYTES = 1.5 * 1024 * 1024;
const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function MarketingPage() {
  const [view, setView] = useState<'campaigns' | 'calendar' | 'posts'>('campaigns');
  const [modal, setModal] = useState<'campaign' | 'post' | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
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

  const createCampaign = useMutation({
    mutationFn: (data: any) => api.post('/marketing/campaigns', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign created'); closeCampaign(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create campaign'),
  });
  const updateCampaign = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/marketing/campaigns/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign updated'); closeCampaign(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update campaign'),
  });
  const createPost = useMutation({
    mutationFn: (data: any) => api.post('/marketing/posts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-posts'] }); toast.success('Post created'); closePost(); setView('posts'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create post'),
  });
  const updatePost = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/marketing/posts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-posts'] }); toast.success('Post updated'); closePost(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update post'),
  });
  const advancePost = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/marketing/posts/${id}`, { status }),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['social-posts'] }); toast.success(v.status === 'PUBLISHED' ? 'Published to social media' : 'Post updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update post'),
  });

  const closePost = () => { setModal(null); setEditingPost(null); };
  const closeCampaign = () => { setModal(null); setEditingCampaign(null); };

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
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['campaigns', 'calendar', 'posts'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors', view === v ? 'bg-card shadow text-foreground' : 'text-muted-foreground')}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBatchUpload} />
              <Button variant="outline" size="sm" className="gap-2" asChild><span><Upload size={14} /> Batch Upload</span></Button>
            </label>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditingPost(null); setModal(view === 'campaigns' ? 'campaign' : 'post'); }}>
              <Plus size={14} /> {view === 'campaigns' ? 'New Campaign' : 'New Post'}
            </Button>
          </div>
        </div>

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
            {campaigns.map((c: any) => (
              <CampaignCard key={c.id} campaign={c}
                onEdit={(camp) => { setEditingCampaign(camp); setModal('campaign'); }}
                onViewPosts={() => setView('posts')}
              />
            ))}
            {campaigns.length === 0 && <div className="col-span-3 py-16 text-center text-muted-foreground text-sm">No campaigns yet. Create your first campaign.</div>}
          </div>
        )}

        {view === 'calendar' && <ContentCalendar />}

        {view === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post: any) => {
              const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
              const media = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
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
                  {media.length > 0 && (
                    <div className="flex gap-1 mb-2 overflow-x-auto">
                      {media.map((src: string, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="" className="h-20 w-20 object-cover rounded-md border border-border shrink-0" />
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-foreground line-clamp-3 mb-2">{post.caption}</p>
                  {tags.length > 0 && <p className="text-xs text-primary line-clamp-1">{tags.map((h: string) => `#${h}`).join(' ')}</p>}
                  {post.scheduledAt && <p className="text-xs text-muted-foreground mt-2">Scheduled: {new Date(post.scheduledAt).toLocaleString()}</p>}
                  <div className="flex gap-2 mt-3">
                    {next && (
                      <Button size="sm" className="flex-1 text-xs bg-primary hover:bg-primary/90" disabled={advancePost.isPending}
                        onClick={() => advancePost.mutate({ id: post.id, status: next.status })}>
                        {next.label}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditingPost(post); setModal('post'); }}>
                      <Pencil size={12} /> Edit
                    </Button>
                  </div>
                </motion.div>
              );
            })}
            {posts.length === 0 && <div className="col-span-3 py-16 text-center text-muted-foreground text-sm">No posts yet. Create your first post.</div>}
          </div>
        )}
      </div>

      {modal === 'campaign' && (
        <CampaignModal
          initial={editingCampaign}
          onClose={closeCampaign}
          loading={createCampaign.isPending || updateCampaign.isPending}
          onSubmit={(d) => editingCampaign ? updateCampaign.mutate({ id: editingCampaign.id, data: d }) : createCampaign.mutate(d)}
        />
      )}
      {modal === 'post' && (
        <PostModal
          initial={editingPost}
          onClose={closePost}
          loading={createPost.isPending || updatePost.isPending}
          onSubmit={(d) => editingPost ? updatePost.mutate({ id: editingPost.id, data: d }) : createPost.mutate(d)}
        />
      )}
    </div>
  );
}

// ---------- Modals ----------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function CampaignModal({ initial, onClose, onSubmit, loading }: { initial?: any | null; onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'SOCIAL',
    description: initial?.description ?? '',
    budget: initial?.budget != null ? String(initial.budget) : '',
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : '',
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '',
    status: initial?.status ?? 'ACTIVE',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={initial ? 'Edit Campaign' : 'New Campaign'} onClose={onClose}>
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
          {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} {initial ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </form>
    </Modal>
  );
}

function PostModal({ initial, onClose, onSubmit, loading }: { initial: any | null; onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    platform: initial?.platform ?? 'INSTAGRAM',
    caption: initial?.caption ?? '',
    hashtags: Array.isArray(initial?.hashtags) ? initial.hashtags.join(', ') : '',
    scheduledAt: initial?.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : '',
    status: initial?.status ?? 'DRAFT',
  });
  const [images, setImages] = useState<string[]>(Array.isArray(initial?.mediaUrls) ? initial.mediaUrls : []);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const next: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { toast.error('Only image files are allowed'); continue; }
      if (f.size > MAX_IMG_BYTES) { toast.error(`${f.name} is over 1.5MB`); continue; }
      next.push(await fileToDataUrl(f));
    }
    setImages(prev => [...prev, ...next].slice(0, 4));
  };

  return (
    <Modal title={initial ? 'Edit Post' : 'New Social Post'} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!form.caption) return toast.error('Caption is required');
          onSubmit({
            platform: form.platform,
            caption: form.caption,
            status: form.status,
            scheduledAt: form.scheduledAt || null,
            mediaUrls: images,
            hashtags: String(form.hashtags).split(',').map((h: string) => h.trim().replace(/^#/, '')).filter(Boolean),
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

        {/* Photos */}
        <div>
          <Label>Photos (max 4, ≤1.5MB each)</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {images.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-16 w-16 object-cover rounded-md border border-border" />
                <button type="button" onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center"><X size={10} /></button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="h-16 w-16 rounded-md border border-dashed border-border flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <ImagePlus size={18} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => addImages(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        <div><Label>Hashtags (comma-separated)</Label><Input value={form.hashtags} onChange={e => set('hashtags', e.target.value)} placeholder="DianiBeach, Kenya, BeachVilla" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Schedule</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
              {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} {initial ? 'Save Changes' : 'Create Post'}
        </Button>
      </form>
    </Modal>
  );
}
