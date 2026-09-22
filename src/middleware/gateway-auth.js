import crypto from "node:crypto";
import prisma from "../db/prisma.js";

export async function gatewayAuth(req, res, next) {
    try {
        const authHeader = req.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Missing gateway API key",
            });
        }

        const providedKey = authHeader.slice("Bearer ".length).trim();

        if (!providedKey) {
            return res.status(401).json({
                error: "Missing gateway API key",
            });
        }

        const keyHash = crypto
            .createHash("sha256")
            .update(providedKey)
            .digest("hex");

        const gatewayKey = await prisma.gatewayKey.findUnique({
            where: {
                keyHash,
            },
        });

        if (!gatewayKey || !gatewayKey.active) {
            return res.status(401).json({
                error: "Invalid gateway API key",
            });
        }

        req.gatewayKey = gatewayKey;

        next();
    } catch (error) {
        next(error);
    }
}