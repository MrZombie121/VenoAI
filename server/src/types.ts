export type Plan = 'free' | 'plus' | 'extended';

export interface SessionPayload {
  email: string;
  plan: Plan;
}
