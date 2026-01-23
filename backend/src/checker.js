const tls = require("tls");

function getStatus(daysLeft) {
  if (daysLeft <= 0) return "EXPIRED";
  if (daysLeft <= 7) return "CRITICAL";
  if (daysLeft <= 20) return "WARN";
  return "OK";
}

function getCertificateInfo(host, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(port, host, { servername: host }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert || !cert.valid_to) {
        return reject(new Error("No certificate received"));
      }

      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

      resolve({
        host,
        valid_to: validTo.toISOString(),
        days_left: daysLeft,
        status: getStatus(daysLeft),
        issuer: cert.issuer?.O || "Unknown"
      });
    });

    socket.on("error", reject);
  });
}

module.exports = { getCertificateInfo };
