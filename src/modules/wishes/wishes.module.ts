import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WishesController } from './wishes.controller';
import { WishesAdminController } from './wishes-admin.controller';
import { WishesService } from './wishes.service';
import { WishesRepository } from './repositories/wishes.repository';
import { WISHES_REPOSITORY } from '../../common/constants/injection-tokens';
import { WishEntity, WishSchema } from './schemas/wish.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WishEntity.name, schema: WishSchema },
    ]),
  ],
  controllers: [WishesController, WishesAdminController],
  providers: [
    WishesService,
    {
      provide: WISHES_REPOSITORY,
      useClass: WishesRepository,
    },
  ],
  exports: [WishesService, WISHES_REPOSITORY],
})
export class WishesModule {}
