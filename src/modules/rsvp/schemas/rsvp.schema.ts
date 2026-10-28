import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RSVPStatus } from '../interfaces/rsvp.interface';

export type RsvpDocument = RsvpEntity & Document;

@Schema({ collection: 'rsvp', timestamps: false })
export class RsvpEntity {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: '' })
  message: string;

  @Prop({ type: String, required: true, enum: ['attending', 'not-attending', 'maybe'] })
  status: RSVPStatus;

  @Prop({ type: String, required: true })
  createdAt: string;
}

export const RsvpSchema = SchemaFactory.createForClass(RsvpEntity);
