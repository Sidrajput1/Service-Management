import mongoose from "mongoose";
import { getToken } from "next-auth/jwt";
import {
  resolveJobMembers,
  canReadResolvedConversation,
} from "./conversation-access.mjs";

let connection;
async function database() {
  if (!process.env.MONGODB_URI) throw new Error("Database is unavailable");
  if (mongoose.connection.readyState !== 1) {
    connection ||= mongoose.connect(process.env.MONGODB_URI).catch((error) => {
      connection = undefined;
      throw error;
    });
    await connection;
  }
  return mongoose.connection.db;
}

/** Uses the encrypted NextAuth session cookie; client identity is never read. */
export function installSocketSecurity(io, dependencies = {}) {
  const getDatabase = dependencies.database || database;
  const readToken = dependencies.getToken || getToken;
  io.emitAuthorizedJobStatus = async (jobId) => {
    if (!/^[a-f\d]{24}$/i.test(jobId)) return;
    const db = await getDatabase();
    const job = await db.collection("jobs").findOne(
      { _id: new mongoose.Types.ObjectId(jobId) },
      {
        projection: {
          bookingId: 1,
          technicianId: 1,
          status: 1,
          arrivedAt: 1,
        },
      },
    );
    if (!job) return;
    const booking = await db
      .collection("bookings")
      .findOne(
        { _id: job.bookingId },
        { projection: { customerId: 1, technicianId: 1 } },
      );
    if (!booking) return;
    const customer = await db
      .collection("customers")
      .findOne({ _id: booking.customerId }, { projection: { userId: 1 } });
    const pro = job.technicianId
      ? await db
          .collection("technicians")
          .findOne(
            { _id: job.technicianId, isActive: { $ne: false } },
            { projection: { userId: 1 } },
          )
      : null;
    const recipients = [
      { id: customer?.userId, role: "customer" },
      {
        id:
          String(booking.technicianId) === String(job.technicianId)
            ? pro?.userId
            : null,
        role: "technician",
      },
    ].filter((recipient) => recipient.id);
    if (!recipients.length) return;
    const sockets = await io
      .in(recipients.map((recipient) => `user:${recipient.id}`))
      .fetchSockets();
    const users = await db
      .collection("users")
      .find(
        {
          _id: { $in: recipients.map((recipient) => recipient.id) },
          isActive: { $ne: false },
        },
        {
          projection: { role: 1, mustChangePassword: 1, credentialVersion: 1 },
        },
      )
      .toArray();
    for (const socket of sockets) {
      const user = users.find(
        (user) => String(user._id) === String(socket.data.user?._id),
      );
      if (
        user &&
        !user.mustChangePassword &&
        socket.data.expiresAt > Date.now() &&
        (user.credentialVersion || 0) ===
          (socket.data.user.credentialVersion || 0) &&
        recipients.some(
          (recipient) =>
            String(recipient.id) === String(user._id) &&
            recipient.role === user.role,
        )
      )
        socket.emit("job:status", {
          jobId: String(job._id),
          bookingId: String(job.bookingId),
          status: job.status,
          arrivedAt: job.arrivedAt || null,
        });
    }
  };
  io.emitAuthorizedConversation = async (conversationId, event, payload) => {
    if (!/^[a-f\d]{24}$/i.test(conversationId)) return;
    const db = await getDatabase();
    const [conversation, sockets] = await Promise.all([
      db
        .collection("conversations")
        .findOne(
          { _id: new mongoose.Types.ObjectId(conversationId) },
          { projection: { participants: 1, type: 1, jobId: 1 } },
        ),
      io.in(`conversation:${conversationId}`).fetchSockets(),
    ]);
    const ids = sockets.map((socket) => socket.data.user?._id).filter(Boolean);
    const users = await db
      .collection("users")
      .find(
        { _id: { $in: ids }, isActive: { $ne: false } },
        { projection: { role: 1 } },
      )
      .toArray();
    const members = await resolveJobMembers(db, conversation);
    for (const socket of sockets) {
      const user = users.find(
        (candidate) => String(candidate._id) === String(socket.data.user?._id),
      );
      if (
        user &&
        socket.data.expiresAt > Date.now() &&
        canReadResolvedConversation(user, conversation, members)
      )
        socket.emit(event, payload);
      else socket.leave(`conversation:${conversationId}`);
    }
  };
  io.use(async (socket, next) => {
    try {
      if (!process.env.NEXTAUTH_SECRET)
        throw new Error("Missing session configuration");
      const req = socket.request;
      // NextAuth's cookie parser needs a cookie map on the Node request.
      req.cookies = Object.fromEntries(
        (req.headers.cookie || "")
          .split(";")
          .filter(Boolean)
          .map((value) => {
            const index = value.indexOf("=");
            return [
              value.slice(0, index).trim(),
              value.slice(index + 1).trim(),
            ];
          }),
      );
      const token = await readToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      const id = token?.id || token?.sub;
      if (
        !mongoose.isValidObjectId(id) ||
        !token?.exp ||
        token.exp * 1000 <= Date.now()
      )
        throw new Error("Invalid session");
      const db = await getDatabase();
      const user = await db.collection("users").findOne(
        {
          _id: new mongoose.Types.ObjectId(String(id)),
          isActive: { $ne: false },
        },
        {
          projection: {
            name: 1,
            role: 1,
            mustChangePassword: 1,
            credentialVersion: 1,
          },
        },
      );
      if (!user) throw new Error("Unknown account");
      if (
        user.mustChangePassword ||
        (user.credentialVersion || 0) !== (token.credentialVersion || 0)
      )
        throw new Error("Session requires reauthentication");
      socket.data.user = user;
      socket.data.expiresAt = token.exp * 1000;
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.data.user;
    socket.join(`user:${identity._id}`);
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.min(2147483647, Math.max(0, socket.data.expiresAt - Date.now())),
    );
    expiry.unref?.();
    const watched = new Set();

    async function authorized(conversationId) {
      if (
        !/^[a-f\d]{24}$/i.test(String(conversationId)) ||
        Date.now() >= socket.data.expiresAt
      )
        return false;
      const db = await getDatabase();
      const [user, conversation] = await Promise.all([
        db
          .collection("users")
          .findOne(
            { _id: identity._id, isActive: { $ne: false } },
            { projection: { role: 1 } },
          ),
        db
          .collection("conversations")
          .findOne(
            { _id: new mongoose.Types.ObjectId(conversationId) },
            { projection: { participants: 1, isClosed: 1, type: 1, jobId: 1 } },
          ),
      ]);
      const members = await resolveJobMembers(db, conversation);
      return Boolean(
        user && canReadResolvedConversation(user, conversation, members),
      );
    }

    socket.on("conversation:join", async (payload, callback) => {
      const conversationId = payload?.conversationId;
      const ack = typeof callback === "function" ? callback : () => {};
      try {
        if (watched.size >= 10 && !watched.has(conversationId))
          return ack({ ok: false, error: "Too many open conversations" });
        if (!(await authorized(conversationId)))
          return ack({ ok: false, error: "Conversation access denied" });
        await socket.join(`conversation:${conversationId}`);
        watched.add(conversationId);
        ack({ ok: true });
      } catch {
        ack({ ok: false, error: "Conversation unavailable" });
      }
    });
    socket.on("conversation:leave", (payload) => {
      const conversationId = payload?.conversationId;
      if (typeof conversationId !== "string") return;
      watched.delete(conversationId);
      socket.leave(`conversation:${conversationId}`);
    });
    for (const event of ["typing:start", "typing:stop"]) {
      socket.on(event, async (payload) => {
        const conversationId = payload?.conversationId;
        try {
          if (
            !watched.has(conversationId) ||
            !(await authorized(conversationId))
          )
            return;
          await io.emitAuthorizedConversation(conversationId, event, {
            conversationId,
            userId: String(identity._id),
            name: identity.name || "",
          });
        } catch {
          /* HTTP message history remains available. */
        }
      });
    }
    // Recheck connected rooms so reassignment or revoked access removes old members.
    const membershipCheck = setInterval(async () => {
      for (const conversationId of watched) {
        try {
          if (await authorized(conversationId)) continue;
        } catch {
          /* Fail closed. */
        }
        socket.leave(`conversation:${conversationId}`);
        watched.delete(conversationId);
      }
    }, 10000);
    membershipCheck.unref?.();
    socket.on("disconnect", () => {
      clearTimeout(expiry);
      clearInterval(membershipCheck);
    });
  });
}
