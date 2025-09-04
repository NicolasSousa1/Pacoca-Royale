import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = 3000;

// Corrigir __dirname no ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, "public")));

// Rota: dados do jogador
app.get("/player/:tag", async (req, res) => {
  try {
    const tag = req.params.tag;
    const url = `https://api.clashroyale.com/v1/players/%23${tag}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${process.env.API_TOKEN}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: "Erro ao buscar jogador", status: response.status, details: text });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor", details: err.message });
  }
});

// Rota: histórico de batalhas
app.get("/player/:tag/battlelog", async (req, res) => {
  try {
    const tag = req.params.tag;
    const url = `https://api.clashroyale.com/v1/players/%23${tag}/battlelog`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${process.env.API_TOKEN}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: "Erro ao buscar battlelog", status: response.status, details: text });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor", details: err.message });
  }
});

// Rota raiz para carregar index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
