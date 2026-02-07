
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import StatCard from '@/components/StatCard';
import DateRangeFilter from '@/components/DateRangeFilter';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, MessageSquare, DollarSign, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { getDashboardStatsByPeriod, getCampaignPerformance, getTimelineData } from '@/services/dashboardService';
import { DashboardStats, CampaignPerformance, DateRange, TimelineDataPoint } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize date range to last 7 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return { startDate: start, endDate: end };
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [dashboardStats, campaignData, timeline] = await Promise.all([
        getDashboardStatsByPeriod(dateRange.startDate.toISOString(), dateRange.endDate.toISOString()),
        getCampaignPerformance(),
        getTimelineData(dateRange.startDate.toISOString(), dateRange.endDate.toISOString())
      ]);
      setStats(dashboardStats);
      setCampaignPerformance(campaignData);
      setTimelineData(timeline);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe os resultados de suas campanhas de WhatsApp
              </p>
            </div>
          </div>
        </div>

        <DateRangeFilter 
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse bg-card/50">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Leads do Período"
              value={stats?.totalLeads || 0}
              icon={Users}
              iconColor="hsl(var(--primary))"
            />
            <StatCard
              title="Leads do Mês"
              value={stats?.monthlyLeads || 0}
              icon={Calendar}
              iconColor="hsl(142 76% 36%)"
            />
            <StatCard
              title="Vendas Confirmadas"
              value={stats?.confirmedSales || 0}
              icon={DollarSign}
              iconColor="hsl(142 76% 36%)"
            />
            <StatCard
              title="Faturamento do Mês"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              icon={TrendingUp}
              iconColor="hsl(38 92% 50%)"
            />
            <StatCard
              title="Conversas Pendentes"
              value={stats?.pendingConversations || 0}
              icon={MessageSquare}
              iconColor="hsl(38 92% 50%)"
            />
            <StatCard
              title="Taxa de Conversão"
              value={formatPercent(stats?.conversionRate || 0)}
              icon={LayoutDashboard}
              iconColor="hsl(var(--primary))"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1 lg:col-span-2 glass-card-hover border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Desempenho no Tempo</CardTitle>
                  <CardDescription>Leads, vendas e faturamento no período selecionado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LineChart 
                data={timelineData}
                xAxisDataKey="date"
                lines={[
                  { dataKey: 'leads', color: 'hsl(var(--primary))', name: 'Leads' },
                  { dataKey: 'sales', color: 'hsl(38 92% 50%)', name: 'Vendas' },
                  { dataKey: 'revenue', color: 'hsl(262 83% 58%)', name: 'Faturamento' }
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="col-span-1 glass-card-hover border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Conversão por Campanha</CardTitle>
                  <CardDescription>Taxa de conversão para cada campanha ativa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BarChart
                data={campaignPerformance}
                dataKey="conversionRate"
                nameKey="campaignName"
                formatter={formatPercent}
                barColor="hsl(142 76% 36%)"
              />
            </CardContent>
          </Card>

          <Card className="col-span-1 glass-card-hover border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Receita por Campanha</CardTitle>
                  <CardDescription>Total de receita gerada para cada campanha</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BarChart
                data={campaignPerformance}
                dataKey="revenue"
                nameKey="campaignName"
                formatter={formatCurrency}
                barColor="hsl(38 92% 50%)"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card-hover border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Desempenho de Campanhas</CardTitle>
                <CardDescription>Visão detalhada de todas as campanhas ativas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campanha</th>
                    <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads</th>
                    <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendas</th>
                    <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receita</th>
                    <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {campaignPerformance.map((campaign, index) => (
                    <tr 
                      key={campaign.campaignId} 
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-medium text-foreground">{campaign.campaignName}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {campaign.leads}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium">
                          {campaign.sales}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-foreground">{formatCurrency(campaign.revenue)}</td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium">
                          {formatPercent(campaign.conversionRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
