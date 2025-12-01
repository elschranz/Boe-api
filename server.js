import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

/* =======================================================
   FUNCIÓN AVANZADA PARA DETECTAR XML O HTML DEL BOE
   ======================================================= */
function limpiarRespuesta(data) {
  const text = String(data).trim().toLowerCase();

  // ✔ XML real del BOE SIEMPRE empieza con "<?xml"
  if (text.startsWith("<?xml")) {
    return { ok: true, raw: data };
  }

  // ❌ Si empieza por HTML → es un error del BOE
  if (
    text.startsWith("<!doctype html") ||
    text.startsWith("<html") ||
    text.includes("boe.es - error")
  ) {
    return {
      ok: false,
      raw: null,
      error: "El BOE devolvió un error o no permite esta búsqueda."
    };
  }

  // ✔ XML válido sin encabezado
  if (text.startsWith("<")) {
    return { ok: true, raw: data };
  }

  // ❌ Otra cosa desconocida
  return {
    ok: false,
    raw: null,
    error: "Respuesta no válida del BOE."
  };
}

/* =======================================================
   PLAN A — BÁSICO
   ======================================================= */

// STATUS
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    api: "BOE API",
    version: "3.1.0"
  });
});

// Últimos documentos del BOE del día
app.get("/latest", async (req, res) => {
  try {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");

    const id = `BOE-S-${year}${month}${day}`;
    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;

    const { data } = await axios.get(url, { responseType: "text" });
    res.json(limpiarRespuesta(data));
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Buscar en el BOE
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Falta ?q=" });

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

const sectores = {
  autonomos: "autónomos | actividad económica",
  fiscal: "impuesto | irpf | iva | tributación",
  vivienda: "vivienda | alquiler | arrendamiento",
  transporte: "transporte | circulación | tráfico",
  sanitario: "sanitario | salud | regulación"
};

app.get("/alerts", async (req, res) => {
  try {
    const sector = req.query.sector;
    if (!sector || !sectores[sector]) {
      return res.status(400).json({ error: "Sector no válido" });
    }

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

// Comparador
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

/* =======================================================
   SERVIDOR
   ======================================================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("BOE API PRO 3.1 corriendo en puerto " + PORT);
});
