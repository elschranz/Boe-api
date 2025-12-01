import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

// Endpoint de estado
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "BOE API funcionando" });
});

// Endpoint para buscar en el BOE
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ error: "Falta el parámetro q" });
    }

    // API pública del BOE (RSS JSON)
    const url = `https://www.boe.es/diario_boe/xml.php?id=BOE-S-${query}`;
    
    // Consulta al BOE
    const response = await axios.get(
      `https://www.boe.es/buscar/feed.php?tn=1&sf=all&q=${encodeURIComponent(query)}`
    );

    res.json({
      query,
      results: response.data
    });

  } catch (error) {
    res.status(500).json({
      error: "Error consultando el BOE",
      details: error.toString(),
    });
  }
});

// Puerto Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor BOE API en el puerto " + PORT);
});
