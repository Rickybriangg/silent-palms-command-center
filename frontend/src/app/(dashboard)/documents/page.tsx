'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, FileText, FileType, Upload, Download, Trash2, Loader2, FolderOpen, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const FINANCE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

const REPORTS: { type: string; label: string; desc: string; finance?: boolean }[] = [
  { type: 'revenue', label: 'Revenue Report', desc: 'All income with sources & categories' },
  { type: 'bookings', label: 'Bookings Report', desc: 'Reservations across all channels' },
  { type: 'expenses', label: 'Expenses Report', desc: 'All outgoings by category', finance: true },
  { type: 'financial', label: 'Financial Statement', desc: 'Inflow vs outflow & net position', finance: true },
  { type: 'executive', label: 'Executive Report', desc: 'Live KPIs: revenue, occupancy, ADR' },
  { type: 'occupancy', label: 'Occupancy Report', desc: 'Occupancy & performance summary' },
  { type: 'guests', label: 'Guest / CRM List', desc: 'Full guest database export' },
];

const FORMATS = [
  { key: 'excel', label: 'Excel', icon: <FileSpreadsheet size={13} /> },
  { key: 'pdf', label: 'PDF', icon: <FileType size={13} /> },
  { key: 'word', label: 'Word', icon: <FileText size={13} /> },
];

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const role = (user as any)?.role?.name ?? (user as any)?.role ?? '';
  const isFinance = FINANCE_ROLES.includes(role);
  const [period, setPeriod] = useState('month');
  const [busy, setBusy] = useState<string | null>(null);

  const generate = async (type: string, format: string) => {
    const key = `${type}-${format}`;
    setBusy(key);
    try {
      const res = await api.post('/documents/generate', { type, format, period }, { responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : format === 'word' ? 'docx' : 'pdf';
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${type}-${period}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (e: any) {
      try { const txt = await (e?.response?.data as Blob).text(); toast.error(JSON.parse(txt).error ?? 'Download failed'); }
      catch { toast.error('Download failed'); }
    } finally { setBusy(null); }
  };

  return (
    <div>
      <Header title="Document Center" subtitle="Generate live reports & manage files" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Reporting period:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map(r => {
            const locked = r.finance && !isFinance;
            return (
              <div key={r.type} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">{r.label}</h4>
                  {r.finance && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Finance</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-4">{r.desc}</p>
                {locked ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock size={12} /> Finance Managers & Admins only</div>
                ) : (
                  <div className="flex gap-2">
                    {FORMATS.map(f => (
                      <Button key={f.key} size="sm" variant="outline" className="flex-1 gap-1 text-xs"
                        disabled={busy === `${r.type}-${f.key}`} onClick={() => generate(r.type, f.key)}>
                        {busy === `${r.type}-${f.key}` ? <Loader2 size={12} className="animate-spin" /> : f.icon} {f.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DocumentLibrary canManage={['SUPER_ADMIN', 'FINANCE_MANAGER', 'PROPERTY_MANAGER'].includes(role)} />
      </div>
    </div>
  );
}

function DocumentLibrary({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { data: docs = [] } = useQuery({ queryKey: ['doc-library'], queryFn: () => api.get('/documents/library').then(r => r.data) });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Max 8MB per file'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', 'GENERAL');
    try {
      await api.post('/documents/library', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded');
      qc.invalidateQueries({ queryKey: ['doc-library'] });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const download = async (id: string, name: string) => {
    const res = await api.get(`/documents/library/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/library/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-library'] }); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const kb = (n?: number) => n ? (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`) : '';

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><FolderOpen size={16} className="text-primary" /><h3 className="font-semibold">Document Library</h3></div>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={onUpload} />
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" disabled={uploading} asChild>
            <span>{uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload File</span>
          </Button>
        </label>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Store contracts, guest IDs, supplier receipts, signed invoices (max 8MB each).</p>
      {docs.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-sm">No files yet. Upload your first document.</div>
      ) : (
        <div className="divide-y divide-border/50">
          {docs.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">{d.type} · {kb(d.size)} · {new Date(d.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => download(d.id, d.name)}><Download size={13} /></Button>
                {canManage && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => { if (confirm(`Delete ${d.name}?`)) remove.mutate(d.id); }}><Trash2 size={13} /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
