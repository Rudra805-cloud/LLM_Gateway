import { createGatewayKey } from "../services/key.service.js";

export async function createKeyController(req, res, next) {
    try {
        const { name, budget } = req.body;

        if (!name || typeof(name) !== "string") {
            return res.status(400).json({
                error: "name is required",
            });
        }

        if (
            budget === undefined ||
            typeof budget !== "number" ||
            !Number.isFinite(budget) ||
            budget <= 0
        ) {
            return res.status(400).json({
                error: "budget must be a positive number",
            });
        }

        const result = await createGatewayKey({
            name: name.trim(),
            budgetLimit: budget,
        });

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}