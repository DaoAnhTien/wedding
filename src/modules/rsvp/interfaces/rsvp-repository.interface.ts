import { RSVPEntry, RSVPStatus } from './rsvp.interface';
import { PaginatedResult } from '../../wishes/interfaces/wish.interface';

export interface IRsvpRepository {
  findAll(limit: number, offset: number): Promise<PaginatedResult<RSVPEntry>>;
  create(name: string, message: string, status: RSVPStatus): Promise<RSVPEntry>;
}
