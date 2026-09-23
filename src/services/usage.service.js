import prisma from "../db/prisma.js";

export async function getKeyUsage(keyId) {
    const gatewayKey = await prisma.gatewayKey.findUnique({
        where: {
            id: keyId,
        },
    });

    if (!gatewayKey) {
        return null;
    }

    const usage = await prisma.usageLog.aggregate({
        where: {
            keyId,
        },
        _count: {
            id: true,
        },
        _sum: {
            inputTokens: true,
            outputTokens: true,
            totalTokens: true,
            estimatedCost: true,
        },
    });

    const budget = Number(gatewayKey.budgetLimit);
    const spent = Number(gatewayKey.spentAmount);
    const remaining = Math.max(0, budget - spent);

    return {
        keyId: gatewayKey.id,
        name: gatewayKey.name,
        budget,
        spent,
        remaining,
        totalRequests: usage._count.id,
        totalInputTokens: usage._sum.inputTokens ?? 0,
        totalOutputTokens: usage._sum.outputTokens ?? 0,
        totalTokens: usage._sum.totalTokens ?? 0,
        loggedCost: Number(usage._sum.estimatedCost ?? 0),
    };
}