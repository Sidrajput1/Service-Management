import mongoose, { Schema } from "mongoose";

export type Role = "admin" | "dispatcher" | "technician" | "customer";

const UserSchema = new mongoose.Schema(
  {
  //   clerkId: { type: String, index: true },
  //   name: { type: String, required: true },
  //   email: { type: String },
  //   phone: { type: String, index: true },
  //   role: {
  //     type: String,
  //     enum: ["admin", "dispatcher", "technician", "customer"],
  //     default: "customer",
  //   },
  //   metadata: { type: Schema.Types.Mixed },
  // },
  // { timestamps: true },
  name: {
    type:String,
    trim:true,
  },
  email: {
    type: String,
    unique: true,
    sparse:true,
    lowercase:true,
    required: true,
    trim:true,
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    ////enum: ["admin","dispatcher","technician","customer"],
    enum: [
        "admin",
        "dispatcher",
        "service_provider",
        "technician",
        "customer",
      ],
    default: "customer"
  },
  phone: {
    type:String,
    required:false,
    trim:true,
    default:null
  },
  isActive: {
      type: Boolean,
      default: true,
    },
},
{ timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
