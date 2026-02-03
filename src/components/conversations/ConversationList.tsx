import React from 'react';
import { Lead } from '@/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatBrazilianPhone } from '@/lib/phoneUtils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLead: Lead | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectLead: (lead: Lead) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  leads,
  isLoading,
  selectedLead,
  searchTerm,
  onSearchChange,
  onSelectLead,
}) => {
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Conversas
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={cn(
                  'w-full p-3 flex items-start gap-3 hover:bg-accent/50 transition-colors text-left',
                  selectedLead?.id === lead.id && 'bg-accent'
                )}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={lead.profile_picture_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(lead.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{lead.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatMessageDate(lead.updated_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatBrazilianPhone(lead.phone)}
                  </p>
                  {lead.last_message && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {lead.last_message}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
