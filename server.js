import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());


// ===============================
// PLAN A — BÁSICO (100% FUNCIONAL)
// ===============================

// Estado
app.get("/", (req, res) => {
  res.json({ status: "ok", api: "BOE API", version: "1.0.0" });
});

// Últimos documentos publicados (REAL)
app.get("/latest", async (req, res) => {
  try {
    const url = `https://www.boe.es/buscar/xml.php?q=*&sort=fecha&order=desc&n=20`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({ type: "latest", raw: data });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Buscar documentos (REAL)
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Falta ?q=" });

    const url = `https://www.boe.es/buscar/xml.php?q=${encodeURIComponent(q)}&n=50&sort=fecha&order=desc`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({ query: q, raw: data });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


// ===============================
// PLAN B — PRO (YA FUNCIONA)
// ===============================

app.get("/details", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Falta ?id=" });

    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({ id, raw: data });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


// ===============================
// PLAN C — PREMIUM
// ===============================

// Comparar leyes
app.get("/compare", async (req, res) => {
  try {
    const { id1, id2 } = req.query;
    if (!id1 || !id2)
      return res.status(400).json({ error: "Faltan ?id1= y ?id2=" });

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

// Alertas por sector (REAL)
const sectores = {
  autonomos: "autónomos OR actividad",
  fiscal: "impuesto OR fiscal",
  vivienda: "vivienda OR alquiler",
  transporte: "transporte OR tráfico",
  sanitario: "salud OR sanitario"
};

app.get("/alerts", async (req, res) => {
  try {
    const sector = req.query.sector;
    if (!sector || !sectores[sector])
      return res.status(400).json({ error: "Sector no válido" });

    const query = sectores[sector];
    const url = `https://www.boe.es/buscar/xml.php?q=${encodeURIComponent(query)}&n=50&sort=fecha&order=desc`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json({ sector, query, raw: data });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


// PUERTO
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("BOE API corriendo en " + PORT));
