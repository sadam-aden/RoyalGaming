import path from "node:path";
import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "node:http";
import { Server } from "socket.io";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/security";
import { setIo } from "./sockets/io";
import { registerSocketHandlers } from "./sockets";

const app = express();
const httpServer = createServer(app);

// Comma-separated in production; defaults to the local Vite dev server.
//
// In the deployed setup Nginx serves the client and proxies /api from the same
// origin, so CORS is not what protects the API — authentication is. This keeps
// other origins from reading responses in a browser, nothing more.
const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Behind Nginx every request arrives from 127.0.0.1. Without this the rate
// limiters would bucket the whole shop together and `req.ip` would be useless.
// Exactly one proxy hop, rather than `true`, so a spoofed X-Forwarded-For
// cannot be used to dodge the limits.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    // The client is a Vite bundle served from this same origin. Scripts and
    // styles are its own; images may be data: URIs and the uploads we serve;
    // connect-src covers the API and the Socket.io websocket.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // Tailwind ships real stylesheets, but Recharts sets inline styles on
        // the elements it draws, so style-src cannot be locked to 'self' alone.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    // Tell browsers to stay on HTTPS for a year. Only meaningful over TLS,
    // which the deployed site has; harmless on plain-HTTP local dev.
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: false },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

app.use(cors({ origin: clientOrigins, credentials: true }));
// A cap, because the default is unbounded: every endpoint here takes a small
// JSON object, and the only large upload goes through multer, which has its own
// 5MB limit.
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(
  "/uploads",
  // Product images only. No directory listing, and nothing is executed:
  // everything written here is re-encoded to .webp by sharp under a
  // server-generated name.
  express.static(path.join(process.cwd(), "uploads"), {
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=86400"),
  })
);

app.use("/api", apiLimiter, routes);

app.use(errorHandler);

// Attached before listening, so there is no window in which a websocket
// upgrade arrives at a server that has no handler for it yet.
const io = new Server(httpServer, {
  cors: { origin: clientOrigins, credentials: true },
});
setIo(io);
registerSocketHandlers(io);

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
