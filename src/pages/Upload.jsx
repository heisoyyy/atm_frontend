// src/pages/Upload.jsx
import { useState, useRef, useEffect } from "react";
import { uploadDataAPI } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const fmt = {
  rupiah: (n) => {
    if (n == null) return "-";
    if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
    if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(0)}jt`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  },
  date: (str) => {
    if (!str) return "-";
    const d = new Date(str);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
  },
  time: (str) => {
    if (!str) return "-";
    const d = new Date(str);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  },
  datetime: (str) => {
    if (!str) return "-";
    const d = new Date(str);
    return d.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  },
};

const todayStr = () => new Date().toISOString().split("T")[0];

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    ok:      { bg: "rgba(29,158,117,0.15)",   border: "rgba(29,158,117,0.4)",   color: "#1D9E75", label: "Berhasil" },
    error:   { bg: "rgba(255,59,92,0.12)",    border: "rgba(255,59,92,0.35)",   color: "#ff3b5c", label: "Error" },
    warning: { bg: "rgba(239,159,39,0.12)",   border: "rgba(239,159,39,0.35)",  color: "#EF9F27", label: "Warning" },
  };
  const s = cfg[status] || cfg.ok;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

// ── Format badge ──────────────────────────────────────────────
function FormatBadge({ format }) {
  const color = format?.toLowerCase().includes("zip") ? "#a78bfa" : "#60a5fa";
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}40`, color,
      borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
    }}>{format || "-"}</span>
  );
}

