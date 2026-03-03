import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Phone, Clock } from 'lucide-react';
import type { AgentStage } from '@/hooks/agents/useAgentStages';

interface KanbanLead {
  id: string;
  name: string;
  phone: string;
  collected_variables: Record<string, any>;
  last_contact_date: string | null;
  current_stage_id: string | null;
}

interface Props {
  agentId: string;
  stages: AgentStage[];
}

const AgentKanban: React.FC<Props> = ({ agentId, stages }) => {
  const [leads, setLeads] = useState<KanbanLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel(`kanban-${agentId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `agent_id=eq.${agentId}` }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agentId]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, collected_variables, last_contact_date, current_stage_id')
      .eq('agent_id', agentId)
      .order('last_contact_date', { ascending: false });

    setLeads((data || []) as KanbanLead[]);
    setLoading(false);
  };

  const getLeadsByStage = (stageId: string) => leads.filter(l => l.current_stage_id === stageId);
  const unassignedLeads = leads.filter(l => !l.current_stage_id || !stages.find(s => s.id === l.current_stage_id));

  const formatDate = (d: string | null) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando Kanban...</p>;

  const columns = [
    ...stages.map(s => ({ id: s.id, name: s.name, order: s.stage_order, leads: getLeadsByStage(s.id) })),
    ...(unassignedLeads.length > 0 ? [{ id: 'unassigned', name: 'Sem Etapa', order: 999, leads: unassignedLeads }] : []),
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(col => (
        <div key={col.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm">{col.name}</h3>
            <Badge variant="secondary" className="text-xs">{col.leads.length}</Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2 pr-2">
              {col.leads.map(lead => (
                <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-sm truncate">{lead.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="font-mono">{lead.phone}</span>
                    </div>
                    {lead.last_contact_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(lead.last_contact_date)} atrás</span>
                      </div>
                    )}
                    {lead.collected_variables && Object.keys(lead.collected_variables).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(lead.collected_variables).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-[10px] h-4">
                            {k}: {String(v).substring(0, 15)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {col.leads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
      {columns.length === 0 && (
        <p className="text-center text-muted-foreground py-8 w-full">Configure etapas para visualizar o Kanban.</p>
      )}
    </div>
  );
};

export default AgentKanban;
