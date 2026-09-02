import { Router } from "express";
import { getTaxRate } from "../utils/pricing";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ taxRate: getTaxRate() });
});

export default router;
