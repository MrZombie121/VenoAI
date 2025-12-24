import create from 'zustand';

export type Plan = 'free' | 'plus' | 'extended';
export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  text: string;
  at: number;
}

interface Session {
  token: string | null;
  email: string | null;
  nickname: string | null;
  userId: string | null;
  verified: boolean;
  coins: number;
  plan: Plan;
}

export interface ChatMeta {
  id: string;
  title: string;
  updatedAt: number;
}

interface StoreState {
  session: Session;
  setSession: (partial: Partial<Session>) => void;
  clearSession: () => void;
  chats: Record<string, Message[]>;
  chatMeta: Record<string, ChatMeta>;
  upsertMessage: (chatId: string, msg: Message) => void;
  setChatMessages: (chatId: string, messages: Message[]) => void;
  setChatMeta: (chatId: string, title: string, updatedAt?: number) => void;
  setChatMetaBatch: (meta: ChatMeta[]) => void;
  resetChat: (chatId: string) => void;
}

const emptySession: Session = {
  token: null,
  email: null,
  nickname: null,
  userId: null,
  verified: false,
  coins: 0,
  plan: 'free'
};

export const useStore = create<StoreState>((set) => ({
  session: emptySession,
  setSession: (partial) => set((state) => ({
    session: { ...state.session, ...partial }
  })),
  clearSession: () => set({ session: emptySession }),
  chats: {},
  chatMeta: {},
  upsertMessage: (chatId, msg) => set((state) => {
    const history = state.chats[chatId] || [];
    return { chats: { ...state.chats, [chatId]: [...history, msg] } };
  }),
  setChatMessages: (chatId, messages) => set((state) => ({
    chats: { ...state.chats, [chatId]: messages }
  })),
  setChatMeta: (chatId, title, updatedAt = Date.now()) => set((state) => ({
    chatMeta: { ...state.chatMeta, [chatId]: { id: chatId, title, updatedAt } }
  })),
  setChatMetaBatch: (meta) => set((state) => {
    const next = { ...state.chatMeta };
    for (const item of meta) {
      next[item.id] = item;
    }
    return { chatMeta: next };
  }),
  resetChat: (chatId) => set((state) => {
    const next = { ...state.chats };
    delete next[chatId];
    return { chats: next };
  })
}));
