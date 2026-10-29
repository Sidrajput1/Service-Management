import http from "http";
import next from "next";

import { Server } from "socket.io";
import { installSocketSecurity } from "./lib/socket-server.mjs";

const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, ...(dev ? { webpack: true } : {}) });

const handle = app.getRequestHandler();

app.prepare().then(() => {
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
