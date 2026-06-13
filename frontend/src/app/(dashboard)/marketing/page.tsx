'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Instagram, Facebook, Calendar, Target, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ContentCalendar } from '@/components/marketing/ContentCalendar';
import { CampaignCard } from '@/components/marketing/CampaignCard';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram size={12} />,
  FACEBOOK: <Facebook size={12} />,
  TIKTOK: <span className="text-[10px] font-bold">TK</span>,
  GOOGLE_BUSINESS: <span className="text-[10px] font-bold">G</span>,
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
};

export default function MarketingPage() {
  const [view, setView] = useState<'campaigns' | 'calendar' | 'posts'>('campaigns');
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

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/marketing/upload-batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
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
            {posts.map((post: any) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                      {PLATFORM_ICONS[post.platform]}
                    </div>
                    <span className="text-xs font-medium">{post.platform}</span>
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[post.status])}>{post.status}</span>
                </div>
                <p className="text-sm text-foreground line-clamp-3 mb-3">{post.caption}</p>
                {post.hashtags?.length > 0 && (
                  <p className="text-xs text-primary line-clamp-1">{post.hashtags.map((h: string) => `#${h}`).join(' ')}</p>
                )}
                {post.scheduledAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  {post.status === 'PENDING_APPROVAL' && (
                    <Button size="sm" className="flex-1 text-xs bg-primary hover:bg-primary/90"
                      onClick={() => api.put(`/marketing/posts/${post.id}/approve`).then(() => { qc.invalidateQueries({ queryKey: ['social-posts'] }); toast.success('Approved'); })}
                    >
                      Approve
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 text-xs">Edit</Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
