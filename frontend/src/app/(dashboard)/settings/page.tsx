'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import { Building2, MapPin, User, Shield, Palmtree, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: me } = useQuery({
    queryKey: ['me-settings'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
  });

  const profile = me ?? user;

  return (
    <div>
      <Header title="Settings" subtitle="Account & property configuration" />
      <div className="p-6 space-y-6 max-w-3xl">

        {/* Profile */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-primary" />
            <h3 className="font-semibold">My Profile</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground mb-1">Name</p><p className="font-medium">{profile?.firstName} {profile?.lastName}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Email</p><p className="font-medium">{profile?.email}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Role</p><p className="font-medium">{(profile?.role?.name ?? profile?.role)?.toString().replace(/_/g, ' ')}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Status</p><p className="font-medium text-emerald-600">Active</p></div>
          </div>
        </section>

        {/* Property */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palmtree size={16} className="text-primary" />
            <h3 className="font-semibold">Property</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground mb-1">Name</p><p className="font-medium">Silent Palms Villa</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Location</p><p className="font-medium flex items-center gap-1"><MapPin size={12} /> Diani Beach, Kenya</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Units</p><p className="font-medium">Whole Villa, 2-Bedroom Unit</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Currency</p><p className="font-medium">USD ($)</p></div>
          </div>
        </section>

        {/* Preferences (display only) */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-primary" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="space-y-3 text-sm">
            {['New booking alerts', 'WhatsApp lead notifications', 'Daily revenue summary', 'Task reminders'].map(label => (
              <label key={label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary">
                  <span className="inline-block h-4 w-4 translate-x-4 rounded-full bg-white transition" />
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">Preference toggles are display-only in this build.</p>
        </section>

      </div>
    </div>
  );
}
