import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RsvpEntity, RsvpDocument } from '../schemas/rsvp.schema';
import { RSVPEntry, RSVPStatus } from '../interfaces/rsvp.interface';
import { IRsvpRepository } from '../interfaces/rsvp-repository.interface';
import { PaginatedResult } from '../../wishes/interfaces/wish.interface';
import { CounterService } from '../../../common/database/counter.service';

@Injectable()
export class RsvpRepository implements IRsvpRepository {
  constructor(
    @InjectModel(RsvpEntity.name)
    private readonly rsvpModel: Model<RsvpDocument>,
    @Inject(CounterService)
    private readonly counterService: CounterService,
  ) {}

  async findAll(limit: number, offset: number): Promise<PaginatedResult<RSVPEntry>> {
    const [items, total] = await Promise.all([
      this.rsvpModel
        .find({})
        .select('-_id -__v')
        .sort({ id: -1 })
        .skip(offset)
        .limit(limit)
        .lean<RSVPEntry[]>(),
      this.rsvpModel.countDocuments(),
    ]);

    return { items, total };
  }

  async create(name: string, message: string, status: RSVPStatus): Promise<RSVPEntry> {
    const id = await this.counterService.getNextSequence('rsvp_id');
    const createdAt = new Date().toISOString();

    const created = await this.rsvpModel.create({
      id,
      name,
      message,
      status,
      createdAt,
    });

    return {
      id: created.id,
      name: created.name,
      message: created.message,
      status: created.status,
      createdAt: created.createdAt,
    };
  }
}
