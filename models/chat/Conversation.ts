import mongoose ,{Schema,Model} from "mongoose";

export interface IConversationParticipant {
  userId: mongoose.Types.ObjectId;
  role: "admin" | "dispatcher" | "technician" | "customer";
  joinedAt: Date;
  lastReadAt?: Date | null;
  unreadCount: number;
}

export interface IConversation {
  type: "job" | "direct" | "support";
  jobId?: mongoose.Types.ObjectId | null;
  bookingId?: mongoose.Types.ObjectId | null;
  subject?: string | null;
  participantKey?: string;
  participants: IConversationParticipant[];
  lastMessageId?: mongoose.Types.ObjectId | null;
  lastMessageText?: string | null;
  lastMessageSenderId?: mongoose.Types.ObjectId | null;
  lastMessageSenderRole?: string | null;
  lastMessageAt?: Date | null;
  createdByUserId?: mongoose.Types.ObjectId | null;
  createdByRole?: string | null;
  isArchived?: boolean;
  isClosed?: boolean;
};

const ConversationParticipantSchema  = new Schema<IConversationParticipant>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["admin", "dispatcher", "technician", "customer"],
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: null },
    unreadCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ["job", "direct", "support"],
      default: "direct",
      index: true,
    },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", index: true, default: null },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true, default: null },
    subject: { type: String, default: null },
    participantKey: { type: String, unique: true, sparse: true, index: true },

    participants: { type: [ConversationParticipantSchema], default: [] },

    lastMessageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    lastMessageText: { type: String, default: null },
    lastMessageSenderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastMessageSenderRole: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByRole: { type: String, default: null },

    isArchived: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);


ConversationSchema.index({jobId:1, type:1});

ConversationSchema.index({ "participants.userId": 1, lastMessageAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;