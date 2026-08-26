import cors from "cors";
import express from "express";
import path from "path";
import { screenRouter } from "./routes/screen";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api", screenRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const clientBuild = path.join(__dirname, "../client/build");
app.use(express.static(clientBuild));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientBuild, "index.html"));
});
