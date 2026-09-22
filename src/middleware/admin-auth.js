import crypto from "node:crypto";

export function requireAdmin(req, res, next) {
    const authHeader = req.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Missing admin credentials",
        });
    }

    const providedKey = authHeader.slice("Bearer ".length).trim();
    const configuredKey = process.env.ADMIN_API_KEY;

    if (!configuredKey) {
        console.error("ADMIN_API_KEY is not configured");

        return res.status(500).json({
            error: "Server configuration error",
        });
    }

    const providedBuffer = Buffer.from(providedKey);
    const configuredBuffer = Buffer.from(configuredKey);

    const valid =
        providedBuffer.length === configuredBuffer.length &&
        crypto.timingSafeEqual(providedBuffer, configuredBuffer);

    if (!valid) {
        return res.status(401).json({
            error: "Invalid admin credentials",
        });
    }

    next();
}