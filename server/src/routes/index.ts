import { Router } from "express";
import authRoutes from "./auth.routes";
import stationsRoutes from "./stations.routes";
import sessionsRoutes from "./sessions.routes";
import productsRoutes from "./products.routes";
import ordersRoutes from "./orders.routes";
import customersRoutes from "./customers.routes";
import discountsRoutes from "./discounts.routes";
import expensesRoutes from "./expenses.routes";
import analyticsRoutes from "./analytics.routes";
import reportsRoutes from "./reports.routes";
import staffRoutes from "./staff.routes";
import settingsRoutes from "./settings.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/stations", stationsRoutes);
router.use("/sessions", sessionsRoutes);
router.use("/products", productsRoutes);
router.use("/orders", ordersRoutes);
router.use("/customers", customersRoutes);
router.use("/discounts", discountsRoutes);
router.use("/expenses", expensesRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/reports", reportsRoutes);
router.use("/staff", staffRoutes);
router.use("/settings", settingsRoutes);

export default router;
