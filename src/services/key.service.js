import crypto from "node:crypto";
import prisma from "../db/prisma.js";

export function generateGatewayKey() {
    const randomPart = crypto.randomBytes(32).toString("hex");

    return `gw_${randomPart}`;
}

export function hashGatewayKey(key) {
    return crypto
        .createHash("sha256")
        .update(key)
        .digest("hex");
}

export async function createGatewayKey({ name, budgetLimit }) {
    const key = generateGatewayKey();
    const keyHash = hashGatewayKey(key);

    const gatewayKey = await prisma.gatewayKey.create({
        data: {
            name,
            keyHash,
            budgetLimit,
        },
    });

    return {
        id: gatewayKey.id,
        key,
        name: gatewayKey.name,
        budgetLimit: gatewayKey.budgetLimit,
    };
}