import express from "express";
import { gatewayAuth } from "../middleware/gateway-auth.js";
import { chatController } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/chat", gatewayAuth, chatController);

export default router;