'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { FileText, Download, BarChart2, TrendingUp, Users, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const REPORTS = [
  {
    category: 'Excel Reports',
    icon: <FileSpreadsheet size={18} />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    reports: [
      { label: 'Revenue Report', endpoint: '/documents/excel/revenue', filename: 'revenue-report.xlsx' },
      { label: 'Bookings Report', endpoint: '/documents/excel/bookings', filename: 'bookings-report.xlsx' },
    ],
  },
  {
    category: 'Word Documents',
    icon: <FileText size={18} />,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    reports: [
      { label: 'Marketing Report', endpoint: '/documents/word/report', filename: 'marketing-report.docx', body: { title: 'Marketing Report', sections: [{ heading: 'Summary', content: 'Monthly marketing performance summary for Silent Palms Villa.' }] } },
      { label: 'Executive Report', endpoint: '/documents/word/report', filename: 'executive-report.docx', body: { title: 'Executive Report', sections: [{ heading: 'Executive Summary', content: 'Quarterly executive overview for Silent Palms Villa investors and management.' }] } },
      { label: 'Occupancy Report', endpoint: '/documents/word/report', filename: 'occupancy-report.docx', body: { title: 'Occupancy Report', sections: [{ heading: 'Occupancy Overview', content: 'Monthly occupancy analysis and insights.' }] } },
    ],
  },
];

export default function DocumentsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (endpoint: string, filename: string, body?: any) => {
    setLoading(endpoint);
    try {
      const res = body
        ? await api.post(endpoint, body, { responseType: 'blob' })
        : await api.post(endpoint, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded`);
    } catch {
      toast.error('Download failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <Header title="Document Generator" subtitle="Generate & export reports in Excel, Word & PDF" />
      <div className="p-6 space-y-6">
        {REPORTS.map(cat => (
          <div key={cat.category}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${cat.color}`}>{cat.icon}</div>
              <h3 className="font-semibold">{cat.category}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.reports.map(r => (
                <div key={r.label} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className={`inline-flex p-2 rounded-lg mb-3 ${cat.color}`}>{cat.icon}</div>
                  <h4 className="font-semibold text-sm mb-1">{r.label}</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Download as {r.filename.split('.').pop()?.toUpperCase()}
                  </p>
                  <Button
                    size="sm"
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    onClick={() => download(r.endpoint, r.filename, (r as any).body)}
                    disabled={loading === r.endpoint}
                  >
                    {loading === r.endpoint ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
