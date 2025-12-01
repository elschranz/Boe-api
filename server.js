import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Falta ?q=" });

  try {
    const url = `https://www.boe.es/buscar/feed.php?tn=1&sf=all&q=${encodeURIComponent(q)}`;
    const response = await axios.get(url, { responseType: "text" });

    res.json({
      query: q,
      raw: response.data
    });

  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API BOE corriendo en " + PORT));
