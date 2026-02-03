import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/types';
import { useLeadChat } from '@/hooks/useLeadChat';
import { formatBrazilianPhone } from '@/lib/phoneUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, MessageCircle, Loader2, X, Image as ImageIcon, Video, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaInput } from './MediaInput';

interface ChatPanelProps {
  lead: Lead | null;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ lead, onClose }) => {
  const { messages, loading, sending, sendMessage, sendMediaMessage } = useLeadChat(
    lead?.id || '', 
    lead?.phone || ''
  );
  const [inputMessage, setInputMessage] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' | 'audio'; file: File } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Limpar input ao trocar de lead
  useEffect(() => {
    setInputMessage('');
    setMediaPreview(null);
  }, [lead?.id]);

  const handleSend = async () => {
    if (sending || !lead) return;

    if (mediaPreview) {
      await sendMediaMessage(mediaPreview.file, mediaPreview.type, inputMessage || undefined);
      setMediaPreview(null);
      setInputMessage('');
    } else if (inputMessage.trim()) {
      await sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
  };

  const handleMediaSelect = (file: File, type: 'image' | 'video' | 'audio') => {
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type, file });
  };

  const handleRemoveMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
  };

  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
        <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Selecione um lead</p>
        <p className="text-sm">Clique em "Conversa" para abrir o chat</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <p className="font-medium truncate">{lead.name}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {formatBrazilianPhone(lead.phone)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Comece a conversa abaixo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.is_from_me ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    message.is_from_me
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message_text}
                  </p>
                  <div
                    className={cn(
                      'flex items-center gap-2 mt-1',
                      message.is_from_me
                        ? 'justify-end text-primary-foreground/70'
                        : 'justify-end text-muted-foreground'
                    )}
                  >
                    <span className="text-xs">
                      {format(new Date(message.sent_at), 'HH:mm', {
                        locale: ptBR,
                      })}
                    </span>
                    {message.is_from_me && (
                      <span className="text-xs">
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && '✓✓'}
                        {message.status === 'failed' && '✗'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t space-y-3 bg-card">
        {mediaPreview && (
          <div className="relative inline-block">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMedia}
            >
              <X className="h-3 w-3" />
            </Button>
            {mediaPreview.type === 'image' && (
              <div className="relative">
                <ImageIcon className="absolute top-2 left-2 h-4 w-4 text-white drop-shadow-lg" />
                <img
                  src={mediaPreview.url}
                  alt="Preview"
                  className="max-h-24 rounded-lg border"
                />
              </div>
            )}
            {mediaPreview.type === 'video' && (
              <div className="relative">
                <Video className="absolute top-2 left-2 h-4 w-4 text-white drop-shadow-lg" />
                <video
                  src={mediaPreview.url}
                  className="max-h-24 rounded-lg border"
                  controls
                />
              </div>
            )}
            {mediaPreview.type === 'audio' && (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted">
                <Volume2 className="h-4 w-4" />
                <audio src={mediaPreview.url} controls className="h-8" />
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2 items-end">
          <MediaInput
            onEmojiSelect={handleEmojiSelect}
            onMediaSelect={handleMediaSelect}
            disabled={sending}
          />
          <Input
            placeholder="Digite sua mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={sending || (!inputMessage.trim() && !mediaPreview)}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
