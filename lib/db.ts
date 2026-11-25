import mongoose from "mongoose";

// console.log("[DB Module Loaded]", {
//   hasMongoUri: Boolean(process.env.MONGODB_URI),
//   pid: process.pid,
// });

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDb() {
  //   console.log("[DB Connection Called]", {
  //   hasMongoUri: Boolean(process.env.MONGODB_URI),
  //   pid: process.pid,
  // });

  // console.trace("[DB Call Trace]");
  if (cached.conn) {
    return cached.conn;
  }

  // Read the environment variable at runtime,
  // not when this module is imported during `next build`.
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required at runtime");
  }
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      // useNewUrlParser: true, // TS types already default
      // useUnifiedTopology: true,
      // set other options if needed
    };
    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        //  console.log("[MongoDB] Successfully connected:", {
        // readyState: mongooseInstance.connection.readyState,
        // database: mongooseInstance.connection.name,
        // host: mongooseInstance.connection.host,
        //});
        return mongooseInstance;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
