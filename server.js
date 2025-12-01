import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "BOE API funcionando" });
});

app.post("/buscar_articulo", async (req, res) => {
  try {
    const { ley, articulo } = req.body;

    if (!Ley || !articulo) {
      return res.status(400).json({ error: "Faltan parámetros: ley y articulo" });
    }

    const url = `https://www.boe.es/buscar/act.php?query=${encodeURIComponent(ley)}`;

    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const texto = $("body").text().toLowerCase();

    const index = texto.indexOf(articulo.toLowerCase());
    if (index === -1) {
      return res.json({ resultado: "Artículo no encontrado." });
    }

    const resultado = texto.substring(index, index + 2000);

    res.json({ ley, articulo, resultado });

  } catch (error) {
    res.status(500).json({ error: "Error al consultar el BOE." });
  }
});

const PORT = process.env.PORT || 8080; // Railway asigna su puerto aquí
app.listen(PORT, () => console.log("API escuchando en " + PORT));
