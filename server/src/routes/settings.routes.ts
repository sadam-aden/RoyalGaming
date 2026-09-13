import { Router } from "express";
import { getTaxRate } from "../utils/pricing";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, (_req, res) => {
  res.json({ taxRate: getTaxRate() });
});

export default router;
