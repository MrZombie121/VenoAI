import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import 'dotenv/config';
import {
  addMessage,
  createUser,
  debitCoins,
  ensureChat,
  findUserByEmail,
  findUserByLogin,
  grantCoins,
  hashPassword,
  listChatsByUser,
  listMessagesByChat,
  saveCode,
  seedDemo,
  setPlan,
  touchChat,
  verifyCode
} from './data.js';
import { authMiddleware, sendCode, signToken } from './auth.js';
import { generateReply } from './ai/venModel.js';
import { Plan } from './types.js';

// Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
seedDemo();

function otp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  if (!email || !password || !nickname) return res.status(400).json({ error: 'missing fields' });
  const existing = findUserByEmail(email);
  let created = false;
  if (!existing) {
    try {
      createUser(email, password, nickname);
      created = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      return res.status(409).json({ error: message });
    }
  }
  if (created) {
    grantCoins(email, 100);
  }
  const code = otp();
  saveCode(email, code);
  try {
    await sendCode(email, code);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return res.status(500).json({ error: 'email_send_failed', message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'missing fields' });
  const user = findUserByLogin(login);
  if (!user || user.loginId !== hashPassword(password)) return res.status(401).json({ error: 'invalid' });
  const code = otp();
  saveCode(user.email, code);
  try {
    await sendCode(user.email, code);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return res.status(500).json({ error: 'email_send_failed', message });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const { login, code } = req.body;
  if (!login || !code) return res.status(400).json({ error: 'missing fields' });
  const ok = verifyCode(login, code);
  if (!ok) return res.status(401).json({ error: 'code' });
  const user = findUserByLogin(login);
  if (!user) return res.status(404).json({ error: 'user' });
  const token = signToken(user.email, user.plan);
  res.json({
    token,
    email: user.email,
    nickname: user.nickname,
    userId: user.id,
    coins: user.coins,
    plan: user.plan,
    verified: user.verified
  });
});

app.get('/api/auth/me', authMiddleware, (req: any, res) => {
  const user = findUserByEmail(req.user.email)!;
  const token = signToken(user.email, user.plan);
  res.json({
    token,
    email: user.email,
    nickname: user.nickname,
    userId: user.id,
    coins: user.coins,
    plan: user.plan,
    verified: user.verified
  });
});

app.post('/api/ai/complete', authMiddleware, async (req: any, res) => {
  const { prompt, model, chatId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  const user = findUserByEmail(req.user.email);
  const title = chatId ? buildChatTitle(prompt) : '';
  if (chatId && user) {
    ensureChat(user.id, chatId, title);
    addMessage(user.id, chatId, 'user', prompt);
  }
  const reply = await generateReply(prompt, model);
  if (chatId && user) {
    addMessage(user.id, chatId, 'assistant', reply);
    touchChat(user.id, chatId);
  }
  res.json({ model: model || 'veno-1.0-free', reply });
});

app.get('/api/chats', authMiddleware, (req: any, res) => {
  const user = findUserByEmail(req.user.email);
  if (!user) return res.status(404).json({ error: 'user' });
  const chats = listChatsByUser(user.id).map((chat) => ({
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt
  }));
  res.json(chats);
});

app.get('/api/chats/:id', authMiddleware, (req: any, res) => {
  const user = findUserByEmail(req.user.email);
  if (!user) return res.status(404).json({ error: 'user' });
  const messages = listMessagesByChat(user.id, req.params.id).map((msg) => ({
    id: msg.id,
    role: msg.role,
    text: msg.text,
    at: msg.at
  }));
  res.json(messages);
});

app.get('/api/coins/balance', authMiddleware, (req: any, res) => {
  const user = findUserByEmail(req.user.email)!;
  res.json({ coins: user.coins, plan: user.plan });
});

app.post('/api/coins/purchase', authMiddleware, (req: any, res) => {
  const { plan } = req.body as { plan: Plan };
  const costs: Record<Plan, number> = { free: 0, plus: 1250, extended: 5000 };
  if (!plan || !(plan in costs)) return res.status(400).json({ error: 'plan' });
  const price = costs[plan];
  try {
    if (plan !== 'free') debitCoins(req.user.email, price);
    setPlan(req.user.email, plan);
    const user = findUserByEmail(req.user.email)!;
    res.json({ coins: user.coins, plan: user.plan });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/game/reward', authMiddleware, (req: any, res) => {
  const { score } = req.body as { score: number };
  const bonus = Math.min(200, Math.floor(score / 200));
  if (bonus > 0) grantCoins(req.user.email, bonus);
  const user = findUserByEmail(req.user.email)!;
  res.json({ coins: user.coins });
});

function buildChatTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean;
}

app.get('/', (_req, res) => {
  res.send('VenoAI backend ready');
});

app.listen(PORT, () => {
  console.log(`VenoAI server running on http://localhost:${PORT}`);
});
