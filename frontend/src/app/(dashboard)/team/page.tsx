'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Shield, CheckCircle2, XCircle } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-primary/10 text-primary',
  MARKETING_ADMIN: 'bg-purple-100 text-purple-700',
  GUEST_RELATIONS: 'bg-blue-100 text-blue-700',
  PROPERTY_MANAGER: 'bg-amber-100 text-amber-700',
  FINANCE_MANAGER: 'bg-emerald-100 text-emerald-700',
};

export default function TeamPage() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  return (
    <div>
      <Header title="Team" subtitle="Staff, roles & access" />
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-4">{members.length} team member{members.length === 1 ? '' : 's'}</p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m: any) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                    {m.firstName?.[0]}{m.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{m.firstName} {m.lastName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role?.name] ?? 'bg-muted text-muted-foreground'}`}>
                      {m.role?.name?.replace(/_/g, ' ') ?? 'No role'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail size={12} /> <span className="truncate">{m.email}</span></div>
                  {m.phone && <div className="flex items-center gap-2"><Phone size={12} /> {m.phone}</div>}
                  <div className="flex items-center gap-2">
                    {m.isActive
                      ? <><CheckCircle2 size={12} className="text-emerald-500" /> Active</>
                      : <><XCircle size={12} className="text-red-500" /> Inactive</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
