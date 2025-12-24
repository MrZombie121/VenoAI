import axios from 'axios';
import { Plan } from '../state/store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

export interface AuthResponse {
  token: string;
  email: string;
  nickname: string | null;
  userId: string;
  coins: number;
  plan: Plan;
  verified: boolean;
}

export const authApi = {
  register: async (email: string, password: string, nickname: string) => {
    await api.post('/auth/register', { email, password, nickname });
  },
  login: async (login: string, password: string) => {
    await api.post('/auth/login', { login, password });
  },
  verify: async (login: string, code: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/verify', { login, code });
    return res.data;
  },
  me: async (token: string): Promise<AuthResponse> => {
    const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  }
};

export const aiApi = {
  complete: async (token: string, prompt: string, model?: string, chatId?: string): Promise<string> => {
    const res = await api.post(
      '/ai/complete',
      { prompt, model, chatId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.reply as string;
  }
};

export const chatApi = {
  list: async (token: string) => {
    const res = await api.get('/chats', { headers: { Authorization: `Bearer ${token}` } });
    return res.data as { id: string; title: string; updatedAt: number }[];
  },
  messages: async (token: string, chatId: string) => {
    const res = await api.get(`/chats/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data as { id: string; role: 'user' | 'assistant'; text: string; at: number }[];
  }
};

export const coinApi = {
  balance: async (token: string) => {
    const res = await api.get('/coins/balance', { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  },
  purchase: async (token: string, plan: Plan) => {
    const res = await api.post('/coins/purchase', { plan }, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  },
  reward: async (token: string, score: number) => {
    const res = await api.post(
      '/game/reward',
      { score },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  }
};
