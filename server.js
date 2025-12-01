import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

/* ============================
   FUNCIÓN: Normalizar respuesta
   ============================ */
function limpiarRespuesta(data) {
  // Si empieza con "<" es XML verdadero → OK
  if (typeof data === "string" && data.trim().startsWith("<")) {
    return { ok: true, raw: data };
  }

  // Si no es XML, el BOE devolvió HTML de error → devolvemos mensaje limpio
  return {
    ok: false,
    raw: null,
    error: "No hay resultados para esta búsqueda o el BOE devolvió un error."
  };
}

/* ================================
   PLAN A — BÁSICO
   ================================ */

// Estado
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    api: "BOE API",
    version: "2.0.0",
    info: "Servidor profesional A/B/C listo para GPT"
  });
});

// Últimos documentos (XML verdadero)
app.get("/latest", async (req, res) => {
  try {
    const url = `https://www.boe.es/buscar/xml.php?q=*&sort=fecha&order=desc&n=20`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json(limpiarRespuesta(data));
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Buscar documentos (XML verdadero)
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Falta ?q=" });

    const url = `https://www.boe.es/buscar/xml.php?q=${encodeURIComponent(q)}&sort=fecha&order=desc&n=50`;
    const { data } = await axios.get(url, { responseType: "text" });

    res.json(limpiarRespuesta(data));
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


/* ================================
   PLAN B — PRO
   ================================ */

// Detalles de un documento del BOE (XML garantizado)
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


/* ================================
   PLAN C — PREMIUM
   ================================ */

// Sectores con sintaxis REAL del BOE
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

// Comparador de leyes
app.get("/compare", async (req, res) => {
  try {
    const { id1, id2 } = req.query;
    if (!id1 || !id2)
      return res.status(400).json({ error: "Faltan ?id1= y ?id2=" });

    const url1 = `https://www.boe.es/diario_boe/xml.php?id=${id1}`;
    const url2 = `https://www.boe.es/diario_boe/xml.php?id=${id2}`;

    const [res1, res2] = await Promise.all([
      axios.get(url1, { responseType: "text" }),
      axios.get(url2, { responseType: "text" }),
    ]);

    res.json({
      compare: { id1, id2 },
      doc1: limpiarRespuesta(res1.data),
      doc2: limpiarRespuesta(res2.data)
    });

  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});


/* ================================
   SERVIDOR
   ================================ */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("BOE API PRO corriendo en puerto " + PORT)
);
