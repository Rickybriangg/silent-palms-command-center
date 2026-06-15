'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Header } from '@/components/layout/Header';
import {
  DollarSign, TrendingUp, Hotel, Users, MessageCircle,
  Megaphone, Star, BarChart2, Percent, Target
} from 'lucide-react';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OccupancyHeatmap } from '@/components/dashboard/OccupancyHeatmap';
import { BookingFunnel } from '@/components/dashboard/BookingFunnel';
import { ChannelBreakdown } from '@/components/dashboard/ChannelBreakdown';
import { currencySymbol } from '@/lib/currency';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <Header
        title="Command Center"
        subtitle="Silent Palms Villa — Diani Beach, Kenya"
      />

      <div className="p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Revenue Today"
            value={stats?.revenueToday ?? 0}
            icon={<DollarSign size={16} />}
            color="primary"
            prefix={`${currencySymbol()} `}
            loading={isLoading}
          />
          <KpiCard
            title="Revenue This Month"
            value={stats?.revenueThisMonth ?? 0}
            change={stats?.monthlyGrowth}
            changeLabel="vs last month"
            icon={<TrendingUp size={16} />}
            color="secondary"
            prefix={`${currencySymbol()} `}
            loading={isLoading}
          />
          <KpiCard
            title="Occupancy Rate"
            value={stats?.occupancyRate ?? 0}
            icon={<Hotel size={16} />}
            color="emerald"
            suffix="%"
            loading={isLoading}
          />
          <KpiCard
            title="Conversion Rate"
            value={stats?.conversionRate ?? 0}
            icon={<Percent size={16} />}
            color="blue"
            suffix="%"
            loading={isLoading}
          />
          <KpiCard
            title="Direct Bookings"
            value={stats?.directBookingPct ?? 0}
            icon={<Target size={16} />}
            color="accent"
            suffix="%"
            loading={isLoading}
          />
          <KpiCard
            title="OTA Bookings"
            value={stats?.otaBookingPct ?? 0}
            icon={<BarChart2 size={16} />}
            color="rose"
            suffix="%"
            loading={isLoading}
          />
          <KpiCard
            title="Active Campaigns"
            value={stats?.activeCampaigns ?? 0}
            icon={<Megaphone size={16} />}
            color="primary"
            loading={isLoading}
          />
          <KpiCard
            title="WhatsApp Leads"
            value={stats?.whatsappLeads ?? 0}
            icon={<MessageCircle size={16} />}
            color="secondary"
            loading={isLoading}
          />
          <KpiCard
            title="Guest Satisfaction"
            value={stats?.guestSatisfaction ?? 0}
            icon={<Star size={16} />}
            color="accent"
            suffix="/5"
            loading={isLoading}
          />
          <KpiCard
            title="Monthly Growth"
            value={stats?.monthlyGrowth ?? 0}
            icon={<TrendingUp size={16} />}
            color="emerald"
            suffix="%"
            loading={isLoading}
          />
          <KpiCard
            title="Total Guests"
            value={stats?.totalGuests ?? 0}
            icon={<Users size={16} />}
            color="blue"
            loading={isLoading}
          />
          <KpiCard
            title="Active Bookings"
            value={stats?.activeBookings ?? 0}
            icon={<Hotel size={16} />}
            color="rose"
            loading={isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ChannelBreakdown data={stats?.channelBreakdown ?? []} />
        </div>

        {/* Lower Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BookingFunnel />
          <OccupancyHeatmap />
        </div>
      </div>
    </div>
  );
}
