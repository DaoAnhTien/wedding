import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RsvpController } from './rsvp.controller';
import { RsvpService } from './rsvp.service';
import { RsvpRepository } from './repositories/rsvp.repository';
import { RSVP_REPOSITORY } from '../../common/constants/injection-tokens';
import { RsvpEntity, RsvpSchema } from './schemas/rsvp.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RsvpEntity.name, schema: RsvpSchema },
    ]),
  ],
  controllers: [RsvpController],
  providers: [
    RsvpService,
    {
      provide: RSVP_REPOSITORY,
      useClass: RsvpRepository,
    },
  ],
  exports: [RsvpService, RSVP_REPOSITORY],
})
export class RsvpModule {}
