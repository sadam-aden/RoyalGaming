import path from "node:path";
import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { setIo } from "./sockets/io";
import { registerSocketHandlers } from "./sockets";

const app = express();
const httpServer = createServer(app);

// Comma-separated in production (e.g. your Vercel production domain plus
// preview deployment URLs); defaults to the local Vite dev server.
const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: { origin: clientOrigins, credentials: true },
});
setIo(io);
registerSocketHandlers(io);

app.use(cors({ origin: clientOrigins, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", routes);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
