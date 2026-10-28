import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WishEntity, WishDocument } from '../../modules/wishes/schemas/wish.schema';
import { RsvpEntity, RsvpDocument } from '../../modules/rsvp/schemas/rsvp.schema';
import { CounterService } from './counter.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(WishEntity.name)
    private readonly wishModel: Model<WishDocument>,
    @InjectModel(RsvpEntity.name)
    private readonly rsvpModel: Model<RsvpDocument>,
    @Inject(CounterService)
    private readonly counterService: CounterService,
  ) {}

  async onModuleInit() {
    this.logger.log(`MongoDB connected successfully to database "${this.connection.name}"`);
    await this.migrateFromSqliteIfEmpty();
  }

  private async migrateFromSqliteIfEmpty() {
    try {
      const wishCount = await this.wishModel.countDocuments();
      if (wishCount > 0) {
        return;
      }

      const sqlitePath = resolve(process.cwd(), 'data/wedding.sqlite');
      if (!existsSync(sqlitePath)) {
        return;
      }

      this.logger.log(`Found SQLite database at ${sqlitePath}. Migrating to MongoDB Atlas...`);
      const sqlite = new DatabaseSync(sqlitePath);

      // Check wishes
      let maxWishId = 0;
      try {
        const wishes = sqlite.prepare('SELECT * FROM wishes').all() as Array<{
          id: number;
          name: string;
          message: string;
          createdAt: string;
        }>;

        if (wishes.length > 0) {
          for (const item of wishes) {
            await this.wishModel.create({
              id: item.id,
              name: item.name,
              message: item.message,
              createdAt: item.createdAt,
            });
            if (item.id > maxWishId) {
              maxWishId = item.id;
            }
          }
          await this.counterService.setSequenceIfGreater('wish_id', maxWishId);
          this.logger.log(`Migrated ${wishes.length} wishes from SQLite to MongoDB.`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not read wishes from SQLite: ${err.message}`);
      }

      // Check RSVP
      let maxRsvpId = 0;
      try {
        const rsvps = sqlite.prepare('SELECT * FROM rsvp').all() as Array<{
          id: number;
          name: string;
          message: string;
          status: 'attending' | 'not-attending' | 'maybe';
          createdAt: string;
        }>;

        if (rsvps.length > 0) {
          for (const item of rsvps) {
            await this.rsvpModel.create({
              id: item.id,
              name: item.name,
              message: item.message,
              status: item.status,
              createdAt: item.createdAt,
            });
            if (item.id > maxRsvpId) {
              maxRsvpId = item.id;
            }
          }
          await this.counterService.setSequenceIfGreater('rsvp_id', maxRsvpId);
          this.logger.log(`Migrated ${rsvps.length} RSVPs from SQLite to MongoDB.`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not read RSVP from SQLite: ${err.message}`);
      }

      sqlite.close();
    } catch (err: any) {
      this.logger.error(`Error during SQLite migration: ${err.message}`, err.stack);
    }
  }

  getConnection(): Connection {
    return this.connection;
  }
}
