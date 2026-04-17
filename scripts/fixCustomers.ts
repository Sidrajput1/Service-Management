import mongoose from "mongoose";
// import Customer from "@/models/customer";
// import User from "@/models/user";
// import Booking from "@/models/booking";
// import { connectToDb } from "@/lib/db";

import Customer from "../models/customer"
import User from "../models/user"
import Booking from "../models/booking"
//const mongoose = require('mongoose');

async function fixCustomers() {
  await mongoose.connect(
    "mongodb+srv://shekharsidharth7_db_user:8GA9wIqKXrsREZHi@cluster0.t8n899l.mongodb.net/",
  );

  //await connectToDb();

  const customers = await Customer.find();

  for (const customer of customers) {
    if (!customer.userId && customer.phone) {
      const user = await User.findOne({ phone: customer.phone });

      if (user) {
        console.log(`Fixing customer ${customer._id}`);

        // attach userId
        customer.userId = user._id;
        await customer.save();
      }
    }
  }

  console.log("Customer fixed");
  process.exit();
}

fixCustomers();
