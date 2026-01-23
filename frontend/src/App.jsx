import { useEffect, useState } from "react";

const statusColor = {
  OK: "green",
  WARN: "orange",
  CRITICAL: "darkorange",
  EXPIRED: "red",
  ERROR: "gray",
};

function App() {
  const [certs, setCerts] = useState([]);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCerts = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/certs");

      if (!res.ok) {
        throw new Error("API error: " + res.status);
      }

      const data = await res.json();
      setCerts(data);
    } catch (err) {
      console.error("Failed to load certs:", err);
    }
  };

  useEffect(() => {
    loadCerts();
  }, []);

  const addDomain = async () => {
    if (loading) return;

    setError("");
    if (!newDomain.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: newDomain.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка добавления домена");
        return;
      }

      setNewDomain("");
      loadCerts();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      <h1>SSL Monitor</h1>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="example.com"
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          style={{ padding: "6px", width: "250px", marginRight: "10px" }}
          onKeyDown={e => e.key === "Enter" && addDomain()}
        />
        <button onClick={addDomain} disabled={loading}>Добавить</button>
        {error && <div style={{ color: "red", marginTop: "5px" }}>{error}</div>}
      </div>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Host</th>
            <th>Days left</th>
            <th>Status</th>
            <th>Issuer</th>
          </tr>
        </thead>
        <tbody>
          {certs.map(cert => (
            <tr key={cert.host}>
              <td>{cert.host}</td>
              <td>{cert.days_left !== null ? cert.days_left : "—"}</td>
              <td style={{ color: statusColor[cert.status], fontWeight: "bold" }}>
                {cert.status}
              </td>
              <td>{cert.issuer || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
