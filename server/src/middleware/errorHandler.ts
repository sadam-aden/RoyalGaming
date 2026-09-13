import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/asyncHandler";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", issues: err.issues });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Error && err.message === "Only image uploads are allowed") {
    return res.status(400).json({ error: err.message });
  }

  // body-parser rejects oversized and malformed payloads by throwing an error
  // that carries its own status. Without this they fell through to the generic
  // 500 below — the request was still refused, but the caller was told the
  // server had broken, and every probe wrote a stack trace to the log.
  if (isBodyParserError(err)) {
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body is too large" });
    }
    return res.status(400).json({ error: "Malformed request body" });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

/** A body-parser failure: carries a 4xx status and a `type` naming the cause. */
function isBodyParserError(err: unknown): err is Error & { status: number; type: string } {
  if (!(err instanceof Error)) return false;
  const { status, type } = err as unknown as { status?: unknown; type?: unknown };
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof type === "string" &&
    type.startsWith("entity.")
  );
}
