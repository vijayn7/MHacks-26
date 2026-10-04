import { api, post } from './api';

export type CheckInResult = {
  id: string;
  status: 'sent' | 'replied';
  reply: string | null;
  waiting?: boolean;
};

export function sendCheckIn(id: string, friendName: string) {
  return post<CheckInResult>('/check-in', { id, friendName });
}

export function fetchCheckIn(id: string) {
  return api<CheckInResult>(`/check-in?id=${encodeURIComponent(id)}`);
}
