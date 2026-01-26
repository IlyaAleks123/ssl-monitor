const express = require("express");
const cors = require("cors");
const { getCertificateInfo } = require("./checker");
const { sendMessage } = require("./telegram");

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

app.delete("/api/domains/:host", (req, res) => {
  const host = req.params.host;

  const index = DOMAINS.indexOf(host);
  if (index === -1) {
    return res.status(404).json({ error: "domain not found" });
  }

  DOMAINS.splice(index, 1);
  res.json({ message: "domain deleted", host });
});


app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// app.listen(PORT, () => {
//   console.log(`SSL Monitor backend running on port ${PORT}`);
// });

app.listen(PORT, async () => {
  console.log(`SSL Monitor backend running on port ${PORT}`);
  await sendMessage("🔔 SSL Monitor запущен и готов к работе");
});


const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // раз в сутки

const alertState = {}; // { host: { lastAlertAt: Date } }

function shouldSendAlert(host, daysLeft) {
  const state = alertState[host];

  if (daysLeft > 7) {
    delete alertState[host]; // сертификат обновился
    return false;
  }

  if (!state) {
    alertState[host] = { lastAlertAt: new Date() };
    return true; // первый алерт
  }

  const now = new Date();
  const diffDays = (now - state.lastAlertAt) / (1000 * 60 * 60 * 24);

  if (diffDays >= 2) {
    state.lastAlertAt = now;
    return true; // повтор через 2 дня
  }

  return false;
}

async function runDailyCheck() {
  console.log("Running daily SSL check...");

  for (const host of DOMAINS) {
    try {
      const info = await getCertificateInfo(host);

      if (shouldSendAlert(host, info.days_left)) {
        await sendMessage(
          `⚠️ SSL сертификат скоро истечёт\n\n` +
          `Домен: ${host}\n` +
          `Осталось дней: ${info.days_left}\n` +
          `Дата истечения: ${info.valid_to}`
        );
      }
    } catch (err) {
      console.error(`Failed to check ${host}:`, err.message);
    }
  }
}

// запуск при старте
runDailyCheck();

// запуск раз в сутки
setInterval(runDailyCheck, CHECK_INTERVAL);
