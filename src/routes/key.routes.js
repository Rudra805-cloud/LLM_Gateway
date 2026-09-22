import express from "express";
import { createKeyController } from "../controllers/key.controller.js";
import { requireAdmin } from "../middleware/admin-auth.js";

const router = express.Router();

router.post("/keys", requireAdmin, createKeyController);

export default router;