
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Download, CheckCircle, XCircle } from "lucide-react";
import { Lead } from '@/types';
import { toast } from "sonner";

interface BulkActionsBarProps {
  selectedLeads: string[];
  leads: Lead[];
  onDeleteSelected: () => void;
  onUpdateStatus: (status: string) => void;
  onExportCSV: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedLeads,
  leads,
  onDeleteSelected,
  onUpdateStatus,
  onExportCSV
}) => {
  if (selectedLeads.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex flex-wrap items-center justify-between gap-4">
      <span className="text-sm font-medium">
        {selectedLeads.length} lead(s) selecionado(s)
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateStatus('converted')}
          className="border-green-500/50 text-green-600 hover:bg-green-500/10 dark:text-green-400"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Marcar Convertido
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateStatus('cancelled')}
          className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Marcar Cancelado
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSelected}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
