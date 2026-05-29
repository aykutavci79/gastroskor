'use client';

import { FormEvent, useMemo, useState } from 'react';

export type ConversationSender = 'user' | 'restaurant' | 'system';

export type ConversationMessage = {
  id: string;
  senderType: ConversationSender;
  senderName: string;
  text: string;
  createdAt: string;
};

type Props = {
  messages: ConversationMessage[];
  onSend: (payload: { text: string; senderType: 'restaurant' }) => Promise<void> | void;
  disabled?: boolean;
};

function formatTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function FeedbackConversationPanel({ messages, onSend, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend({ text: trimmed, senderType: 'restaurant' });
      setText('');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-input p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-content-muted">Mesajlaşma</h3>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {sortedMessages.map((msg) => {
          const isRestaurant = msg.senderType === 'restaurant';
          const isSystem = msg.senderType === 'system';
          return (
            <div key={msg.id} className={`flex ${isRestaurant ? 'justify-end' : 'justify-start'}`}>
              <article
                className={`max-w-[85%] rounded-2xl border px-3 py-2 ${
                  isSystem
                    ? 'border-border/50 bg-surface-input/70 text-content-muted'
                    : isRestaurant
                      ? 'border-success/40 bg-success/15 text-success'
                      : 'border-border/80 bg-surface/90 text-content'
                }`}>
                <p className="text-xs font-semibold">{msg.senderName}</p>
                <p className="mt-1 text-sm leading-6">{msg.text}</p>
                <p className="mt-1 text-[11px] text-content-muted">{formatTime(msg.createdAt)}</p>
              </article>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isSending}
          rows={3}
          placeholder="Müşteriye çözüm mesajı yazın..."
          className="w-full rounded-2xl border border-border bg-surface/90 px-3 py-2 text-sm text-content outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || isSending || text.trim().length === 0}
          className="btn-primary btn-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
          {isSending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
        </button>
      </form>
    </section>
  );
}

