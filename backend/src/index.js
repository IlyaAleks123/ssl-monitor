const express = require("express");
const cors = require("cors");
const { getCertificateInfo } = require("./checker");
const { sendMessage } = require("./telegram");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = require("./db");

async function getDomains() {
  const { rows } = await db.query("SELECT id, host FROM domains ORDER BY id");
  return rows;
}

app.get("/api/certs", async (req, res) => {
  const domains = await getDomains();
  const results = [];

  for (const d of domains) {
    try {
      const info = await getCertificateInfo(d.host);
      results.push({ ...info, id: d.id });
    } catch (err) {
      results.push({
        host: d.host,
        id: d.id,
        error: err.message,
        status: "ERROR",
        days_left: null,
        issuer: null,
      });
    }
  }

  res.json(results);
});

app.get("/api/domains", async (req, res) => {
  const domains = await getDomains();
  res.json(domains.map(d => d.host));
});

app.post("/api/domains", async (req, res) => {
  const { host } = req.body;
  if (!host) return res.status(400).json({ error: "host is required" });

  try {
    await getCertificateInfo(host);
    await db.query("INSERT INTO domains(host) VALUES($1)", [host]);
    res.status(201).json({ message: "domain added", host });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "domain already exists" });
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/domains/:host", async (req, res) => {
  const { host } = req.params;

  const result = await db.query("DELETE FROM domains WHERE host=$1", [host]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "domain not found" });
  }

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

async function shouldSendAlert(domainId, daysLeft) {
  if (daysLeft > 7) {
    await db.query("DELETE FROM alert_state WHERE domain_id=$1", [domainId]);
    return false;
  }

  const { rows } = await db.query(
    "SELECT last_alert_at FROM alert_state WHERE domain_id=$1",
    [domainId]
  );

  if (rows.length === 0) {
    await db.query(
      "INSERT INTO alert_state(domain_id, last_alert_at) VALUES ($1, NOW())",
      [domainId]
    );
    return true;
  }

  const last = new Date(rows[0].last_alert_at);
  const diffDays = (Date.now() - last) / 86400000;

  if (diffDays >= 2) {
    await db.query(
      "UPDATE alert_state SET last_alert_at=NOW() WHERE domain_id=$1",
      [domainId]
    );
    return true;
  }

  return false;
}

async function runDailyCheck() {
  try {
    console.log("Running daily SSL check...");
    const domains = await getDomains();

    for (const d of domains) {
      try {
        const info = await getCertificateInfo(d.host);

        if (await shouldSendAlert(d.id, info.days_left)) {
          await sendMessage(
            `⚠️ SSL сертификат скоро истечёт\n\n` +
            `Домен: ${d.host}\n` +
            `Осталось дней: ${info.days_left}\n` +
            `Дата истечения: ${info.valid_to}`
          );
        }
      } catch (err) {
        console.error(`Failed to check ${d.host}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Daily SSL check failed:", err);
  }
}


// запуск при старте
runDailyCheck();

// запуск раз в сутки
setInterval(runDailyCheck, CHECK_INTERVAL);
