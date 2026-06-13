'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Copy, Sparkles, FileText, MessageCircle, TrendingUp, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const GENERATION_TYPES = [
  { value: 'social_post', label: 'Social Media Post', icon: <Instagram size={14} /> },
  { value: 'whatsapp_response', label: 'WhatsApp Response', icon: <MessageCircle size={14} /> },
  { value: 'campaign', label: 'Marketing Campaign', icon: <Sparkles size={14} /> },
  { value: 'blog_article', label: 'Blog Article', icon: <FileText size={14} /> },
  { value: 'executive_report', label: 'Executive Report', icon: <TrendingUp size={14} /> },
  { value: 'revenue_forecast', label: 'Revenue Forecast', icon: <TrendingUp size={14} /> },
];

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIAssistantPage() {
  const [mode, setMode] = useState<'chat' | 'generate'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m the Silent Palms AI assistant. I can help you create social media posts, marketing campaigns, WhatsApp responses, reports, and more. What would you like to create today?' }
  ]);
  const [input, setInput] = useState('');
  const [genType, setGenType] = useState('social_post');
  const [genContext, setGenContext] = useState('');
  const [genPlatform, setGenPlatform] = useState('INSTAGRAM');
  const [result, setResult] = useState('');

  const chatMutation = useMutation({
    mutationFn: (msgs: Message[]) => api.post('/ai/chat', { messages: msgs.map(m => ({ role: m.role, content: m.content })) }),
    onSuccess: (res) => {
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/ai/generate', {
      type: genType,
      context: { details: genContext, platform: genPlatform },
    }),
    onSuccess: (res) => setResult(res.data.content),
  });

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    chatMutation.mutate(newMessages);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="AI Assistant" subtitle="Powered by Claude — generate content, insights & more" />

      <div className="flex-1 overflow-hidden p-6 flex gap-6">
        {/* Mode Selector */}
        <div className="w-56 shrink-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">Mode</p>
          {(['chat', 'generate'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {m === 'chat' ? <MessageCircle size={15} /> : <Sparkles size={15} />}
              {m === 'chat' ? 'Chat Assistant' : 'Content Generator'}
            </button>
          ))}

          {mode === 'generate' && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-4 mb-2">Generate</p>
              {GENERATION_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setGenType(t.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${genType === t.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Main Area */}
        {mode === 'chat' ? (
          <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Bot size={14} />
                      </div>
                    )}
                    <div className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Bot size={14} />
                    </div>
                    <div className="bg-muted rounded-xl px-4 py-3 flex gap-1">
                      {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="flex gap-2 p-4 border-t border-border">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything about Silent Palms..."
                className="text-sm"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={!input.trim() || chatMutation.isPending} className="bg-primary hover:bg-primary/90 shrink-0">
                <Send size={15} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-5">
            {/* Input Panel */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm">Generate: {GENERATION_TYPES.find(t => t.value === genType)?.label}</h3>

              {genType === 'social_post' && (
                <Select value={genPlatform} onValueChange={setGenPlatform}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    {['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'GOOGLE_BUSINESS'].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Textarea
                value={genContext}
                onChange={e => setGenContext(e.target.value)}
                placeholder={
                  genType === 'social_post' ? 'Describe the post: occasion, mood, what to highlight...'
                  : genType === 'whatsapp_response' ? "Paste the guest's message here..."
                  : 'Describe what you need...'
                }
                className="min-h-[200px] text-sm resize-none"
              />

              <Button
                className="w-full bg-primary hover:bg-primary/90 gap-2"
                onClick={() => generateMutation.mutate()}
                disabled={!genContext.trim() || generateMutation.isPending}
              >
                <Sparkles size={14} /> {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </div>

            {/* Output Panel */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Result</h3>
                {result && (
                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs"
                    onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!'); }}>
                    <Copy size={12} /> Copy
                  </Button>
                )}
              </div>
              {result ? (
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result}</div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Generated content will appear here
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
