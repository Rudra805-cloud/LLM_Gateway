import express from "express";
import keyRoutes from "./routes/key.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import usageRoutes from "./routes/usage.routes.js";

const app = express();

app.use(express.json());

app.use("/admin", keyRoutes);
app.use("/v1", chatRoutes);
app.use("/usage", usageRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "APIGATEWAY"
    });
});
app.use((err, req, res, next) => {
    console.error(err);

    return res.status(500).json({
        error: "Internal server error",
    });
});
export default app;