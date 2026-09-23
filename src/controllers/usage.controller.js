import crypto from "node:crypto";
import prisma from "../db/prisma.js";
import { getKeyUsage } from "../services/usage.service.js";

export async function usageController(req, res, next) {
    try {
        const { key } = req.query;

        if (!key) {
            return res.status(400).json({
                error: "key query parameter is required",
            });
        }

        const keyHash = crypto
            .createHash("sha256")
            .update(key)
            .digest("hex");

        const gatewayKey = await prisma.gatewayKey.findUnique({
            where: { keyHash },
            select: { id: true },
        });

        if (!gatewayKey) {
            return res.status(404).json({
                error: "Invalid gateway API key",
            });
        }

        const usage = await getKeyUsage(gatewayKey.id);

        return res.status(200).json(usage);
    } catch (error) {
        next(error);
    }
}