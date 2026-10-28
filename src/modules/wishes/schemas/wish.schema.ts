import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WishDocument = WishEntity & Document;

@Schema({ collection: 'wishes', timestamps: false })
export class WishEntity {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true })
  createdAt: string;
}

export const WishSchema = SchemaFactory.createForClass(WishEntity);
