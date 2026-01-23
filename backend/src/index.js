const express = require("express");
const cors = require("cors");
const { getCertificateInfo } = require("./checker");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// временный список доменов
let DOMAINS = [
  "chat.obmin24.info",
  "kantorkurs.pl"
];

app.get("/api/certs", async (req, res) => {
  const results = [];

  for (const host of DOMAINS) {
    try {
      const info = await getCertificateInfo(host);
      results.push(info);
    } catch (err) {
      results.push({
        host,
        error: err.message,
        status: "ERROR",
        days_left: null,
        issuer: null,
      });
    }
  }

  res.json(results);
});

app.get("/api/domains", (req, res) => {
  res.json(DOMAINS);
});

app.post("/api/domains", async (req, res) => {
  const { host } = req.body;

  if (!host) {
    return res.status(400).json({ error: "host is required" });
  }

  if (DOMAINS.includes(host)) {
    return res.status(409).json({ error: "domain already exists" });
  }

  try {
    // пробуем получить сертификат
    await getCertificateInfo(host);

    DOMAINS.push(host);
    res.status(201).json({ message: "domain added", host });
  } catch (err) {
    // если не удалось подключиться — не добавляем
    res.status(400).json({
      error: "domain is not reachable via TLS",
      details: err.message
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`SSL Monitor backend running on port ${PORT}`);
});

