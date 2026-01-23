const express = require("express");
const { getCertificateInfo } = require("./checker");

const app = express();
const PORT = 3000;

// временный список доменов
const DOMAINS = [
  "kantorkurs.obmin24.info",
  "google.com",
  "github.com"
];

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/certs", async (req, res) => {
  try {
    const results = [];
    for (const host of DOMAINS) {
      const info = await getCertificateInfo(host);
      results.push(info);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SSL Monitor backend running on port ${PORT}`);
});

