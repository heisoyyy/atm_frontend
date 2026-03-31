import { useState, useRef } from "react";

const BASE = "http://localhost:8000";

const ACCEPTED = ".zip,.csv,.xlsx,.xls";  // xlsx/xls juga didukung di dalam ZIP

export default function Upload() {
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [err, setErr]           = useState(null);
  const [retrain, setRetrain]   = useState(true);
  const inputRef                = useRef();

  const isZip = file?.name?.toLowerCase().endsWith(".zip");

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); setErr(null); }
  };

  const doUpload = async () => {
    if (!file) return;
    setLoading(true); setErr(null); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${BASE}/api/upload?retrain=${retrain}`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Upload gagal");
      setResult(json);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const fileIcon = isZip ? "🗜" : file?.name?.endsWith(".csv") ? "📄" : "📊";
  const fileColor = file ? (isZip ? "#a78bfa" : "#00e5a0") : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Upload Data
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          Upload file ZIP (folder tanggal + 24 CSV/jam), processed_data.csv, atau Excel
        </p>
      </div>

      {/* Format info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <FormatCard
          icon="🗜"
          label="ZIP — Raw Data"
          desc="Folder YYYY-MM-DD/ berisi file per jam (00-23). Format: .csv, .xlsx, atau .xls. Kolom wajib: ID ATM, Sisa Saldo, Limit."
          color="#a78bfa"
          recommended
        />
        <FormatCard
          icon="📄"
          label="CSV / Excel — Processed"
          desc="Output processed_data.csv dari Colab V5. Langsung merge tanpa processing ulang."
          color="#60a5fa"
        />
      </div>

      {/* Drop zone */}
      <div
        style={{
          border: `2px dashed ${dragging ? "rgba(167,139,250,0.7)" : file ? `${fileColor}55` : "rgba(99,179,237,0.2)"}`,
          borderRadius: 12,
          padding: "44px 32px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(167,139,250,0.06)" : file ? `${fileColor}08` : "rgba(255,255,255,0.02)",
          transition: "all 0.2s",
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef} type="file" accept={ACCEPTED} style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setResult(null); setErr(null); } }}
        />
        {file ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{fileIcon}</div>
            <div style={{ color: fileColor, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{file.name}</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
              {isZip && <span style={{ color: "#a78bfa", marginLeft: 10, fontWeight: 600 }}>· ZIP terdeteksi ✓</span>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); setErr(null); }}
              style={{
                background: "transparent", border: "1px solid rgba(255,59,92,0.3)",
                borderRadius: 6, color: "#ff3b5c", padding: "4px 14px", fontSize: 12, cursor: "pointer",
              }}
            >✕ Hapus</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⇑</div>
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
              Drop file di sini atau klik untuk browse
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>ZIP · CSV · XLSX</div>
          </>
        )}
      </div>

      {/* ZIP structure hint */}
      {isZip && (
        <div style={{
          marginTop: 12, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: 9, padding: "12px 16px",
        }}>
          <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Struktur ZIP yang diharapkan:</div>
          <pre style={{ color: "#94a3b8", fontSize: 11, margin: 0, lineHeight: 1.7, fontFamily: "monospace" }}>
{`data.zip
└── 2026-03-31/
    ├── 00.csv  ← atau 00.xlsx / 00.xls
    ├── 01.csv  ← nama file = jam (0-23)
    ├── ...
    └── 23.csv  ← .csv / .xlsx / .xls`}
          </pre>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
            Boleh multi-folder (multi-hari). Format per file: .csv, .xlsx, atau .xls — tanggal dari nama folder, jam dari nama file.
          </div>
        </div>
      )}

      {/* Retrain toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <div
          onClick={() => setRetrain(!retrain)}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: retrain ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.1)",
            border: `1px solid ${retrain ? "#3b82f6" : "rgba(99,179,237,0.2)"}`,
            position: "relative", transition: "all 0.2s", cursor: "pointer", flexShrink: 0,
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 1, left: retrain ? 20 : 1,
            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }} />
        </div>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Otomatis retrain model XGBoost setelah upload</span>
      </div>

      {/* Upload button */}
      <button
        onClick={doUpload}
        disabled={!file || loading}
        style={{
          width: "100%", marginTop: 16,
          background: file && !loading
            ? "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(6,182,212,0.85))"
            : "rgba(255,255,255,0.05)",
          border: "1px solid rgba(59,130,246,0.4)",
          borderRadius: 10, color: file && !loading ? "#fff" : "#374151",
          padding: "13px", fontSize: 14, cursor: file && !loading ? "pointer" : "default",
          fontWeight: 600, transition: "all 0.2s",
        }}
      >
        {loading
          ? <LoadingDots label={isZip ? "Memproses ZIP & parsing CSV..." : "Mengupload & memproses..."} />
          : `⇑ Upload ${isZip ? "ZIP" : "Data"}`
        }
      </button>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: 18, background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.25)",
          borderRadius: 10, padding: "16px 20px",
        }}>
          <div style={{ color: "#00e5a0", fontWeight: 700, marginBottom: 12, fontSize: 15 }}>✓ Upload Berhasil</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: result.warnings ? 12 : 0 }}>
            {[
              { label: "Format",        val: result.format || "-" },
              { label: "Total Baris",   val: result.rows?.toLocaleString() },
              { label: "Jumlah ATM",    val: result.atm_count },
              { label: "Cache Prediksi",val: `${result.predictions} ATM` },
              { label: "Retrain",       val: result.retrain ? "✓ Berjalan di background" : "Tidak" },
            ].map(r => (
              <div key={r.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.label}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginTop: 2 }}>{r.val}</div>
              </div>
            ))}
          </div>
          {result.warnings?.length > 0 && (
            <div style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: 7, padding: "10px 14px" }}>
              <div style={{ color: "#f5c518", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>⚠ {result.warnings.length} file dilewati:</div>
              {result.warnings.map((w, i) => (
                <div key={i} style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>· {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {err && (
        <div style={{
          marginTop: 18, background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.25)",
          borderRadius: 10, padding: "14px 18px", color: "#ff3b5c", fontSize: 13,
        }}>
          ⚠ {err}
        </div>
      )}

      {/* Alur info */}
      <div style={{
        marginTop: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)",
        borderRadius: 10, padding: "16px 20px",
      }}>
        <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Alur Upload ZIP</div>
        {[
          ["1", "ZIP diekstrak di memory — tiap CSV dibaca", "#3b82f6"],
          ["2", "Tanggal diambil dari nama folder (YYYY-MM-DD)", "#a78bfa"],
          ["3", "Jam diambil dari nama file (00.csv = 00:00)", "#a78bfa"],
          ["4", "Data digabung & di-merge dengan data lama", "#06b6d4"],
          ["5", "process_dataframe() jalankan pipeline V5", "#06b6d4"],
          ["6", "Cache prediksi di-rebuild & model retrain (opsional)", "#00e5a0"],
        ].map(([n, s, c]) => (
          <div key={n} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ color: c, fontSize: 12, fontWeight: 700, minWidth: 18 }}>{n}.</span>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormatCard({ icon, label, desc, color, recommended }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${recommended ? `${color}33` : "rgba(99,179,237,0.08)"}`,
      borderRadius: 9, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color, fontSize: 12, fontWeight: 700 }}>{label}</span>
        {recommended && (
          <span style={{ marginLeft: "auto", background: `${color}18`, color, fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>
            DISARANKAN
          </span>
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: 11, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function LoadingDots({ label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      {label}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}