// ══════════════════════════════════════════════════════════════
//  UPLOAD LOG SECTION
// ══════════════════════════════════════════════════════════════
function UploadLogSection() {
  const [logs,        setLogs]       = useState([]);
  const [loading,     setLoading]    = useState(false);
  const [filterDate,  setFilterDate] = useState(todayStr());
  const [expanded,    setExpanded]   = useState(null);

  const fetchLogs = async (date) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/upload-log?limit=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Gagal fetch log");
      const data = await res.json();

      // Filter by date on frontend
      const filtered = (data.data || []).filter((r) => {
        if (!date) return true;
        const logDate = (r.uploaded_at || "").split("T")[0];
        return logDate === date;
      });
      setLogs(filtered);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(filterDate);
  }, [filterDate]);

  const totalRows     = logs.reduce((s, r) => s + (r.total_rows || 0), 0);
  const totalAtm      = logs.reduce((s, r) => s + (r.atm_count || 0), 0);
  const totalPred     = logs.reduce((s, r) => s + (r.predictions || 0), 0);

  return (
    <div style={{ marginTop: 36 }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, margin: "0 0 2px" }}>
            Riwayat Upload
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>
            Histori file yang telah diupload — filter berdasarkan tanggal
          </p>
        </div>

        {/* Filter date */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ color: "#94a3b8", fontSize: 12 }}>Tanggal:</label>
          <input
            type="date"
            value={filterDate}
            max={todayStr()}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(99,179,237,0.2)",
              borderRadius: 8, color: "#e2e8f0",
              padding: "7px 12px", fontSize: 13,
              outline: "none", cursor: "pointer",
            }}
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              title="Tampilkan semua"
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,179,237,0.15)",
                borderRadius: 7, color: "#94a3b8", padding: "7px 11px", fontSize: 12,
                cursor: "pointer",
              }}
            >Semua</button>
          )}
          <button
            onClick={() => fetchLogs(filterDate)}
            style={{
              background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.35)",
              borderRadius: 7, color: "#60a5fa", padding: "7px 14px", fontSize: 12,
              cursor: "pointer", fontWeight: 600,
            }}
          >⟳ Refresh</button>
        </div>
      </div>

      {/* Summary chips */}
      {logs.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Upload hari ini", value: logs.length,  color: "#60a5fa" },
            { label: "Total rows",      value: totalRows.toLocaleString("id-ID"), color: "#e2e8f0" },
            { label: "ATM unik",        value: totalAtm,     color: "#e2e8f0" },
            { label: "Prediksi",        value: totalPred,    color: "#a78bfa" },
          ].map((c) => (
            <div key={c.label} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,179,237,0.1)",
              borderRadius: 9, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: c.color, fontWeight: 700, fontSize: 16 }}>{c.value}</span>
              <span style={{ color: "#64748b", fontSize: 11 }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(99,179,237,0.1)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 80px",
          gap: 0,
          padding: "10px 18px",
          background: "rgba(99,179,237,0.04)",
          borderBottom: "1px solid rgba(99,179,237,0.1)",
        }}>
          {["Nama File", "Format", "Rows", "ATM", "Prediksi", "Status", "Waktu"].map((h) => (
            <div key={h} style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{
              display: "inline-block", width: 20, height: 20,
              border: "2px solid rgba(99,179,237,0.2)", borderTopColor: "#60a5fa",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 10 }}>Memuat riwayat upload...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}> </div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {filterDate
                ? `Tidak ada upload pada ${new Date(filterDate + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`
                : "Belum ada riwayat upload"}
            </div>
          </div>
        ) : (
          logs.map((row, i) => (
            <div key={row.id || i}>
              {/* Main row */}
              <div
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 80px",
                  gap: 0,
                  padding: "12px 18px",
                  borderBottom: i < logs.length - 1 || expanded === i ? "1px solid rgba(99,179,237,0.06)" : "none",
                  cursor: row.notes ? "pointer" : "default",
                  background: expanded === i ? "rgba(59,130,246,0.04)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Filename */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {row.notes && (
                    <span style={{ color: "#60a5fa", fontSize: 10, flexShrink: 0 }}>
                      {expanded === i ? "▼" : "▶"}
                    </span>
                  )}
                  <span style={{
                    color: "#e2e8f0", fontSize: 12, fontFamily: "monospace",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontWeight: 500,
                  }} title={row.filename}>
                    {row.filename || "-"}
                  </span>
                </div>

                {/* Format */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <FormatBadge format={row.format} />
                </div>

                {/* Rows */}
                <div style={{ color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center" }}>
                  {(row.total_rows || 0).toLocaleString("id-ID")}
                </div>

                {/* ATM count */}
                <div style={{ color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center" }}>
                  {row.atm_count || 0}
                </div>

                {/* Predictions */}
                <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center" }}>
                  {row.predictions || 0}
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <StatusBadge status={row.status || "ok"} />
                </div>

                {/* Waktu */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>
                    {fmt.time(row.uploaded_at)}
                  </span>
                  <span style={{ color: "#475569", fontSize: 10 }}>
                    {fmt.date(row.uploaded_at)}
                  </span>
                </div>
              </div>

              {/* Expanded notes */}
              {expanded === i && row.notes && (
                <div style={{
                  padding: "10px 18px 14px 42px",
                  borderBottom: i < logs.length - 1 ? "1px solid rgba(99,179,237,0.06)" : "none",
                  background: "rgba(59,130,246,0.03)",
                }}>
                  <div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                    Catatan
                  </div>
                  <div style={{
                    color: "#EF9F27", fontSize: 12, fontFamily: "monospace",
                    background: "rgba(239,159,39,0.05)", border: "1px solid rgba(239,159,39,0.2)",
                    borderRadius: 6, padding: "8px 12px", lineHeight: 1.7,
                    wordBreak: "break-all",
                  }}>
                    {row.notes}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {logs.length > 0 && (
        <div style={{ color: "#475569", fontSize: 11, textAlign: "right", marginTop: 8 }}>
          Menampilkan {logs.length} entri
          {filterDate ? ` — ${new Date(filterDate + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}` : ""}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  MAIN UPLOAD PAGE
// ══════════════════════════════════════════════════════════════
export default function Upload() {
  const [file,      setFile]     = useState(null);
  const [dragging,  setDragging] = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [result,    setResult]   = useState(null);
  const [error,     setError]    = useState(null);
  const [retrain,   setRetrain]  = useState(true);
  const [logKey,    setLogKey]   = useState(0); // trigger refresh log
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "xlsm", "csv", "zip"].includes(ext)) {
      setError("Format tidak didukung. Gunakan XLSX, CSV, atau ZIP.");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadDataAPI(file, retrain);
      setResult(res);
      setLogKey((k) => k + 1); // refresh log setelah upload
    } catch (e) {
      setError(e.message || "Upload gagal.");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Upload Data Monitoring
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
          Upload file monitoring saldo ATM · Data ATM diambil otomatis dari ATM Master SSI
        </p>
      </div>

      {/* Info Box */}
      <div style={{
        background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 24,
      }}>
        <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          ℹ️ Cara Kerja Upload
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
          <div>
            <div style={{ color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>Yang dibaca dari file upload:</div>
            <ul style={{ color: "#94a3b8", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li><strong style={{ color: "#60a5fa" }}>ID ATM</strong> — sebagai kunci pencarian</li>
              <li><strong style={{ color: "#60a5fa" }}>Sisa Saldo</strong> — saldo saat ini</li>
              <li>Tanggal & Jam — dari nama file (ZIP) atau otomatis</li>
            </ul>
          </div>
          <div>
            <div style={{ color: "#cbd5e1", marginBottom: 6, fontWeight: 600 }}>Data diambil dari ATM Master SSI:</div>
            <ul style={{ color: "#94a3b8", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Merk ATM, Lokasi, Alamat</li>
              <li>Denom, Lembar, Limit</li>
              <li>Wilayah (Pekanbaru/Batam/dll)</li>
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(239,159,39,0.08)", borderRadius: 8, fontSize: 12, color: "#EF9F27" }}>
          ⚠ ID ATM yang tidak ada di ATM Master SSI akan dilewati dan muncul di daftar warning.
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#60a5fa" : file ? "rgba(29,158,117,0.5)" : "rgba(99,179,237,0.2)"}`,
          borderRadius: 14,
          padding: "40px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(59,130,246,0.06)" : file ? "rgba(29,158,117,0.04)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s",
          marginBottom: 20,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv,.zip"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {file ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ color: "#1D9E75", fontWeight: 700, fontSize: 15 }}>{file.name}</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{formatSize(file.size)}</div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
              style={{
                marginTop: 10, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(99,179,237,0.15)", borderRadius: 6,
                color: "#94a3b8", padding: "4px 12px", fontSize: 11, cursor: "pointer",
              }}
            >✕ Ganti file</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>⬆</div>
            <div style={{ color: "#cbd5e1", fontSize: 15, fontWeight: 600 }}>Drag & drop atau klik untuk pilih file</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>XLSX, CSV, atau ZIP · Kolom minimal: ID ATM + Sisa Saldo</div>
          </div>
        )}
      </div>

      {/* Options & Upload Button */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div
            onClick={() => setRetrain(v => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: retrain ? "#3b82f6" : "rgba(255,255,255,0.1)",
              position: "relative", transition: "background 0.2s", cursor: "pointer",
            }}
          >
            <div style={{
              position: "absolute", top: 2, left: retrain ? 18 : 2,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s",
            }} />
          </div>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Auto retrain setelah upload</span>
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            background: !file || loading ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.2)",
            border: `1px solid ${!file || loading ? "rgba(99,179,237,0.1)" : "rgba(59,130,246,0.5)"}`,
            borderRadius: 10, color: !file || loading ? "#374151" : "#60a5fa",
            padding: "11px 32px", fontSize: 14, fontWeight: 700,
            cursor: !file || loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                display: "inline-block", width: 14, height: 14,
                border: "2px solid rgba(99,179,237,0.3)", borderTopColor: "#60a5fa",
                borderRadius: "50%", animation: "spin 0.8s linear infinite",
              }} />
              Memproses...
            </span>
          ) : "⬆ Upload & Proses"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          color: "#ff3b5c", background: "rgba(255,59,92,0.08)",
          border: "1px solid rgba(255,59,92,0.3)", borderRadius: 10,
          padding: "14px 18px", marginBottom: 20, fontSize: 13,
        }}>⚠ {error}</div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          <div style={{
            background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: 12, padding: "16px 20px",
          }}>
            <div style={{ color: "#1D9E75", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              ✅ {result.message}
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{result.source}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { label: "ID di File",      value: result.total_file,  color: "#60a5fa" },
              { label: "Cocok di Master", value: result.matched,     color: "#1D9E75" },
              { label: "Dilewati",        value: result.skipped,     color: result.skipped > 0 ? "#EF9F27" : "#1D9E75" },
              { label: "Rows Diproses",   value: result.rows,        color: "#e2e8f0" },
              { label: "ATM Unik",        value: result.atm_count,   color: "#e2e8f0" },
              { label: "Prediksi",        value: result.predictions, color: "#a78bfa" },
            ].map(s => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)",
                borderRadius: 10, padding: "14px 16px", textAlign: "center",
              }}>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value ?? "-"}</div>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {result.skipped_ids?.length > 0 && (
            <div style={{
              background: "rgba(239,159,39,0.06)", border: "1px solid rgba(239,159,39,0.25)",
              borderRadius: 10, padding: "14px 18px",
            }}>
              <div style={{ color: "#EF9F27", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                ⊕ {result.skipped_ids.length} ID ATM tidak ditemukan di ATM Master SSI (dilewati):
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.skipped_ids.map(id => (
                  <span key={id} style={{
                    background: "rgba(239,159,39,0.1)", color: "#EF9F27",
                    border: "1px solid rgba(239,159,39,0.3)", borderRadius: 5,
                    padding: "2px 10px", fontSize: 12, fontFamily: "monospace", fontWeight: 600,
                  }}>{id}</span>
                ))}
              </div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
                Tambahkan ID ATM ini ke ATM Master (menu Data → ATM Master) agar bisa termonitor.
              </div>
            </div>
          )}

          {result.warnings?.length > 0 && (
            <div style={{
              background: "rgba(127,119,221,0.06)", border: "1px solid rgba(127,119,221,0.2)",
              borderRadius: 10, padding: "14px 18px",
            }}>
              <div style={{ color: "#7F77DD", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                Catatan ({result.warnings.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.warnings.map((w, i) => (
                  <li key={i} style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.retrain && (
            <div style={{
              background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#a78bfa",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>⟳</span>
              <div><strong>Training berjalan di background.</strong> Cek status di halaman Training.</div>
            </div>
          )}
        </div>
      )}

      {/* ── Upload Log ── */}
      <UploadLogSection key={logKey} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5) sepia(1) saturate(2) hue-rotate(190deg);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}