/**
 * 🎯 Constantes do Funil de Vendas
 * Define todos os status possíveis e suas configurações visuais
 */

export const FUNNEL_STATUSES = {
  new: {
    value: 'new',
    label: 'Novo',
    color: 'bg-status-new text-status-new-foreground',
    description: 'Lead recém capturado',
    order: 1
  },
  contacted: {
    value: 'contacted',
    label: 'Contatado',
    color: 'bg-status-contacted text-status-contacted-foreground',
    description: 'Primeira interação realizada',
    order: 2
  },
  qualified: {
    value: 'qualified',
    label: 'Qualificado',
    color: 'bg-status-qualified text-status-qualified-foreground',
    description: 'Lead tem potencial de compra',
    order: 3
  },
  converted: {
    value: 'converted',
    label: 'Convertido',
    color: 'bg-status-converted text-status-converted-foreground',
    description: 'Venda fechada com sucesso',
    order: 4
  },
  lost: {
    value: 'lost',
    label: 'Perdido',
    color: 'bg-status-lost text-status-lost-foreground',
    description: 'Não converteu',
    order: 5
  }
} as const;

export type FunnelStatus = keyof typeof FUNNEL_STATUSES;

export const ACTIVE_FUNNEL_STATUSES: FunnelStatus[] = [
  'new',
  'contacted', 
  'qualified'
];

export const FINAL_STATUSES: FunnelStatus[] = [
  'converted',
  'lost'
];

export const ALL_STATUSES: FunnelStatus[] = [
  ...ACTIVE_FUNNEL_STATUSES,
  ...FINAL_STATUSES
];

/**
 * Retorna a configuração de um status
 */
export const getStatusConfig = (status: string) => {
  return FUNNEL_STATUSES[status as FunnelStatus] || FUNNEL_STATUSES.new;
};

/**
 * Retorna a cor de um status
 */
export const getStatusColor = (status: string) => {
  return getStatusConfig(status).color;
};

/**
 * Retorna o label de um status
 */
export const getStatusLabel = (status: string) => {
  return getStatusConfig(status).label;
};
