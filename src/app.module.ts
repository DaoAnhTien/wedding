import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { WishesModule } from './modules/wishes/wishes.module';
import { RsvpModule } from './modules/rsvp/rsvp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'atlas-credentials.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri =
          configService.get<string>('MONGODB_URI') ||
          process.env.MONGODB_URI ||
          'mongodb://127.0.0.1:27017/wedding';
        return {
          uri,
          dbName: 'wedding',
        };
      },
    }),
    DatabaseModule,
    HealthModule,
    WishesModule,
    RsvpModule,
  ],
})
export class AppModule { }
