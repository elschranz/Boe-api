import express from "express";
import axios from "axios";
const app = express();

// ---------------------------------------------------
// 🟦 Función para comprobar si la respuesta del BOE es XML
// ---------------------------------------------------
function esXMLValido(data) {
  const text = String(data).trim().toLowerCase();

  if (text.startsWith("<?xml")) return true;
  if (text.startsWith("<documento")) return true;   // documento de detalle
  if (text.startsWith("<sumario")) return true;     // XML del diario BOE
  if (text.startsWith("<error")) return true;       // error XML oficial

  // Si empieza con HTML → error del BOE
  if (text.startsWith("<!doctype html") || text.startsWith("<html")) return false;

  return false;
}

// Middleware global
app.use(express.json());

// ---------------------------------------------------
// 🟢 STATUS
// ---------------------------------------------------
app.get("/status", (req, res) => {
  res.json({ ok: true, status: "API funcionando correctamente" });
});

// ---------------------------------------------------
// 🟢 BUSCAR: /buscar?q=texto
// ---------------------------------------------------
app.get("/buscar", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ ok: false, error: "Falta ?q=" });

  try {
    const url = `https://www.boe.es/buscar/xml.php?q=${encodeURIComponent(q)}`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!esXMLValido(response.data)) {
      return res.json({ ok: false, raw: null, error: "El BOE devolvió un error o no permite esta búsqueda." });
    }

    res.json({ ok: true, raw: response.data });

  } catch (err) {
    res.json({ ok: false, error: "Error en la búsqueda del BOE." });
  }
});

// ---------------------------------------------------
// 🟢 DETALLE DE DOCUMENTO: /detalle?id=BOE-A-2025-12345
// ---------------------------------------------------
app.get("/detalle", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ ok: false, error: "Falta ?id=" });

  try {
    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!esXMLValido(response.data)) {
      return res.json({ ok: false, raw: null, error: "Documento no disponible o el BOE devolvió error." });
    }

    res.json({ ok: true, raw: response.data });

  } catch (err) {
    res.json({ ok: false, error: "No se pudo cargar el documento del BOE." });
  }
});

// ---------------------------------------------------
// 🟢 PDF DEL DOCUMENTO: /pdf?id=BOE-A-2025-12345
// ---------------------------------------------------
app.get("/pdf", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ ok: false, error: "Falta ?id=" });

  try {
    const urlXml = `https://www.boe.es/diario_boe/xml.php?id=${id}`;

    const xml = await axios.get(urlXml, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!esXMLValido(xml.data)) {
      return res.json({ ok: false, error: "No se pudo obtener el XML del documento." });
    }

    const pdfPath = xml.data.match(/<url_pdf>(.*?)<\/url_pdf>/)?.[1];

    if (!pdfPath) {
      return res.json({ ok: false, error: "PDF no encontrado." });
    }

    const fullPdfUrl = `https://www.boe.es${pdfPath}`;
    res.json({ ok: true, pdf: fullPdfUrl });

  } catch (err) {
    res.json({ ok: false, error: "Error obteniendo PDF." });
  }
});

// ---------------------------------------------------
// 🟢 DIARIO DEL DÍA (SUMARIO OFICIAL)
//      /diario?fecha=20251115
// ---------------------------------------------------
app.get("/diario", async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.json({ ok: false, error: "Falta ?fecha=YYYYMMDD" });
  }

  try {
    const url = `https://www.boe.es/datosabiertos/api/boe/sumario/${fecha}`;

    const response = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/xml,text/xml,*/*"
      }
    });

    if (!esXMLValido(response.data)) {
      return res.json({ ok: false, raw: null, error: "El BOE no tiene datos para esa fecha o devolvió error." });
    }

    res.json({ ok: true, raw: response.data });

  } catch (err) {
    res.json({ ok: false, error: "Error cargando el BOE diario." });
  }
});

// ---------------------------------------------------
// 🟢 SERVER LISTEN (Railway compatible)
// ---------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("BOE API server running on port " + PORT);
});
