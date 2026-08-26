import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { screenRouter } from "./routes/screen";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// API routes
app.use("/api", screenRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve React frontend in production
const clientBuild = path.join(__dirname, "../../client/build");
app.use(express.static(clientBuild));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientBuild, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
