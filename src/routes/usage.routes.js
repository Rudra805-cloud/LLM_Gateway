import express from "express";
import { usageController } from "../controllers/usage.controller.js";

const router = express.Router();

router.get("/", usageController);

export default router;