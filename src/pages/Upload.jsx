// src/pages/Upload.jsx
import { useState, useRef } from "react";
import { uploadDataAPI } from "../utils/api";

const fmt = {
  rupiah: (n) => {
    if (n == null) return "-";
    if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
    if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(0)}jt`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  },
};

export default function Upload() {
  const [file,      setFile]     = useState(null);
  const [dragging,  setDragging] = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [result,    setResult]   = useState(null);
  const [error,     setError]    = useState(null);
  const [retrain,   setRetrain]  = useState(true);
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
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
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
            <div style={{ color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Yang dibaca dari file upload:</div>
            <ul style={{ color: "#64748b", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li><strong style={{ color: "#60a5fa" }}>ID ATM</strong> — sebagai kunci pencarian</li>
              <li><strong style={{ color: "#60a5fa" }}>Sisa Saldo</strong> — saldo saat ini</li>
              <li>Tanggal & Jam — dari nama file (ZIP) atau otomatis</li>
            </ul>
          </div>
          <div>
            <div style={{ color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Data diambil dari ATM Master SSI:</div>
            <ul style={{ color: "#64748b", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
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
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{formatSize(file.size)}</div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
              style={{ marginTop: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 6, color: "#64748b", padding: "4px 12px", fontSize: 11, cursor: "pointer" }}
            >✕ Ganti file</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>⬆</div>
            <div style={{ color: "#94a3b8", fontSize: 15, fontWeight: 600 }}>Drag & drop atau klik untuk pilih file</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>XLSX, CSV, atau ZIP · Kolom minimal: ID ATM + Sisa Saldo</div>
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
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(99,179,237,0.3)", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Status Banner */}
          <div style={{
            background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: 12, padding: "16px 20px",
          }}>
            <div style={{ color: "#1D9E75", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              ✅ {result.message}
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{result.source}</div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { label: "ID di File",       value: result.total_file,   color: "#60a5fa", icon: "📄" },
              { label: "Cocok di Master",  value: result.matched,      color: "#1D9E75", icon: "✓" },
              { label: "Dilewati",         value: result.skipped,      color: result.skipped > 0 ? "#EF9F27" : "#1D9E75", icon: result.skipped > 0 ? "⊕" : "✓" },
              { label: "Rows Diproses",    value: result.rows,         color: "#94a3b8", icon: "◈" },
              { label: "ATM Unik",         value: result.atm_count,    color: "#94a3b8", icon: "◉" },
              { label: "Prediksi",         value: result.predictions,  color: "#a78bfa", icon: "⟳" },
            ].map(s => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)",
                borderRadius: 10, padding: "14px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value ?? "-"}</div>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Skipped IDs warning */}
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

          {/* Warnings */}
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
                  <li key={i} style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Retrain info */}
          {result.retrain && (
            <div style={{
              background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#a78bfa",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>⟳</span>
              <div>
                <strong>Training berjalan di background.</strong> Cek status di halaman Training.
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}