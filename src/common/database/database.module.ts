import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { CounterService } from './counter.service';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { WishEntity, WishSchema } from '../../modules/wishes/schemas/wish.schema';
import { RsvpEntity, RsvpSchema } from '../../modules/rsvp/schemas/rsvp.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Counter.name, schema: CounterSchema },
      { name: WishEntity.name, schema: WishSchema },
      { name: RsvpEntity.name, schema: RsvpSchema },
    ]),
  ],
  providers: [DatabaseService, CounterService],
  exports: [DatabaseService, CounterService, MongooseModule],
})
export class DatabaseModule {}
