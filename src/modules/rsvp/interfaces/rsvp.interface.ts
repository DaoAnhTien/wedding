export type RSVPStatus = 'attending' | 'not-attending' | 'maybe';

export interface RSVPEntry {
  id: number;
  name: string;
  message: string;
  status: RSVPStatus;
  createdAt: string;
}
