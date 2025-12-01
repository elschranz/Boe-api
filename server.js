import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

// ---------------------------------------------------
// 🟢 VALIDACIÓN XML (AHORA INCLUYE <sumario>)
// ---------------------------------------------------
function esXMLValido(data) {
  if (!data) return false;

  const text = String(data).trim().toLowerCase();
  if (text.startsWith("<?xml")) return true;
  if (text.startsWith("<documento")) return true;
  if (text.startsWith("<sumario")) return true;   // ← sumarios del diario
  if (text.startsWith("<error")) return true;

  // Si empieza con HTML = BOE devolvió error visual
  if (text.startsWith("<!doctype html") || text.startsWith("<html")) return false;

  return false;
}

// ---------------------------------------------------
// 🟢 STATUS
// ---------------------------------------------------
app.get("/status", (req, res) => {
  res.json({ ok: true, status: "running" });
});

// ---------------------------------------------------
// 🟢 BUSCAR (simple + por palabras)
// ---------------------------------------------------
app.get("/buscar", async (req, res) => {
  const { q } = req.query;

  if (!q) return res.json({ ok: false, error: "Falta ?q=consulta" });

  try {
    const url = `https://www.boe.es/buscar/boe.php?campo%5B0%5D=todos&texto%5B0%5D=${encodeURIComponent(
      q
    )}&accion=Buscar`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,*/*",
      }
    });

    if (!response.data || response.data.includes("Error en la información recibida")) {
      return res.json({ ok: false, error: "El BOE devolvió un error." });
    }

    return res.json({
      ok: true,
      raw: response.data
    });
  } catch (err) {
    return res.json({ ok: false, error: "No se pudo acceder al BOE." });
  }
});

// ---------------------------------------------------
// 🟢 BUSCAR AVANZADO (sector / consulta)
// ---------------------------------------------------
app.get("/buscar-avanzado", async (req, res) => {
  const { sector, consulta } = req.query;

  if (!sector || !consulta) {
    return res.json({
      ok: false,
      error: "Falta ?sector= y ?consulta="
    });
  }

  try {
    const query = `${sector} ${consulta}`;
    const url = `https://www.boe.es/buscar/boe.php?campo%5B0%5D=todos&texto%5B0%5D=${encodeURIComponent(
      query
    )}&accion=Buscar`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.data || response.data.includes("Error en la información recibida")) {
      return res.json({
        ok: false,
        raw: null,
        error: "El BOE devolvió un error o no permite esta búsqueda."
      });
    }

    return res.json({
      ok: true,
      raw: response.data
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: "No se pudo procesar la búsqueda."
    });
  }
});

// ---------------------------------------------------
// 🟢 DOCUMENTO (XML oficial del BOE)
// ---------------------------------------------------
app.get("/documento", async (req, res) => {
  const { id } = req.query;

  if (!id)
    return res.json({ ok: false, error: "Falta ?id=BOE-A-AAAA-NNN" });

  try {
    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/xml,text/xml,*/*"
      }
    });

    if (!esXMLValido(response.data)) {
      return res.json({
        ok: false,
        raw: null,
        error: "El BOE devolvió un error o el documento no existe."
      });
    }

    return res.json({ ok: true, raw: response.data });
  } catch (err) {
    return res.json({ ok: false, error: "No se pudo cargar el documento." });
  }
});

// ---------------------------------------------------
// 🟢 PDF (descarga directa del BOE)
// ---------------------------------------------------
app.get("/pdf", async (req, res) => {
  const { id } = req.query;

  if (!id)
    return res.json({ ok: false, error: "Falta ?id=BOE-A-AAAA-NNN" });

  try {
    const pdfUrl = `https://www.boe.es/boe/dias/${id.substring(6, 10)}/${id.substring(10, 12)}/${id.substring(12, 14)}/pdfs/${id}.pdf`;

    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/pdf"
      }
    });

    if (!response.data) {
      return res.json({ ok: false, error: "PDF no encontrado." });
    }

    res.setHeader("Content-Type", "application/pdf");
    return res.send(response.data);
  } catch (err) {
    return res.json({ ok: false, error: "PDF no encontrado." });
  }
});

// ---------------------------------------------------
// 🟢 DIARIO DEL DÍA (SUMARIO BOE) — CORREGIDO
//     Usa la API OFICIAL de Datos Abiertos del BOE
// ---------------------------------------------------
app.get("/diario", async (req, res) => {
  const { fecha } = req.query;

  if (!fecha)
    return res.json({ ok: false, error: "Falta ?fecha=YYYYMMDD" });

  try {
    const url = `https://www.boe.es/datosabiertos/api/boe/sumario/${fecha}`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/xml,text/xml,*/*"
      }
    });

    if (!esXMLValido(response.data)) {
      return res.json({
        ok: false,
        raw: null,
        error: "El BOE no tiene datos para esa fecha o devolvió error."
      });
    }

    return res.json({ ok: true, raw: response.data });

  } catch (err) {
    return res.json({
      ok: false,
      error: "Error obteniendo el diario del BOE."
    });
  }
});

// ---------------------------------------------------
app.listen(3000, () => {
  console.log("BOE API server running on port 3000");
});
