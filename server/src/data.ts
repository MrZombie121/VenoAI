import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { Plan } from './types';
import { readDb, writeDb } from './db';

export interface User {
  id: string;
  email: string;
  nickname: string;
  loginId: string;
  verified: boolean;
  code?: string;
  coins: number;
  plan: Plan;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

interface Database {
  users: User[];
  chats: Chat[];
  messages: ChatMessage[];
}

const defaultDb: Database = {
  users: [],
  chats: [],
  messages: []
};

function loadDb(): Database {
  return readDb(defaultDb);
}

function saveDb(db: Database): void {
  writeDb(db);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function hashPassword(pw: string) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

export function findUserByEmail(email: string): User | undefined {
  const db = loadDb();
  return db.users.find((user) => user.email === normalize(email));
}

export function findUserByNickname(nickname: string): User | undefined {
  const db = loadDb();
  const needle = normalize(nickname);
  return db.users.find((user) => normalize(user.nickname) === needle);
}

export function findUserByLogin(login: string): User | undefined {
  const db = loadDb();
  const needle = normalize(login);
  return db.users.find((user) => user.email === needle || normalize(user.nickname) === needle);
}

export function createUser(email: string, password: string, nickname: string): User {
  const db = loadDb();
  const normalizedEmail = normalize(email);
  const normalizedNickname = normalize(nickname);
  if (db.users.some((user) => user.email === normalizedEmail)) {
    throw new Error('email_exists');
  }
  if (db.users.some((user) => normalize(user.nickname) === normalizedNickname)) {
    throw new Error('nickname_exists');
  }

  const u: User = {
    id: uuid(),
    email: normalizedEmail,
    nickname: nickname.trim(),
    loginId: hashPassword(password),
    verified: false,
    coins: 0,
    plan: 'free'
  };
  db.users.push(u);
  saveDb(db);
  return u;
}

export function saveCode(login: string, code: string): void {
  const db = loadDb();
  const user = db.users.find((u) => u.email === normalize(login) || normalize(u.nickname) === normalize(login));
  if (user) {
    user.code = code;
    saveDb(db);
  }
}

export function verifyCode(login: string, code: string): boolean {
  const db = loadDb();
  const user = db.users.find((u) => u.email === normalize(login) || normalize(u.nickname) === normalize(login));
  if (!user) return false;
  const ok = user.code === code;
  if (ok) {
    user.verified = true;
    delete user.code;
    saveDb(db);
  }
  return ok;
}

export function debitCoins(email: string, amount: number) {
  const db = loadDb();
  const user = db.users.find((u) => u.email === normalize(email));
  if (!user) throw new Error('user');
  if (user.coins < amount) throw new Error('funds');
  user.coins -= amount;
  saveDb(db);
}

export function setPlan(email: string, plan: Plan) {
  const db = loadDb();
  const user = db.users.find((u) => u.email === normalize(email));
  if (!user) throw new Error('user');
  user.plan = plan;
  saveDb(db);
}

export function grantCoins(email: string, amount: number) {
  const db = loadDb();
  const user = db.users.find((u) => u.email === normalize(email));
  if (!user) throw new Error('user');
  user.coins += amount;
  saveDb(db);
}

export function listChatsByUser(userId: string): Chat[] {
  const db = loadDb();
  return db.chats.filter((chat) => chat.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listMessagesByChat(userId: string, chatId: string): ChatMessage[] {
  const db = loadDb();
  const chat = db.chats.find((item) => item.id === chatId && item.userId === userId);
  if (!chat) return [];
  return db.messages.filter((msg) => msg.chatId === chatId).sort((a, b) => a.at - b.at);
}

export function ensureChat(userId: string, chatId: string, title: string): Chat {
  const db = loadDb();
  const existing = db.chats.find((chat) => chat.id === chatId && chat.userId === userId);
  if (existing) return existing;
  const now = Date.now();
  const chat: Chat = {
    id: chatId,
    userId,
    title,
    createdAt: now,
    updatedAt: now
  };
  db.chats.push(chat);
  saveDb(db);
  return chat;
}

export function touchChat(userId: string, chatId: string, title?: string): void {
  const db = loadDb();
  const chat = db.chats.find((item) => item.id === chatId && item.userId === userId);
  if (!chat) return;
  if (title && chat.title !== title) {
    chat.title = title;
  }
  chat.updatedAt = Date.now();
  saveDb(db);
}

export function addMessage(userId: string, chatId: string, role: 'user' | 'assistant', text: string): ChatMessage {
  const db = loadDb();
  const msg: ChatMessage = {
    id: uuid(),
    chatId,
    userId,
    role,
    text,
    at: Date.now()
  };
  db.messages.push(msg);
  saveDb(db);
  return msg;
}

export function seedDemo() {
  const db = loadDb();
  if (!db.users.some((user) => user.email === 'demo@veno.ai')) {
    const u: User = {
      id: uuid(),
      email: 'demo@veno.ai',
      nickname: 'demo',
      loginId: hashPassword('password123'),
      verified: true,
      coins: 100,
      plan: 'free'
    };
    db.users.push(u);
    saveDb(db);
  }
}
