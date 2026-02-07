
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { TrendData } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: TrendData;
  className?: string;
  iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconColor = "hsl(var(--primary))"
}) => {
  const getTrendIcon = (trendType: 'up' | 'down' | 'flat') => {
    switch (trendType) {
      case 'up':
        return ArrowUp;
      case 'down':
        return ArrowDown;
      case 'flat':
        return Minus;
    }
  };

  const getTrendColor = (trendType: 'up' | 'down' | 'flat') => {
    switch (trendType) {
      case 'up':
        return 'text-emerald-500';
      case 'down':
        return 'text-rose-500';
      case 'flat':
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden glass-card-hover group relative",
      "bg-gradient-to-br from-card/80 to-card border-border/50",
      "backdrop-blur-sm",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <h4 className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 pt-1">
                <div className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                  trend.trend === 'up' && "bg-emerald-500/10 text-emerald-500",
                  trend.trend === 'down' && "bg-rose-500/10 text-rose-500",
                  trend.trend === 'flat' && "bg-muted text-muted-foreground"
                )}>
                  {React.createElement(getTrendIcon(trend.trend), { className: "h-3 w-3" })}
                  <span>{Math.abs(trend.percentage).toFixed(1)}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground">vs. mês anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "ring-1 ring-primary/10",
            "group-hover:scale-110 transition-transform duration-300"
          )}>
            <Icon className="h-6 w-6 text-primary" style={{ color: iconColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
