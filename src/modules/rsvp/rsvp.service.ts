import { Injectable, Inject } from '@nestjs/common';
import { RSVP_REPOSITORY } from '../../common/constants/injection-tokens';
import { IRsvpRepository } from './interfaces/rsvp-repository.interface';
import { RSVPEntry } from './interfaces/rsvp.interface';
import { PaginatedResult } from '../wishes/interfaces/wish.interface';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

@Injectable()
export class RsvpService {
  constructor(
    @Inject(RSVP_REPOSITORY)
    private readonly rsvpRepository: IRsvpRepository,
  ) {}

  async getRsvpList(limit: number, offset: number): Promise<PaginatedResult<RSVPEntry>> {
    return this.rsvpRepository.findAll(limit, offset);
  }

  async createRsvp(dto: CreateRsvpDto): Promise<RSVPEntry> {
    const message = dto.message ?? '';
    return this.rsvpRepository.create(dto.name, message, dto.status);
  }
}
