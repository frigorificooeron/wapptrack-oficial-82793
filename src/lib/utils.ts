import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency to BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Format date to Brazilian standard
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

// Format date and time to Brazilian standard
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

// Format date relative to now (ex: "há 2 horas")
export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true, 
    locale: ptBR 
  })
}

// Format date for display (ex: "15 de junho de 2024")
export function formatDateLong(date: string | Date): string {
  return format(new Date(date), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })
}

// Format percentage
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

// Generate WhatsApp redirect link
export function generateWhatsAppLink(phone: string, message?: string): string {
  const formattedPhone = phone.replace(/\D/g, '')
  const encodedMessage = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

// Generate tracking URL
export function generateTrackingUrl(baseUrl: string, campaignId: string): string {
  return `${baseUrl}/ir?id=${campaignId}`
}

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// Parse a URL's query parameters
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {}
  const queryString = url.split('?')[1]
  
  if (!queryString) return params
  
  const queryParams = new URLSearchParams(queryString)
  queryParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

// Build a UTM URL
export function buildUtmUrl(
  baseUrl: string, 
  campaign: { name: string, id: string }
): string {
  const params = new URLSearchParams();
  params.append('utm_source', 'campanha_web');
  params.append('utm_medium', 'digital');
  params.append('utm_campaign', (campaign.name || '').replace(/\s+/g, '-').toLowerCase());
  params.append('utm_content', 'link');
  params.append('utm_term', 'padrao');
  return `${baseUrl}/ir?id=${campaign.id}&${params.toString()}`;
}

// Phone number mask formatter - updated for Brazilian phones with country code
export function formatPhoneNumber(value: string): string {
  if (!value) return value
  
  // Remove all non-digits
  const phone = value.replace(/\D/g, '')
  
  // Check if it's a Brazilian number with country code (55)
  if (phone.startsWith('55') && phone.length >= 12) {
    const ddd = phone.slice(2, 4)
    const number = phone.slice(4)
    
    if (number.length <= 5) {
      return `+55 (${ddd}) ${number}`
    } else {
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`
    }
  }
  
  // Fallback to original formatting for other cases
  if (phone.length <= 2) {
    return phone
  } else if (phone.length <= 6) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2)}`
  } else if (phone.length <= 10) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
  } else {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`
  }
}

// 🔐 RASTREAMENTO INVISÍVEL COM CARACTERES DE LARGURA ZERO
// Codifica um ID em caracteres invisíveis (zero-width) para rastreamento
export function encodeInvisibleToken(id: string): string {
  // Mapa de caracteres para zero-width
  const charMap: Record<string, string> = {
    '0': '\u200B',      // Zero Width Space
    '1': '\u200C',      // Zero Width Non-Joiner
    '2': '\u200D',      // Zero Width Joiner
    '3': '\u200B\u200B',
    '4': '\u200B\u200C',
    '5': '\u200B\u200D',
    '6': '\u200C\u200B',
    '7': '\u200C\u200C',
    '8': '\u200C\u200D',
    '9': '\u200D\u200B',
    'A': '\u200D\u200C',
    'B': '\u200D\u200D',
    'C': '\u200B\u200B\u200B',
    'D': '\u200B\u200B\u200C',
    'E': '\u200B\u200B\u200D',
    'F': '\u200B\u200C\u200B',
    'G': '\u200B\u200C\u200C',
    'H': '\u200B\u200C\u200D',
    'I': '\u200B\u200D\u200B',
    'J': '\u200B\u200D\u200C',
    'K': '\u200B\u200D\u200D',
    'L': '\u200C\u200B\u200B',
    'M': '\u200C\u200B\u200C',
    'N': '\u200C\u200B\u200D',
    'O': '\u200C\u200C\u200B',
    'P': '\u200C\u200C\u200C',
    'Q': '\u200C\u200C\u200D',
    'R': '\u200C\u200D\u200B',
    'S': '\u200C\u200D\u200C',
    'T': '\u200C\u200D\u200D',
    'U': '\u200D\u200B\u200B',
    'V': '\u200D\u200B\u200C',
    'W': '\u200D\u200B\u200D',
    'X': '\u200D\u200C\u200B',
    'Y': '\u200D\u200C\u200C',
    'Z': '\u200D\u200D\u200B'
  };
  
  return id.split('').map(char => charMap[char] || '').join('');
}

// Decodifica caracteres invisíveis de volta para o ID original
export function decodeInvisibleToken(text: string): string | null {
  // Mapa reverso
  const reverseMap: Record<string, string> = {
    '\u200B': '0',
    '\u200C': '1',
    '\u200D': '2',
    '\u200B\u200B': '3',
    '\u200B\u200C': '4',
    '\u200B\u200D': '5',
    '\u200C\u200B': '6',
    '\u200C\u200C': '7',
    '\u200C\u200D': '8',
    '\u200D\u200B': '9',
    '\u200D\u200C': 'A',
    '\u200D\u200D': 'B',
    '\u200B\u200B\u200B': 'C',
    '\u200B\u200B\u200C': 'D',
    '\u200B\u200B\u200D': 'E',
    '\u200B\u200C\u200B': 'F',
    '\u200B\u200C\u200C': 'G',
    '\u200B\u200C\u200D': 'H',
    '\u200B\u200D\u200B': 'I',
    '\u200B\u200D\u200C': 'J',
    '\u200B\u200D\u200D': 'K',
    '\u200C\u200B\u200B': 'L',
    '\u200C\u200B\u200C': 'M',
    '\u200C\u200B\u200D': 'N',
    '\u200C\u200C\u200B': 'O',
    '\u200C\u200C\u200C': 'P',
    '\u200C\u200C\u200D': 'Q',
    '\u200C\u200D\u200B': 'R',
    '\u200C\u200D\u200C': 'S',
    '\u200C\u200D\u200D': 'T',
    '\u200D\u200B\u200B': 'U',
    '\u200D\u200B\u200C': 'V',
    '\u200D\u200B\u200D': 'W',
    '\u200D\u200C\u200B': 'X',
    '\u200D\u200C\u200C': 'Y',
    '\u200D\u200D\u200B': 'Z'
  };
  
  // Extrair apenas caracteres zero-width
  const zeroWidthChars = text.match(/[\u200B\u200C\u200D]+/g);
  if (!zeroWidthChars) return null;
  
  let decoded = '';
  let i = 0;
  const fullZeroWidth = zeroWidthChars.join('');
  
  while (i < fullZeroWidth.length) {
    // Tentar combinar 3 caracteres primeiro
    const triple = fullZeroWidth.slice(i, i + 3);
    if (reverseMap[triple]) {
      decoded += reverseMap[triple];
      i += 3;
      continue;
    }
    
    // Tentar combinar 2 caracteres
    const double = fullZeroWidth.slice(i, i + 2);
    if (reverseMap[double]) {
      decoded += reverseMap[double];
      i += 2;
      continue;
    }
    
    // Tentar combinar 1 caractere
    const single = fullZeroWidth[i];
    if (reverseMap[single]) {
      decoded += reverseMap[single];
      i += 1;
      continue;
    }
    
    i++;
  }
  
  return decoded || null;
}
