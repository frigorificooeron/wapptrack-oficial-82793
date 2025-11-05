import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lead } from '@/types';
import { MessageCircle, Eye, GripVertical } from 'lucide-react';
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
        isDragging && "opacity-50"
      )}
    >
      <Card className="hover:shadow-md transition-shadow bg-card">
        <CardContent className="p-3 space-y-2">
          <div 
            {...listeners}
            {...attributes}
            className="cursor-move touch-none"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage 
                    src={lead.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(lead.name)}`}
                    alt={lead.name}
                  />
                  <AvatarFallback className="text-xs">{lead.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{lead.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatBrazilianPhone(lead.phone)}
                  </p>
                </div>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>

            {lead.campaign && (
              <div className="text-xs text-muted-foreground truncate">
                📊 {lead.campaign}
              </div>
            )}

            {lead.last_message && (
              <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                {lead.last_message}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {format(new Date(lead.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
            </div>
          </div>

          <div className="flex gap-1 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs cursor-pointer"
              onClick={() => onOpenChat(lead)}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Conversa
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 cursor-pointer"
              onClick={() => onLeadClick(lead)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
