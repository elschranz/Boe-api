import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());


// ===============================
// PLAN A — BÁSICO
// ===============================

// Estado
app.get("/", (req, res) => {
  res.json({ status: "ok", api: "BOE API", version: "1.0.0" });
});

// Últimas publicaciones del BOE
app.get("/latest", async (req, res) => {
  try {
    const url = "https://www.boe.es/diario_boe/feed.php?tipo=1";
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      source: "BOE",
      type: "latest",
      raw: data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Buscar en el BOE
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Falta ?q=" });

    const url = `https://www.boe.es/buscar/feed.php?tn=1&sf=all&q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      query: q,
      raw: data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


// ===============================
// PLAN B — PRO
// ===============================

// Detalles de un documento del BOE
app.get("/details", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Falta ?id=" });

    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      id,
      raw: data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Descargar PDF del BOE
app.get("/pdf", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Falta ?id=" });

    const pdfUrl = `https://www.boe.es/boe/dias/${id}.pdf`;

    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });

    res.setHeader("Content-Type", "application/pdf");
    res.send(response.data);

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


// ===============================
// PLAN C — PREMIUM
// ===============================

// Comparador de leyes
app.get("/compare", async (req, res) => {
  try {
    const { id1, id2 } = req.query;
    if (!id1 || !id2) return res.status(400).json({ error: "Faltan ?id1= y ?id2=" });

    const url1 = `https://www.boe.es/diario_boe/xml.php?id=${id1}`;
    const url2 = `https://www.boe.es/diario_boe/xml.php?id=${id2}`;

    const [res1, res2] = await Promise.all([
      axios.get(url1, { responseType: "text" }),
      axios.get(url2, { responseType: "text" })
    ]);

    res.json({
      compare: { id1, id2 },
      raw1: res1.data,
      raw2: res2.data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Alertas por sector (muy simple, se puede mejorar)
const sectores = {
  autonomos: "autónomos OR actividades económicas OR trabajadores",
  fiscal: "impuestos OR IRPF OR IVA OR tribut",
  vivienda: "arrendamiento OR vivienda OR alquiler",
  transporte: "tráfico OR transporte OR circulación",
  sanitario: "salud OR sanitario OR regulación médica"
};

app.get("/alerts", async (req, res) => {
  try {
    const sector = req.query.sector;
    if (!sector || !sectores[sector])
      return res.status(400).json({ error: "Sector no válido" });

    const q = sectores[sector];
    const url = `https://www.boe.es/buscar/feed.php?tn=1&sf=all&q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      sector,
      query: q,
      raw: data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Resumen diario (BOE del día)
app.get("/summaries/daily", async (req, res) => {
  try {
    const url = "https://www.boe.es/diario_boe/feed.php?tipo=1";
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      type: "daily-summary",
      raw: data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Resumen semanal
app.get("/summaries/weekly", async (req, res) => {
  try {
    const url = "https://www.boe.es/diario_boe/feed.php?tipo=7";
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      type: "weekly-summary",
      raw: data
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


// PUERTO
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("BOE API corriendo en el puerto " + PORT));
