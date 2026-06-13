'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PalmtreeIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const res = await api.post('/auth/join', { email, code, password });
      setAuth(res.data.token, res.data.user);
      toast.success(`Welcome to the team, ${res.data.user.firstName}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Invalid email or code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center"><PalmtreeIcon size={18} /></div>
          <div>
            <p className="font-bold text-sm">Silent Palms</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Command Center</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-1">Join the team</h2>
        <p className="text-muted-foreground text-sm mb-8">Enter the 6-digit code your admin gave you, and set your password.</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@silentpalms.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">6-digit join code</Label>
            <Input id="code" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} required className="tracking-[0.3em] text-center" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Create a password</Label>
            <Input id="password" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Verify & Join
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-6 text-center">Already activated? <a href="/login" className="text-primary">Sign in</a></p>
      </div>
    </div>
  );
}
