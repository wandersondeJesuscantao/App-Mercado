import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("shopping.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    name TEXT,
    total REAL,
    items TEXT,
    timestamp INTEGER
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Explicitly serve PWA files to ensure they are reachable by crawlers/bots
  app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", "application/manifest+json");
    res.sendFile(path.join(__dirname, "public", "manifest.json"));
  });

  app.get("/sw.js", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", "application/javascript");
    res.sendFile(path.join(__dirname, "public", "sw.js"));
  });

  // Google Play Store Digital Asset Links
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.json([{
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.suascompras.mercado", // Nome do pacote que você escolherá no PWABuilder
        "sha256_cert_fingerprints": ["00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00"] // Você atualizará isso com seu fingerprint real
      }
    }]);
  });

  // API Routes
  app.get("/api/lists", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM lists ORDER BY timestamp DESC").all();
      const lists = rows.map((row: any) => ({
        ...row,
        items: JSON.parse(row.items)
      }));
      res.json(lists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lists" });
    }
  });

  app.post("/api/lists", (req, res) => {
    const { id, name, total, items, timestamp } = req.body;
    try {
      db.prepare("INSERT OR REPLACE INTO lists (id, name, total, items, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(id, name, total, JSON.stringify(items), timestamp);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save list" });
    }
  });

  app.delete("/api/lists/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM lists WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete list" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
