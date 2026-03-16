import mongoose , {Schema,Document,Model} from 'mongoose';

export interface ILead extends Document {
    name?: string;
  phone?: string;
  email?: string;
  serviceRequested?: string;
  source?: string; // whatsapp, ads, call, website, walkin
  sourceDetails?: Record<string, any>;
  status: "new" | "contacted" | "interested" | "quotation_sent" | "booked" | "not_interested";
  assignedTo?: mongoose.Types.ObjectId; // user id (dispatcher)
  convertedToCustomerId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: String,
    phone: String,
    email: String,
    serviceRequested: String,
    source: String,
    sourceDetails: Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["new", "contacted", "interested", "quotation_sent", "booked", "not_interested"],
      default: "new",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    convertedToCustomerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    remarks: String,
  },
  { timestamps: true }
);

export const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
export default Lead;