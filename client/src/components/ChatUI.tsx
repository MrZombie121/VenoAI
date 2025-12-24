import { useEffect, useRef, useState } from 'react';
import { aiApi } from '../api/client';
import { useStore, Message } from '../state/store';
import { v4 as uuid } from 'uuid';

interface Props {
  chatId: string;
  model: string;
}

export function ChatUI({ chatId, model }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messages = useStore((s) => s.chats[chatId] || []);
  const session = useStore((s) => s.session);
  const upsertMessage = useStore((s) => s.upsertMessage);
  const setChatMeta = useStore((s) => s.setChatMeta);
  const chatMeta = useStore((s) => s.chatMeta[chatId]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const emptyTitle = useState(() => pick([
    '\u0413\u043e\u0442\u043e\u0432\u044b \u043d\u0430\u0447\u0430\u0442\u044c?',
    '\u041f\u0440\u0438\u0441\u0442\u0443\u043f\u0430\u0435\u043c',
    '\u041f\u043e\u0435\u0445\u0430\u043b\u0438!'
  ]))[0];
  const suggestions = [
    '\u041f\u0440\u0438\u0434\u0443\u043c\u0430\u0439 \u0438\u0434\u0435\u044e \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u0442\u0430\u043f\u0430',
    '\u0421\u043e\u0441\u0442\u0430\u0432\u044c \u043f\u043b\u0430\u043d \u043d\u0430 \u043d\u0435\u0434\u0435\u043b\u044e',
    '\u041d\u0430\u043f\u0438\u0448\u0438 \u043f\u043e\u0441\u0442 \u0434\u043b\u044f \u0441\u043e\u0446\u0441\u0435\u0442\u0435\u0439',
    '\u041f\u043e\u043c\u043e\u0433\u0438 \u0441 \u043a\u043e\u0434\u043e\u043c \u043d\u0430 Python',
    '\u041f\u043e\u044f\u0441\u043d\u0438 \u0442\u0435\u043c\u0443 \u043f\u0440\u043e\u0441\u0442\u044b\u043c\u0438 \u0441\u043b\u043e\u0432\u0430\u043c\u0438',
    '\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0438 \u0441\u0438\u043b\u044c\u043d\u044b\u0439 \u0441\u043b\u043e\u0433\u0430\u043d'
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || !session.token) return;
    const userMsg: Message = { id: uuid(), role: 'user', text, at: Date.now() };
    upsertMessage(chatId, userMsg);
    if (!chatMeta || chatMeta.title === 'New chat') {
      setChatMeta(chatId, formatTitle(text));
    } else {
      setChatMeta(chatId, chatMeta.title);
    }
    setInput('');
    setLoading(true);
    try {
      const reply = await aiApi.complete(session.token, userMsg.text, model, chatId);
      const aiMsg: Message = { id: uuid(), role: 'assistant', text: reply, at: Date.now() };
      upsertMessage(chatId, aiMsg);
      if (chatMeta) {
        setChatMeta(chatId, chatMeta.title);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass neo-card" style={{ padding: '1.1rem', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-title">{emptyTitle}</div>
            <div className="chat-empty-sub">\u0412\u044b\u0431\u0435\u0440\u0438 \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0443 \u0438\u043b\u0438 \u043d\u0430\u043f\u0438\u0448\u0438 \u0441\u0432\u043e\u0439 \u0437\u0430\u043f\u0440\u043e\u0441.</div>
            <div className="chat-suggestions">
              {suggestions.map((item) => (
                <button key={item} className="chat-suggestion" onClick={() => send(item)} disabled={loading}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '70%',
            padding: '0.9rem 1rem',
            borderRadius: 14,
            background: m.role === 'user' ? 'linear-gradient(140deg, var(--accent), var(--accent-2))' : 'rgba(255,255,255,0.06)',
            color: m.role === 'user' ? '#05060a' : 'var(--text)',
            boxShadow: m.role === 'user' ? '0 12px 30px rgba(124,245,255,0.25)' : 'none'
          }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 6 }}>{m.role === 'user' ? 'You' : model}</div>
            <div className="chat-message-text">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
            {model} is thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask VenoAI anything"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function formatTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean;
}

function pick(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}
