import express from "express";
import keyRoutes from "./routes/key.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

app.use(express.json());

app.use("/admin", keyRoutes);
app.use("/v1", chatRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "APIGATEWAY"
    });
});

export default app;