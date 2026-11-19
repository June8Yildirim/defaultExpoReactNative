import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  },
})
export class Invitation {
  /** Firebase uid of the user who created the invitation. */
  @Prop({ required: true, index: true })
  ownerUid: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true })
  eventDate: Date;

  @Prop({ trim: true, maxlength: 300 })
  location?: string;

  @Prop({ trim: true, maxlength: 5_000 })
  message?: string;
}

export type InvitationDocument = HydratedDocument<Invitation>;
export const InvitationSchema = SchemaFactory.createForClass(Invitation);
