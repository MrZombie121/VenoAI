import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ChatUI } from '../components/ChatUI';
import { useStore } from '../state/store';
import { v4 as uuid } from 'uuid';
import { chatApi } from '../api/client';

export default function Chat() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = useMemo(() => params.get('id') ?? uuid(), [params]);
  const chats = useStore((s) => s.chats);
  const chatMeta = useStore((s) => s.chatMeta);
  const setChatMeta = useStore((s) => s.setChatMeta);
  const setChatMetaBatch = useStore((s) => s.setChatMetaBatch);
  const setChatMessages = useStore((s) => s.setChatMessages);
  const session = useStore((s) => s.session);
  const list = Object.values(chatMeta).sort((a, b) => b.updatedAt - a.updatedAt);
  const [model, setModel] = useState('veno-1.0-free');

  useEffect(() => {
    if (!session.token) return;
    chatApi.list(session.token).then((items) => {
      setChatMetaBatch(items);
    }).catch(() => null);
  }, [session.token, setChatMetaBatch]);

  useEffect(() => {
    if (!session.token || !id) return;
    if (!chats[id]) {
      chatApi.messages(session.token, id).then((items) => {
        setChatMessages(id, items);
      }).catch(() => null);
    }
    if (!chatMeta[id]) {
      setChatMeta(id, 'New chat');
    }
  }, [session.token, id, chats, chatMeta, setChatMessages, setChatMeta]);

  const createNewChat = () => {
    navigate(`/chat?id=${uuid()}`);
  };

  return (
    <div className="chat-shell">
      <aside className="glass neo-card chat-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Chats</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Your sessions</div>
          </div>
          <button onClick={createNewChat} style={{ padding: '0.55rem 0.9rem', borderRadius: 10 }}>New chat</button>
        </div>
        <div className="chat-sidebar-list">
          {list.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No chats yet.</div>
          )}
          {list.map((chat) => (
            <Link
              key={chat.id}
              to={`/chat?id=${chat.id}`}
              className="chat-sidebar-item"
              style={{
                background: chat.id === id ? 'rgba(255,255,255,0.09)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '0.7rem 0.85rem'
              }}
            >
              <div style={{ fontWeight: 600 }}>{chat.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Resume chat</div>
            </Link>
          ))}
        </div>
      </aside>
      <section className="chat-main">
        <div className="glass neo-card chat-topbar">
          <div>
            <div style={{ fontWeight: 700 }}>{chatMeta[id]?.title || 'New chat'}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Conversing with {model}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <select value={model} onChange={(e) => setModel(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="veno-1.0-free">veno-1.0-free</option>
              <option value="veno-markov">veno-markov</option>
            </select>
            <Link to="/game" style={{ padding: '0.45rem 0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Mini-game
            </Link>
            <Link to="/settings" style={{ padding: '0.45rem 0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Settings
            </Link>
            <Link to="/profile" style={{ padding: '0.45rem 0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Profile
            </Link>
          </div>
        </div>
        <div className="chat-body">
          <ChatUI chatId={id} model={model} />
        </div>
      </section>
    </div>
  );
}
