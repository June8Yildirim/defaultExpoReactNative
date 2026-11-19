import { type InferSchemaType, Schema, model } from 'mongoose';

const invitationSchema = new Schema(
  {
    /** Firebase uid of the user who created the invitation. */
    ownerUid: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    eventDate: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 300 },
    message: { type: String, trim: true, maxlength: 5_000 },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

export type Invitation = InferSchemaType<typeof invitationSchema>;
export const InvitationModel = model('Invitation', invitationSchema);
