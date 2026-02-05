import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lead } from '@/types';
import { KanbanCard } from './KanbanCard';
import { FunnelStatus, getStatusConfig } from '@/constants/funnelStatuses';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: FunnelStatus;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onOpenChat: (lead: Lead) => void;
  isDragging: boolean;
}

const statusGradients: Record<FunnelStatus, string> = {
  new: 'from-blue-500 to-blue-600',
  contacted: 'from-cyan-500 to-cyan-600',
  qualified: 'from-purple-500 to-purple-600',
  converted: 'from-emerald-500 to-emerald-600',
  lost: 'from-red-500 to-red-600',
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  leads,
  onLeadClick,
  onOpenChat,
  isDragging
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status
  });

  const config = getStatusConfig(status);
  const gradient = statusGradients[status];

  return (
    <div className="kanban-column bg-card">
      <div className={cn(
        "kanban-column-header text-white bg-gradient-to-r",
        gradient
      )}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
          <h3 className="font-semibold">{config.label}</h3>
        </div>
        <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "kanban-column-body",
          isOver && isDragging && "bg-primary/10 ring-2 ring-primary/30 ring-inset"
        )}
      >
        {leads.map(lead => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onLeadClick={onLeadClick}
            onOpenChat={onOpenChat}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <span className="text-sm font-medium">Nenhum lead</span>
            <span className="text-xs mt-1">Arraste leads para cá</span>
          </div>
        )}
      </div>
    </div>
  );
};
