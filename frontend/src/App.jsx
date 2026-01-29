import "./App.css";
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
      const res = await fetch("/api/certs");

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
      const res = await fetch("/api/domains", {
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

  const deleteDomain = async (host) => {
    if (!confirm(`Удалить ${host}?`)) return;
    await fetch(`/api/domains/${host}`, { method: "DELETE" });
    loadCerts();
  };

  return (
    <div className="app-container">  
      <div className="card">
        <h1 className="header">🔐 SSL Certificate Monitor</h1>

        <div className="form-row">
          <input
            className="domain-input"
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDomain()}
          />
          <button
            className="add-button"
            onClick={addDomain}
            disabled={loading}
          >
            {loading ? "Добавление..." : "Добавить"}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Host</th>
                <th className="days">Days left</th>
                <th className="expires">Expires at</th>
                <th className="status">Status</th>
                <th>Issuer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certs.map(cert => (
                <tr key={cert.host}
                  className={
                    cert.status === "EXPIRED"
                    ? "row-expired"
                    : cert.status === "CRITICAL"
                    ? "row-critical"
                    : ""
                  }
                >
                  <td>{cert.host}</td>
                  <td className="days">{cert.days_left ?? "—"}</td>
                  <td className="expires">
                    {cert.valid_to
                      ? new Date(cert.valid_to).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                  <td className="status">
                    <span className={`status-badge status-${cert.status.toLowerCase()}`}>
                      {cert.status}
                    </span>
                  </td>
                  <td>{cert.issuer || "N/A"}</td>
                  <td>
                    <button className="delete-btn" title="Удалить" onClick={() => deleteDomain(cert.host)}>
                      ✖
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
