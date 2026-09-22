import prisma from "../db/prisma.js";

const INPUT_PRICE_PER_MILLION = Number(
    process.env.GEMINI_INPUT_PRICE_PER_MILLION || 0
);

const OUTPUT_PRICE_PER_MILLION = Number(
    process.env.GEMINI_OUTPUT_PRICE_PER_MILLION || 0
);

export function calculateCost(inputTokens, outputTokens) {
    const inputCost =
        (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION;

    const outputCost =
        (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION;

    return inputCost + outputCost;
}

export function estimateInputTokens(messages) {
    const totalCharacters = messages.reduce(
        (total, message) => total + message.content.length,
        0
    );

    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalCharacters / 4);
}

export async function reserveBudget(keyId, estimatedCost) {
    const result = await prisma.$queryRaw`
        UPDATE "GatewayKey"
        SET "reservedAmount" = "reservedAmount" + ${estimatedCost}
        WHERE "id" = ${keyId}
          AND "active" = true
          AND "spentAmount" + "reservedAmount" + ${estimatedCost}
              <= "budgetLimit"
        RETURNING "id", "budgetLimit", "spentAmount", "reservedAmount"
    `;

    if (result.length === 0) {
        return null;
    }

    return result[0];
}

export async function releaseBudget(keyId, reservedAmount) {
    await prisma.gatewayKey.update({
        where: { id: keyId },
        data: {
            reservedAmount: {
                decrement: reservedAmount,
            },
        },
    });
}

export async function reconcileBudget(
    keyId,
    reservedAmount,
    actualCost
) {
    await prisma.gatewayKey.update({
        where: { id: keyId },
        data: {
            reservedAmount: {
                decrement: reservedAmount,
            },
            spentAmount: {
                increment: actualCost,
            },
        },
    });
}