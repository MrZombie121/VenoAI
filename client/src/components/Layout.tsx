import { useStore } from '../state/store';

export function Layout({ children }: { children: React.ReactNode }) {
  const session = useStore((s) => s.session);
  const displayName = session.nickname || session.email || 'Guest';

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="grid-bg" />
      <header style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(150deg, var(--accent), var(--accent-2))', boxShadow: 'var(--glow)' }} />
          <span>VenoAI</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.95rem', color: 'var(--muted)' }}>
          <span>{displayName}</span>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: 10, background: 'rgba(124,245,255,0.12)', color: 'var(--accent)' }}>
            {session.plan.toUpperCase()} - {session.coins} VCoins
          </span>
        </div>
      </header>
      <main style={{ padding: '0 1.5rem 2rem 1.5rem' }}>{children}</main>
    </div>
  );
}

