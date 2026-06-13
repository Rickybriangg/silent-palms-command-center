'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Send, Phone, User, Tag, Plus, X, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PIPELINE_STAGES = [
  { key: 'NEW_ENQUIRY', label: 'New Enquiry', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'QUOTE_SENT', label: 'Quote Sent', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { key: 'BOOKED', label: 'Booked', color: 'bg-primary/10 text-primary' },
  { key: 'ARRIVING', label: 'Arriving', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { key: 'STAYING', label: 'Staying', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { key: 'CHECKED_OUT', label: 'Checked Out', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  { key: 'REVIEW_PENDING', label: 'Review Pending', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { key: 'REPEAT_GUEST', label: 'Repeat Guest', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
];

export default function WhatsAppPage() {
  const [view, setView] = useState<'conversations' | 'pipeline' | 'templates'>('conversations');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [templateModal, setTemplateModal] = useState<{ mode: 'new' | 'edit'; template?: any } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const qc = useQueryClient();

  const labelMutation = useMutation({
    mutationFn: ({ guestId, label }: { guestId: string; label: string }) => api.post(`/guests/${guestId}/labels`, { label }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] }); toast.success('Label added'); },
    onError: () => toast.error('Failed to add label'),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['whatsapp-conversations', search],
    queryFn: () => api.get(`/whatsapp/conversations?search=${search}`).then(r => r.data),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['whatsapp-messages', selectedGuest?.id],
    queryFn: () => api.get(`/whatsapp/messages/${selectedGuest.id}`).then(r => r.data),
    enabled: !!selectedGuest,
    refetchInterval: 5000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => api.get('/whatsapp/templates').then(r => r.data),
  });

  const { data: pipeline = {} } = useQuery({
    queryKey: ['whatsapp-pipeline'],
    queryFn: () => api.get('/whatsapp/pipeline').then(r => r.data),
    enabled: view === 'pipeline',
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post('/whatsapp/send', { guestId: selectedGuest.id, body }),
    onSuccess: (res) => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      if (res.data?.delivered) toast.success('Delivered via WhatsApp');
      else toast.warning(res.data?.note ?? 'Saved — WhatsApp not connected', { duration: 6000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to send'),
  });

  const saveTemplate = useMutation({
    mutationFn: ({ mode, id, data }: { mode: string; id?: string; data: any }) =>
      mode === 'edit' ? api.put(`/whatsapp/templates/${id}`, data) : api.post('/whatsapp/templates', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsapp-templates'] }); toast.success('Template saved'); setTemplateModal(null); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to save template'),
  });

  return (
    <div className="flex flex-col h-screen">
      <Header title="WhatsApp CRM" subtitle="Guest conversations & pipeline management" />

      {/* View Switcher */}
      <div className="flex gap-1 px-6 pt-4">
        {(['conversations', 'pipeline', 'templates'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors',
              view === v ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'conversations' && (
        <div className="flex flex-1 overflow-hidden p-6 gap-4">
          {/* Contact List */}
          <div className="w-80 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search guests..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {conversations.map((guest: any) => (
                <button
                  key={guest.id}
                  onClick={() => setSelectedGuest(guest)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 text-left',
                    selectedGuest?.id === guest.id && 'bg-primary/5'
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {guest.firstName?.[0]}{guest.lastName?.[0]}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{guest.firstName} {guest.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {guest.whatsappMessages?.[0]?.body || guest.phone}
                    </p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
            {selectedGuest ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {selectedGuest.firstName?.[0]}{selectedGuest.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedGuest.firstName} {selectedGuest.lastName}</p>
                      <p className="text-xs text-muted-foreground">{selectedGuest.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedGuest.labels?.map((l: any) => (
                      <Badge key={l.id} variant="outline" className="text-xs">{l.label}</Badge>
                    ))}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Add label" onClick={() => {
                      const label = window.prompt('Add a label for this guest (e.g. VIP, Honeymoon):');
                      if (label) labelMutation.mutate({ guestId: selectedGuest.id, label });
                    }}><Tag size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Guest profile" onClick={() => setShowProfile(true)}><User size={14} /></Button>
                    <a href={`tel:${selectedGuest.phone}`} title="Call guest">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Phone size={14} /></Button>
                    </a>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <AnimatePresence>
                    {messages.map((msg: any) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn('flex mb-3', msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn(
                          'max-w-xs px-3 py-2 rounded-xl text-sm',
                          msg.direction === 'OUTBOUND'
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        )}>
                          {msg.body}
                          <p className={cn('text-[10px] mt-1', msg.direction === 'OUTBOUND' ? 'text-white/60' : 'text-muted-foreground')}>
                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ScrollArea>

                {/* Templates Quick-Send */}
                <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto">
                  {templates.slice(0, 5).map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => setMessage(t.body)}
                      className="shrink-0 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t.slug}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2 p-3 border-t border-border">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="text-sm"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && message && sendMutation.mutate(message)}
                  />
                  <Button
                    size="icon"
                    className="bg-primary hover:bg-primary/90 shrink-0"
                    onClick={() => message && sendMutation.mutate(message)}
                    disabled={!message || sendMutation.isPending}
                  >
                    <Send size={15} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'pipeline' && (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.key} className="w-64 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
                <div className={cn('px-3 py-2.5 flex items-center justify-between', stage.color)}>
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <span className="text-xs font-bold">{(pipeline as any)[stage.key]?.length ?? 0}</span>
                </div>
                <ScrollArea className="flex-1 p-2 space-y-2">
                  {((pipeline as any)[stage.key] ?? []).map((guest: any) => (
                    <div key={guest.id} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-semibold">{guest.firstName} {guest.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">{guest.phone}</p>
                      <p className="text-[10px] text-muted-foreground">{guest._count?.bookings} bookings</p>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'templates' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Message Templates</h3>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setTemplateModal({ mode: 'new' })}><Plus size={14} /> New Template</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t: any) => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.slug}</span>
                  <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                </div>
                <p className="text-sm text-foreground mt-2 leading-relaxed">{t.body}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="text-xs flex-1 gap-1" onClick={() => setTemplateModal({ mode: 'edit', template: t })}>
                    <Pencil size={12} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => { setView('conversations'); setMessage(t.body); }}
                  >
                    Use
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {templateModal && (
        <TemplateModal
          mode={templateModal.mode}
          template={templateModal.template}
          loading={saveTemplate.isPending}
          onClose={() => setTemplateModal(null)}
          onSubmit={(data) => saveTemplate.mutate({ mode: templateModal.mode, id: templateModal.template?.id, data })}
        />
      )}

      {showProfile && selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowProfile(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Guest Profile</h3>
              <button onClick={() => setShowProfile(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center">
                {selectedGuest.firstName?.[0]}{selectedGuest.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold">{selectedGuest.firstName} {selectedGuest.lastName}</p>
                <p className="text-xs text-muted-foreground">{selectedGuest.phone}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {selectedGuest.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{selectedGuest.email}</span></div>}
              {selectedGuest.nationality && <div className="flex justify-between"><span className="text-muted-foreground">Nationality</span><span>{selectedGuest.nationality}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Bookings</span><span>{selectedGuest.totalBookings ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VIP</span><span>{selectedGuest.isVip ? 'Yes ⭐' : 'No'}</span></div>
              {selectedGuest.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {selectedGuest.labels.map((l: any) => <Badge key={l.id} variant="outline" className="text-[10px]">{l.label}</Badge>)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <a href={`tel:${selectedGuest.phone}`}><Button variant="outline" className="w-full gap-1"><Phone size={14} /> Call</Button></a>
              <Button className="bg-primary hover:bg-primary/90 gap-1" onClick={() => setShowProfile(false)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function TemplateModal({ mode, template, loading, onClose, onSubmit }: { mode: string; template?: any; loading: boolean; onClose: () => void; onSubmit: (d: any) => void }) {
  const [form, setForm] = useState({
    name: template?.name ?? '',
    slug: template?.slug ?? '',
    category: template?.category ?? 'GENERAL',
    body: template?.body ?? '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{mode === 'edit' ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!form.name || !form.slug || !form.body) return toast.error('Name, slug and body are required');
            onSubmit(form);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enquiry Response" required /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="/enquiry" required /></div>
          </div>
          <div>
            <Label>Category</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
              {['GENERAL', 'ENQUIRY', 'BOOKING', 'PRE_ARRIVAL', 'CHECKOUT', 'REVIEW', 'MARKETING'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <Label>Message Body</Label>
            <Textarea value={form.body} onChange={e => set('body', e.target.value)} rows={4}
              placeholder="Hi {name}, thank you for your interest in Silent Palms Villa..." required />
            <p className="text-[10px] text-muted-foreground mt-1">Use {'{name}'}, {'{checkIn}'}, {'{unit}'} as placeholders.</p>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} {mode === 'edit' ? 'Save Changes' : 'Create Template'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
