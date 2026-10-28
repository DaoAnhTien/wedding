import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './schemas/counter.schema';

@Injectable()
export class CounterService {
  constructor(
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  async getNextSequence(name: string): Promise<number> {
    const counter = await this.counterModel.findByIdAndUpdate(
      name,
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true },
    );
    return counter.seq;
  }

  async setSequenceIfGreater(name: string, value: number): Promise<void> {
    const current = await this.counterModel.findById(name);
    if (!current || current.seq < value) {
      await this.counterModel.findByIdAndUpdate(
        name,
        { $set: { seq: value } },
        { upsert: true },
      );
    }
  }
}
