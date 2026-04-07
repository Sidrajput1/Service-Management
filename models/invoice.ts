// models/Invoice.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "cancelled";

export interface IInvoiceItem {
  itemType: "service" | "part" | "visit" | "discount" | "other";
  description:string;
  qty:number;
  unitPrice:number;
  amount:number;
  taxable?:boolean;
  meta?:Record<string,any>
}

export interface IInvoice extends Document {
  

   invoiceNumber: string;
  jobId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;

  status: InvoiceStatus;

  currency: string;
  items: IInvoiceItem[];

  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;

  amountPaid: number;
  balanceDue: number;

  notes?: string;
  issuedAt?: Date;
  dueDate?: Date;
  finalizedAt?: Date;

  razorpayOrderId?: string;
razorpayPaymentLinkId?: string;
razorpayPaymentId?: string;
razorpayReferenceId?: string;
paymentMethod?: string;
paymentReceivedAt?: Date;

  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    itemType:{
      type:String,
      enum:["service","part","visit","discount","other"],
      required:true,
    },
    description:{type:String,required:true},
    qty: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 },
    taxable: { type: Boolean, default: true },
    meta: Schema.Types.Mixed,
  },
  {
    _id:false
  }
)

const InvoiceSchema = new Schema<IInvoice>(
  {
     invoiceNumber: { type: String, required: true, index: true, unique: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    createdBy:{type:Schema.Types.ObjectId,ref:"User"},

    status:{
      type:String,
      enum:["draft","issued","partial","paid","cancelled"],
      default:"draft",
    },
    currency:{type:String,default:"INR"},
    items:{type:[InvoiceItemSchema],default:[]},
    subtotal: {type:Number,default:0},
    taxPercent: {type:Number , default:0},
    taxAmount:{type:Number,default:0},
    grandTotal: { type: Number, default: 0 },

    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    notes: String,
    issuedAt: Date,
    dueDate: Date,
    finalizedAt: Date,
    razorpayOrderId: { type: String, index: true },
razorpayPaymentLinkId: { type: String, index: true },
razorpayPaymentId: { type: String, index: true },
razorpayReferenceId: { type: String, index: true },
paymentMethod: String,
paymentReceivedAt: Date,

    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;