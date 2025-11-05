
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Trash2, ExternalLink } from "lucide-react";
import { Lead } from '@/types';
import { formatBrazilianPhone } from '@/lib/phoneUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadStatusBadge } from './LeadStatusBadge';

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLeads: string[];
  onSelectLead: (leadId: string) => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onView: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onOpenWhatsApp: (phone: string) => void;
}

const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  isLoading,
  selectedLeads,
  onSelectLead,
  onSelectAll,
  onDeleteSelected,
  onView,
  onDelete,
  onOpenWhatsApp
}) => {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const someSelected = selectedLeads.length > 0;

  return (
    <>
      {someSelected && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedLeads.length} lead(s) selecionado(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Selecionados
          </Button>
        </div>
      )}
      
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="w-14">Foto</TableHead>
              <TableHead className="min-w-32">Campanha</TableHead>
              <TableHead className="min-w-32">Nome</TableHead>
              <TableHead className="w-36 min-w-36">Telefone</TableHead>
              <TableHead className="min-w-24">Status</TableHead>
              <TableHead className="w-32 min-w-32">Data Criação</TableHead>
              <TableHead className="w-32 min-w-32">Primeiro Contato</TableHead>
              <TableHead className="w-32 min-w-32">Último Contato</TableHead>
              <TableHead className="text-right min-w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => onSelectLead(lead.id)}
                      aria-label={`Selecionar ${lead.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={lead.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(lead.name)}`}
                        alt={lead.name}
                      />
                      <AvatarFallback>{lead.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium min-w-32">{lead.campaign}</TableCell>
                  <TableCell className="min-w-32">{lead.name}</TableCell>
                  <TableCell className="w-36 min-w-36 font-mono text-sm text-center whitespace-nowrap px-6">
                    {formatBrazilianPhone(lead.phone)}
                  </TableCell>
                  <TableCell className="min-w-24">
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="w-32 min-w-32 text-xs whitespace-nowrap">
                    {lead.created_at
                      ? format(new Date(lead.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell className="w-32 min-w-32 text-xs whitespace-nowrap">
                    {lead.first_contact_date
                      ? format(new Date(lead.first_contact_date), 'dd/MM/yy HH:mm', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell className="w-32 min-w-32 text-xs whitespace-nowrap">
                    {lead.last_contact_date
                      ? format(new Date(lead.last_contact_date), 'dd/MM/yy HH:mm', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right min-w-32">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenWhatsApp(lead.phone)}
                        title="Abrir WhatsApp"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(lead)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(lead.id)}
                        title="Excluir lead"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default LeadsTable;
