import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { coinApi } from '../api/client';

interface Obj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const session = useStore((s) => s.session);
  const setSession = useStore((s) => s.setSession);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 360;
    canvas.width = W;
    canvas.height = H;

    let player: Obj = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 12 };
    let obstacles: Obj[] = Array.from({ length: 6 }, () => spawn());
    let running = true;
    let last = performance.now();
    let currentScore = 0;

    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = e.type === 'keydown';
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    function spawn(): Obj {
      const edge = Math.random() > 0.5 ? 0 : 1;
      const x = edge ? Math.random() * W : Math.random() > 0.5 ? 0 : W;
      const y = edge ? (Math.random() > 0.5 ? 0 : H) : Math.random() * H;
      const r = 10 + Math.random() * 16;
      const vx = (Math.random() * 1.6 - 0.8) * 1.5;
      const vy = (Math.random() * 1.6 - 0.8) * 1.5;
      return { x, y, vx, vy, r };
    }

    function reset() {
      player = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 12 };
      obstacles = Array.from({ length: 6 }, () => spawn());
      currentScore = 0;
      setScore(0);
    }

    function loop(now: number) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const accel = 260;
      if (keys['w'] || keys['arrowup']) player.vy -= accel * dt;
      if (keys['s'] || keys['arrowdown']) player.vy += accel * dt;
      if (keys['a'] || keys['arrowleft']) player.vx -= accel * dt;
      if (keys['d'] || keys['arrowright']) player.vx += accel * dt;

      player.vx *= 0.92;
      player.vy *= 0.92;
      player.x = Math.min(W - player.r, Math.max(player.r, player.x + player.vx * dt));
      player.y = Math.min(H - player.r, Math.max(player.r, player.y + player.vy * dt));

      obstacles.forEach((o) => {
        o.x += o.vx * dt * 60;
        o.y += o.vy * dt * 60;
        if (o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40) {
          Object.assign(o, spawn());
        }
      });

      currentScore += Math.floor(dt * 60 * 2);
      setScore(currentScore);

      // TS: assert ctx is non-null using narrowing above; keep local reference
      const g = ctx as CanvasRenderingContext2D;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#070910';
      g.fillRect(0, 0, W, H);

      g.strokeStyle = 'rgba(124,245,255,0.35)';
      g.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        g.beginPath();
        g.arc(W / 2, H / 2, 30 + i * 18, 0, Math.PI * 2);
        g.stroke();
      }

      g.fillStyle = '#7cf5ff';
      g.beginPath();
      g.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = '#ff8ed4';
      obstacles.forEach((o) => {
        g.beginPath();
        g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        g.fill();
      });

      // collision
      for (const o of obstacles) {
        const dx = o.x - player.x;
        const dy = o.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < o.r + player.r) {
          setBest((b) => Math.max(b, currentScore));
          reward(currentScore);
          reset();
          break;
        }
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    return () => {
      running = false;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  const reward = async (scoreValue: number) => {
    if (!session.token) return;
    try {
      const res = await coinApi.reward(session.token, scoreValue);
      setSession({ coins: res.coins });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1rem' }}>
      <div className="glass neo-card" style={{ padding: '1.2rem 1.5rem' }}>
        <h2 style={{ margin: 0 }}>Mini-game: Orbit Dodge</h2>
        <p style={{ marginTop: 4, color: 'var(--muted)' }}>Stay alive, dodge pulses, earn VCoins on milestones.</p>
        <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--accent)' }}>
          <span>Score {score}</span>
          <span>Best {best}</span>
        </div>
      </div>
      <div className="glass neo-card" style={{ padding: '1rem', display: 'grid', placeItems: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 960, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Controls: WASD or arrows.</div>
      </div>
    </div>
  );
}
