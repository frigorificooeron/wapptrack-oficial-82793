import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lead } from '@/types';
import { MessageCircle, Eye, GripVertical, Clock, Tag } from 'lucide-react';
import { formatBrazilianPhone } from '@/lib/phoneUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  onOpenChat: (lead: Lead) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  lead,
  onLeadClick,
  onOpenChat
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id
  });

  const style = {
    transform: CSS.Translate.toString(transform)
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity duration-200",
        isDragging && "opacity-50"
      )}
    >
      <div className="kanban-card group">
        <div 
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Header with avatar and grip */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm flex-shrink-0">
                <AvatarImage 
                  src={lead.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(lead.name)}&backgroundColor=10b981&textColor=ffffff`}
                  alt={lead.name}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {lead.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate text-foreground">{lead.name}</h4>
                <p className="text-xs text-muted-foreground font-mono tracking-tight">
                  {formatBrazilianPhone(lead.phone)}
                </p>
              </div>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
          </div>

          {/* Campaign tag */}
          {lead.campaign && (
            <div className="flex items-center gap-1.5 mb-3">
              <Tag className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground truncate font-medium">
                {lead.campaign}
              </span>
            </div>
          )}

          {/* Last message preview */}
          {lead.last_message && (
            <div className="relative mb-3 p-2.5 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {lead.last_message}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              {format(new Date(lead.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-border/50">
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-9 text-xs font-medium shadow-sm"
            onClick={() => onOpenChat(lead)}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Conversa
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 hover:bg-muted"
            onClick={() => onLeadClick(lead)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
