import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

/* =======================================================
   FUNCIÓN PARA VALIDAR SI EL BOE DEVUELVE XML O HTML
   ======================================================= */
function limpiarRespuesta(data) {
  // Si empieza por "<" es XML verdadero
  if (typeof data === "string" && data.trim().startsWith("<")) {
    return { ok: true, raw: data };
  }

  // Si es HTML de error → BOE bloquea esa consulta
  return {
    ok: false,
    raw: null,
    error:
      "El BOE devolvió un HTML de error. Prueba una búsqueda más específica."
  };
}

/* =======================================================
   PLAN A — BÁSICO
   ======================================================= */

// Estado
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    api: "BOE API",
    version: "3.0.0",
    info: "Servidor profesional A/B/C listo para GPT"
  });
});

// Últimos documentos del BOE del día (versión correcta)
app.get("/latest", async (req, res) => {
  try {
    // Fecha actual
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");

    // Ejemplo: BOE-S-20251201
    const id = `BOE-S-${year}${month}${day}`;
    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;

    const { data } = await axios.get(url, { responseType: "text" });

    res.json(limpiarRespuesta(data));
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Buscar en el BOE con XML oficial
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Falta ?q=" });

    // XML oficial de búsqueda BOE
    const url = `https://www.boe.es/buscar/xml.php?q=${encodeURIComponent(
      q
    )}&sort=fecha&order=desc&n=50`;

    const { data } = await axios.get(url, { responseType: "text" });

    res.json(limpiarRespuesta(data));
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

/* =======================================================
   PLAN B — PRO
   ======================================================= */

// Detalles de un documento del BOE (XML perfecto)
app.get("/details", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Falta ?id=" });

    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json(limpiarRespuesta(data));
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

/* =======================================================
   PLAN C — PREMIUM
   ======================================================= */

// Sectores legales con sintaxis BOE correcta
const sectores = {
  autonomos: "autónomos | actividad económica",
  fiscal: "impuesto | IRPF | IVA | tributación",
  vivienda: "vivienda | alquiler | arrendamiento",
  transporte: "transporte | circulación | tráfico",
  sanitario: "sanitario | salud | regulación"
};

// Alertas por sector
app.get("/alerts", async (req, res) => {
  try {
    const sector = req.query.sector;
    if (!sector || !sectores[sector])
      return res.status(400).json({ error: "Sector no válido" });

    const consulta = sectores[sector];

    const url = `https://www.boe.es/buscar/xml.php?q=${encodeURIComponent(
      consulta
    )}&sort=fecha&order=desc&n=50`;

    const { data } = await axios.get(url, { responseType: "text" });

    res.json({
      sector,
      query: consulta,
      ...limpiarRespuesta(data)
    });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Comparador de documentos del BOE
app.get("/compare", async (req, res) => {
  try {
    const { id1, id2 } = req.query;
    if (!id1 || !id2)
      return res.status(400).json({ error: "Faltan ?id1= y ?id2=" });

    const url1 = `https://www.boe.es/diario_boe/xml.php?id=${id1}`;
    const url2 = `https://www.boe.es/diario_boe/xml.php?id=${id2}`;

    const [r1, r2] = await Promise.all([
      axios.get(url1, { responseType: "text" }),
      axios.get(url2, { responseType: "text" })
    ]);

    res.json({
      compare: { id1, id2 },
      doc1: limpiarRespuesta(r1.data),
      doc2: limpiarRespuesta(r2.data)
    });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

/* ===============*
