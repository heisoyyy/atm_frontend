// src/pages/Upload.jsx
import { useState, useRef } from "react";

const BASE = "http://localhost:8000";
const ACCEPTED = ".zip,.csv,.xlsx,.xls";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [retrain, setRetrain] = useState(true);
  const inputRef = useRef();

  const isZip = file?.name?.toLowerCase().endsWith(".zip");

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setErr(null);
    }
  };

  const doUpload = async () => {
    if (!file) return;
    setLoading(true);
    setErr(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${BASE}/api/upload?retrain=${retrain}`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Upload gagal");
      setResult(json);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fileIcon = isZip ? "🗜" : file?.name?.endsWith(".csv") ? "📄" : "📊";
  const fileColor = isZip ? "#a78bfa" : "#00e5a0";

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          color: "#e2e8f0", 
          fontSize: 26, 
          fontWeight: 700, 
          margin: "0 0 6px", 
          letterSpacing: "-0.02em" 
        }}>
          Upload Data ATM
        </h1>
        <p style={{ color: "#64748b", fontSize: 13.5 }}>
          Upload file ZIP, CSV, atau Excel untuk diperbarui ke sistem monitoring
        </p>
      </div>

      {/* Format Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        <FormatCard
          icon="🗜"
          label="ZIP — Raw Data"
          desc="Mengandung folder tanggal (YYYY-MM-DD) dengan file per jam (00.csv sampai 23.csv). Direkomendasikan untuk data lengkap."
          color="#a78bfa"
          recommended
        />
        <FormatCard
          icon="📄"
          label="CSV / Excel — Processed"
          desc="File processed_data.csv hasil dari Colab V6. Langsung diproses tanpa ekstraksi ulang."
          color="#60a5fa"
        />
      </div>

      {/* Drop Zone */}
      <div
        style={{
          border: `2px dashed ${dragging ? "#a78bfa" : file ? `${fileColor}88` : "rgba(99,179,237,0.25)"}`,
          borderRadius: 14,
          padding: "52px 40px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging 
            ? "rgba(167,139,250,0.08)" 
            : file 
              ? `${fileColor}08` 
              : "rgba(255,255,255,0.015)",
          transition: "all 0.25s ease",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files[0]) {
              setFile(e.target.files[0]);
              setResult(null);
              setErr(null);
            }
          }}
        />

        {file ? (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{fileIcon}</div>
            <div style={{ 
              color: fileColor, 
              fontWeight: 600, 
              fontSize: 16, 
              marginBottom: 6,
              wordBreak: "break-all"
            }}>
              {file.name}
            </div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
              {isZip && <span style={{ color: "#a78bfa", marginLeft: 12 }}>• ZIP terdeteksi</span>}
            </div>

            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                setFile(null); 
                setResult(null); 
                setErr(null); 
              }}
              style={{
                marginTop: 18,
                background: "transparent",
                border: "1px solid rgba(255,59,92,0.4)",
                color: "#ff3b5c",
                padding: "7px 18px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ✕ Ganti File
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 54, marginBottom: 16, opacity: 0.35 }}>⇧</div>
            <div style={{ 
              color: "#e2e8f0", 
              fontSize: 17, 
              fontWeight: 600, 
              marginBottom: 6 
            }}>
              Drop file di sini
            </div>
            <div style={{ color: "#64748b", fontSize: 13.5 }}>
              atau klik untuk memilih file
            </div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 10 }}>
              Didukung: .zip • .csv • .xlsx • .xls
            </div>
          </>
        )}
      </div>

      {/* ZIP Structure Hint */}
      {isZip && (
        <div style={{
          marginTop: 16,
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.25)",
          borderRadius: 10,
          padding: "16px 20px",
        }}>
          <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
            Struktur ZIP yang diharapkan:
          </div>
          <pre style={{ 
            color: "#94a3b8", 
            fontSize: 12.5, 
            lineHeight: 1.65, 
            fontFamily: "monospace",
            background: "rgba(0,0,0,0.2)",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto"
          }}>
{`data.zip
└── 2026-03-31/
    ├── 00.csv
    ├── 01.csv
    ├── ...
    └── 23.csv`}
          </pre>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 10 }}>
            Nama folder = tanggal • Nama file = jam (00–23). Boleh multi-hari.
          </div>
        </div>
      )}

      {/* Retrain Toggle */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 14, 
        marginTop: 20,
        padding: "12px 0"
      }}>
        <div
          onClick={() => setRetrain(!retrain)}
          style={{
            width: 42, 
            height: 24, 
            borderRadius: 12,
            background: retrain ? "#3b82f6" : "rgba(255,255,255,0.12)",
            border: `1px solid ${retrain ? "#60a5fa" : "rgba(99,179,237,0.3)"}`,
            position: "relative",
            cursor: "pointer",
            transition: "all 0.25s",
          }}
        >
          <div style={{
            width: 18,
            height: 18,
            background: "#fff",
            borderRadius: "50%",
            position: "absolute",
            top: 2,
            left: retrain ? 22 : 3,
            transition: "left 0.25s ease",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }} />
        </div>
        <span style={{ color: "#94a3b8", fontSize: 13.5 }}>
          Otomatis retrain model XGBoost setelah upload
        </span>
      </div>

      {/* Upload Button */}
      <button
        onClick={doUpload}
        disabled={!file || loading}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "14px",
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 10,
          border: "none",
          background: file && !loading 
            ? "linear-gradient(135deg, #3b82f6, #22d3ee)" 
            : "rgba(255,255,255,0.06)",
          color: file && !loading ? "#fff" : "#64748b",
          cursor: file && !loading ? "pointer" : "default",
          transition: "all 0.2s",
        }}
      >
        {loading ? (
          <LoadingDots label={isZip ? "Memproses ZIP..." : "Mengupload data..."} />
        ) : (
          `Upload ${isZip ? "ZIP" : "File"}`
        )}
      </button>

      {/* Result & Error */}
      {result && (
        <div style={{
          marginTop: 24,
          background: "rgba(0,229,160,0.07)",
          border: "1px solid rgba(0,229,160,0.3)",
          borderRadius: 12,
          padding: "18px 22px",
        }}>
          <div style={{ color: "#00e5a0", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
            ✓ Upload Berhasil
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { label: "Format", value: result.format || "-" },
              { label: "Total Baris", value: result.rows?.toLocaleString() || "-" },
              { label: "Jumlah ATM", value: result.atm_count || "-" },
              { label: "Prediksi Cache", value: `${result.predictions || 0} ATM` },
              { label: "Retrain", value: result.retrain ? "✓ Berjalan" : "Tidak" },
            ].map((item, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
                padding: "10px 14px",
              }}>
                <div style={{ color: "#64748b", fontSize: 11 }}>{item.label}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 600, marginTop: 2 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && (
        <div style={{
          marginTop: 24,
          background: "rgba(255,59,92,0.08)",
          border: "1px solid rgba(255,59,92,0.3)",
          borderRadius: 12,
          padding: "16px 20px",
          color: "#ff3b5c",
        }}>
          ⚠ {err}
        </div>
      )}
    </div>
  );
}

/* ==================== SUB COMPONENTS ==================== */

function FormatCard({ icon, label, desc, color, recommended }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${recommended ? color + "40" : "rgba(99,179,237,0.1)"}`,
      borderRadius: 10,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>{label}</span>
        {recommended && (
          <span style={{
            marginLeft: "auto",
            background: color + "20",
            color: color,
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 9999,
          }}>
            DISARANKAN
          </span>
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: 12.5, lineHeight: 1.55 }}>
        {desc}
      </div>
    </div>
  );
}

function LoadingDots({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{
        width: 18,
        height: 18,
        border: "2.5px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}