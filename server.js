import http from "http";
import next from "next";

import { Server } from "socket.io";
//import { loadEnvConfig } from "@next/env";
//import { installSocketSecurity } from "./lib/socket-server.mjs";
import nextEnv from "@next/env";
// Load .env before accessing environment variables
// loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// console.log("[Startup Environment Check]", {
//   hasMongoUri: Boolean(process.env.MONGODB_URI),
//   hasResendKey: Boolean(process.env.RESEND_API_KEY),
//   hasEmailFrom: Boolean(process.env.EMAIL_FROM),
// });

const dev = process.env.NODE_ENV !== "production";

// Load environment variables before application initialization
nextEnv.loadEnvConfig(process.cwd(), dev);

// console.log("[Server startup]", {
//   cwd: process.cwd(),
//   nodeEnv: process.env.NODE_ENV ?? "not set",
//   hasMongoUri: Boolean(process.env.MONGODB_URI),
//   hasResendKey: Boolean(process.env.RESEND_API_KEY),
//   hasEmailFrom: Boolean(process.env.EMAIL_FROM),
// });

// Load Socket.IO security after environment initialization
const { installSocketSecurity } = await import("./lib/socket-server.mjs");

const app = next({ dev, ...(dev ? { webpack: true } : {}) });

const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log("[After Next.js prepare]", {
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasEmailFrom: Boolean(process.env.EMAIL_FROM),
    pid: process.pid,
  });
  const server = http.createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    allowRequest: (request, callback) => {
      const expected = new URL(
        process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXTAUTH_URL ||
          "http://localhost:3000",
      ).origin;
      callback(
        null,
        !request.headers.origin || request.headers.origin === expected,
      );
    },
    cors: {
      origin: new URL(
        process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXTAUTH_URL ||
          "http://localhost:3000",
      ).origin,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  global.io = io;

  installSocketSecurity(io);

  // const PORT = process.env.PORT || 3000;
  // server.listen(PORT,(err) => {
  //     if(err) throw err;
  //     console.log(`> Server is running on http://localhost:${PORT}`);
  // });

  //--------------------------
  // for production
  //----------------------------

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";

  server.listen(PORT, HOST, (err) => {
    if (err) throw err;

    console.log(`> Servizato server running on ${HOST}:${PORT}`);
  });
});
