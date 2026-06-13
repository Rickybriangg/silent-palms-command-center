'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Calendar, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const TYPE_COLOR: Record<string, string> = {
  SOCIAL_MEDIA: 'text-pink-600',
  EMAIL: 'text-blue-600',
  WHATSAPP: 'text-emerald-600',
  PAID_ADS: 'text-purple-600',
  SEO: 'text-amber-600',
};

export function CampaignCard({ campaign, onEdit, onViewPosts }: { campaign: any; onEdit?: (c: any) => void; onViewPosts?: (c: any) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{campaign.name}</h4>
          <span className={cn('text-xs font-medium', TYPE_COLOR[campaign.type])}>{campaign.type?.replace('_', ' ')}</span>
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_COLOR[campaign.status])}>{campaign.status}</span>
      </div>

      {campaign.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{campaign.description}</p>
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-xs font-bold text-foreground">{campaign._count?.socialPosts ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Posts</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-xs font-bold text-foreground">{campaign.budget ? `$${campaign.budget}` : '—'}</p>
          <p className="text-[10px] text-muted-foreground">Budget</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-xs font-bold text-foreground">{campaign.metrics?.roi ?? '—'}</p>
          <p className="text-[10px] text-muted-foreground">ROI</p>
        </div>
      </div>

      {(campaign.startDate || campaign.endDate) && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
          <Calendar size={10} />
          <span>{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : '—'}</span>
          <span>→</span>
          <span>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing'}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onEdit?.(campaign)}>Edit</Button>
        <Button size="sm" className="flex-1 text-xs bg-primary hover:bg-primary/90" onClick={() => onViewPosts?.(campaign)}>View Posts</Button>
      </div>
    </div>
  );
}
