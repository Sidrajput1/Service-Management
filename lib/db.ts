import mongoose from "mongoose";

// const MONGODB_URI = process.env.MONGODB_URI || "";

// if (!MONGODB_URI) {
//   throw new Error(
//     "Please define the MONGODB_URI environment variable inside .env.local",
//   );
// }

/**
 * Global is used here to maintain a cached connection across hot reloads in development.
 * This prevents creating multiple connections.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDb() {
  if (cached.conn) {
    return cached.conn;
  }

  // Read the environment variable at runtime,
  // not when this module is imported during `next build`.
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI environment variable is required at runtime",
    );
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
        return mongooseInstance;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
