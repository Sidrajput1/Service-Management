// Keep npm start portable across Windows, macOS and Linux.
process.env.NODE_ENV = "production";
await import("../server.js");
