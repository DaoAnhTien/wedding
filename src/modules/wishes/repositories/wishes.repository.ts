import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishEntity, WishDocument } from '../schemas/wish.schema';
import { Wish, PaginatedResult } from '../interfaces/wish.interface';
import { IWishesRepository } from '../interfaces/wishes-repository.interface';
import { CounterService } from '../../../common/database/counter.service';

@Injectable()
export class WishesRepository implements IWishesRepository {
  constructor(
    @InjectModel(WishEntity.name)
    private readonly wishModel: Model<WishDocument>,
    @Inject(CounterService)
    private readonly counterService: CounterService,
  ) { }

  async findAll(limit: number, offset: number): Promise<PaginatedResult<Wish>> {
    const [items, total] = await Promise.all([
      this.wishModel
        .find({})
        .select('-_id -__v')
        .sort({ id: -1 })
        .skip(offset)
        .limit(limit)
        .lean<Wish[]>(),
      this.wishModel.countDocuments(),
    ]);

    return { items, total };
  }

  async findById(id: number): Promise<Wish | null> {
    const row = await this.wishModel.findOne({ id }).select('-_id -__v').lean<Wish>();
    return row ?? null;
  }

  async create(name: string, message: string): Promise<Wish> {
    const id = await this.counterService.getNextSequence('wish_id');
    const createdAt = new Date().toISOString();

    const created = await this.wishModel.create({
      id,
      name,
      message,
      createdAt,
    });

    return {
      id: created.id,
      name: created.name,
      message: created.message,
      createdAt: created.createdAt,
    };
  }

  async update(id: number, name: string, message: string): Promise<Wish | null> {
    const updated = await this.wishModel.findOneAndUpdate(
      { id },
      { $set: { name, message } },
      { returnDocument: 'after', projection: '-_id -__v' },
    ).lean<Wish>();

    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.wishModel.deleteOne({ id });
    return (result.deletedCount ?? 0) > 0;
  }
}
