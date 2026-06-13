'use client';
import { Bell, Search, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps { title: string; subtitle?: string; }

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 w-56 h-9 text-sm" />
        </div>

        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout}>
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}
