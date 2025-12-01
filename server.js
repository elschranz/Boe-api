// ===============================================
// API BOE OFICIAL – VERSION FINAL PROFESIONAL
// ===============================================

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ---------------------------------------------------
// 🔧 Función para validar si la respuesta es XML real
// ---------------------------------------------------
function esXMLValido(data) {
  const text = String(data).trim().toLowerCase();

  if (text.startsWith("<?xml")) return true;
  if (text.startsWith("<documento")) return true;
  if (text.startsWith("<error")) return true;

  // HTML = siempre error del BOE
  if (text.startsWith("<!doctype html") || text.startsWith("<html")) return false;

  return false;
}

// ---------------------------------------------------
// 🟢 STATUS
// ---------------------------------------------------
app.get("/status", (req, res) => {
  res.json({ ok: true, status: "API funcionando correctamente" });
});

// ---------------------------------------------------
// 🟢 DETAILS (XML oficial del BOE por ID)
// ---------------------------------------------------
app.get("/details", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ ok: false, error: "Falta el parámetro ?id" });

  try {
    const url = `https://www.boe.es/diario_boe/xml.php?id=${id}`;
    const response = await axios.get(url, { responseType: "text" });

    if (!esXMLValido(response.data)) {
      return res.json({
        ok: false,
        raw: null,
        error: "El BOE devolvió un error o el ID no existe."
      });
    }

    return res.json({ ok: true, raw: response.data });

  } catch (err) {
    return res.json({ ok: false, error: "Error descargando el documento." });
  }
});

// ---------------------------------------------------
// 🟢 HTML oficial del BOE por ID
// ---------------------------------------------------
app.get("/html", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ ok: false, error: "Falta el parámetro ?id" });

  try {
    const url = `https://www.boe.es/buscar/doc.php?id=${id}`;
    const response = await axios.get(url, { responseType: "text" });

    if (response.data.toLowerCase().includes("error en la información")) {
      return res.json({
        ok: false,
        raw: null,
        error: "El BOE devolvió un error o el ID no existe."
      });
    }

    return res.json({ ok: true, raw: response.data });

  } catch (err) {
    return res.json({ ok: false, error: "Error descargando HTML." });
  }
});

// ---------------------------------------------------
// 🟢 PDF OFICIAL DEL BOE (versión FINAL correcta)
// ---------------------------------------------------
app.get("/pdf", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ ok: false, error: "Falta el parámetro ?id" });

  try {
    // 1) Descargar XML para obtener la ruta PDF real
    const xmlURL = `https://www.boe.es/diario_boe/xml.php?id=${id}`;
    const xmlResponse = await axios.get(xmlURL, { responseType: "text" });

    if (!esXMLValido(xmlResponse.data)) {
      return res.json({ ok: false, error: "ID no válido o sin PDF." });
    }

    // 2) Extraer la etiqueta <url_pdf>
    const match = xmlResponse.data.match(/<url_pdf>(.*?)<\/url_pdf>/);

    if (!match || !match[1]) {
      return res.json({
        ok: false,
        error: "Este documento no tiene PDF disponible."
      });
    }

    // 3) Construir la URL final
    const pdfURL = "https://www.boe.es" + match[1];

    // 4) Descargar PDF real
    const pdfResponse = await axios.get(pdfURL, { responseType: "arraybuffer" });

    res.setHeader("Content-Type", "application/pdf");
    return res.send(pdfResponse.data);

  } catch (err) {
    return res.json({ ok: false, error: "No se pudo descargar el PDF." });
  }
});

// ---------------------------------------------------
// 🟢 BOE DEL DÍA (lista de documentos publicados ese día)
// ---------------------------------------------------
app.get("/diario", async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.json({ ok: false, error: "Falta el parámetro ?fecha=YYYYMMDD" });
  }

  try {
    const url = `https://www.boe.es/diario_boe/xml.php?fecha=${fecha}`;
    const response = await axios.get(url, { responseType: "text" });

    if (!esXMLValido(response.data)) {
      return res.json({
        ok: false,
        raw: null,
        error: "El BOE no tiene datos para esa fecha o devolvió error."
      });
    }

    return res.json({ ok: true, raw: response.data });

  } catch (err) {
    return res.json({ ok: false, error: "Error cargando el BOE de ese día." });
  }
});

// ---------------------------------------------------
// 🟢 COMPARE 2 DOCUMENTOS
// ---------------------------------------------------
app.get("/compare", async (req, res) => {
  const { id1, id2 } = req.query;

  if (!id1 || !id2) {
    return res.json({
      ok: false,
      error: "Faltan parámetros ?id1=&id2="
    });
  }

  try {
    const url1 = `https://www.boe.es/diario_boe/xml.php?id=${id1}`;
    const url2 = `https://www.boe.es/diario_boe/xml.php?id=${id2}`;

    const [r1, r2] = await Promise.all([
      axios.get(url1, { responseType: "text" }),
      axios.get(url2, { responseType: "text" })
    ]);

    return res.json({
      compare: { id1, id2 },
      doc1: esXMLValido(r1.data) ? { ok: true, raw: r1.data } : { ok: false },
      doc2: esXMLValido(r2.data) ? { ok: true, raw: r2.data } : { ok: false }
    });

  } catch (err) {
    return res.json({ ok: false, error: "Error comparando documentos." });
  }
});

// ---------------------------------------------------
// 🟢 INICIO
// ---------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API BOE ONLINE",
    endpoints: [
      "/status",
      "/details?id=",
      "/html?id=",
      "/pdf?id=",
      "/diario?fecha=",
      "/compare?id1=&id2="
    ]
  });
});

// ---------------------------------------------------
// 🔥 Iniciar servidor
// ---------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("API BOE corriendo en el puerto " + PORT)
);
