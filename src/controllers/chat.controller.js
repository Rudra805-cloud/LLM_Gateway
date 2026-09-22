import { generateWithGemini } from "../services/gemini.service.js";
import {
    calculateCost,
    estimateInputTokens,
    reserveBudget,
    releaseBudget,
    reconcileBudget,
} from "../services/budget.service.js";

export async function chatController(req, res, next) {
    let reservedCost = 0;

    try {
        const { model, messages } = req.body;

        if (!model || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "model and messages are required",
            });
        }

        const estimatedInputTokens = estimateInputTokens(messages);

        // Temporary conservative output allowance.
        // We will connect this to the provider's output limit next.
        const estimatedOutputTokens = 1024;

        const estimatedCost = calculateCost(
            estimatedInputTokens,
            estimatedOutputTokens
        );

        reservedCost = estimatedCost;

        const reservation = await reserveBudget(
            req.gatewayKey.id,
            estimatedCost
        );

        if (!reservation) {
            return res.status(402).json({
                error: "Budget exceeded",
            });
        }

        const result = await generateWithGemini({
            model,
            messages,
        });

        const actualCost = calculateCost(
            result.inputTokens,
            result.outputTokens
        );

        await reconcileBudget(
            req.gatewayKey.id,
            reservedCost,
            actualCost
        );

        reservedCost = 0;

        return res.status(200).json({
            ...result,
            estimatedCost: actualCost,
        });
    } catch (error) {
        if (reservedCost > 0 && req.gatewayKey?.id) {
            try {
                await releaseBudget(
                    req.gatewayKey.id,
                    reservedCost
                );
            } catch (releaseError) {
                console.error(
                    "Failed to release budget reservation:",
                    releaseError
                );
            }
        }

        next(error);
    }
}