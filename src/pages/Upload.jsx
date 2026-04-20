// src/pages/Upload.jsx
import { useState, useRef, useEffect } from "react";

const BASE = "http://localhost:8000";
const ACCEPTED = ".zip,.csv,.xlsx,.xls";

// Ambil log upload hari ini dari API
async function fetchTodayUploads() {
  try {
    const res = await fetch(`${BASE}/api/upload-log/today`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default function Upload() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [retrain, setRetrain] = useState(true);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const inputRef = useRef();

  const isZip = file?.name?.toLowerCase().endsWith(".zip");

  // Load today's upload log
  const loadTodayLogs = async () => {
    setLoadingLogs(true);
    const logs = await fetchTodayUploads();
    setTodayLogs(logs);
    setLoadingLogs(false);
  };

  useEffect(() => { loadTodayLogs(); }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); setErr(null); }
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
      // Refresh log setelah upload berhasil
      await loadTodayLogs();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fileIcon = isZip ? "🗜" : file?.name?.endsWith(".csv") ? "📄" : "📊";
  const fileColor = isZip ? "#a78bfa" : "#00e5a0";

  // Hitung ringkasan dari log hari ini
  const totalUploadsToday = todayLogs.length;
  const totalRowsToday    = todayLogs.reduce((s, l) => s + (l.total_rows || 0), 0);
  const totalAtmToday     = todayLogs.reduce((s, l) => s + (l.atm_count || 0), 0);
  const lastUpload        = todayLogs[0] || null;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Upload Data ATM
        </h1>
        <p style={{ color: "#64748b", fontSize: 13.5 }}>
          Upload file ZIP, CSV, atau Excel untuk diperbarui ke sistem monitoring
        </p>
      </div>

      {/* Layout utama: 2 kolom */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

        {/* ── Kolom Kiri: Upload ── */}
        <div>
          {/* Format Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
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
              padding: "48px 40px",
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
                <div style={{ fontSize: 44, marginBottom: 14 }}>{fileIcon}</div>
                <div style={{ color: fileColor, fontWeight: 600, fontSize: 16, marginBottom: 6, wordBreak: "break-all" }}>
                  {file.name}
                </div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {isZip && <span style={{ color: "#a78bfa", marginLeft: 12 }}>• ZIP terdeteksi</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setErr(null); }}
                  style={{ marginTop: 16, background: "transparent", border: "1px solid rgba(255,59,92,0.4)", color: "#ff3b5c", padding: "7px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                >
                  ✕ Ganti File
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 50, marginBottom: 14, opacity: 0.35 }}>⇧</div>
                <div style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
                  Drop file di sini
                </div>
                <div style={{ color: "#64748b", fontSize: 13.5 }}>atau klik untuk memilih file</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 10 }}>
                  Didukung: .zip • .csv • .xlsx • .xls
                </div>
              </>
            )}
          </div>

          {/* ZIP Structure Hint */}
          {isZip && (
            <div style={{ marginTop: 14, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Struktur ZIP yang diharapkan:</div>
              <pre style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.65, fontFamily: "monospace", background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, overflowX: "auto", margin: 0 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, padding: "10px 0" }}>
            <div
              onClick={() => setRetrain(!retrain)}
              style={{ width: 42, height: 24, borderRadius: 12, background: retrain ? "#3b82f6" : "rgba(255,255,255,0.12)", border: `1px solid ${retrain ? "#60a5fa" : "rgba(99,179,237,0.3)"}`, position: "relative", cursor: "pointer", transition: "all 0.25s" }}
            >
              <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: retrain ? 22 : 3, transition: "left 0.25s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
            </div>
            <span style={{ color: "#94a3b8", fontSize: 13.5 }}>
              Otomatis retrain model XGBoost setelah upload
            </span>
          </div>

          {/* Upload Button */}
          <button
            onClick={doUpload}
            disabled={!file || loading}
            style={{ width: "100%", marginTop: 6, padding: "14px", fontSize: 15, fontWeight: 600, borderRadius: 10, border: "none", background: file && !loading ? "linear-gradient(135deg, #3b82f6, #22d3ee)" : "rgba(255,255,255,0.06)", color: file && !loading ? "#fff" : "#64748b", cursor: file && !loading ? "pointer" : "default", transition: "all 0.2s" }}
          >
            {loading ? <LoadingDots label={isZip ? "Memproses ZIP..." : "Mengupload data..."} /> : `Upload ${isZip ? "ZIP" : "File"}`}
          </button>

          {/* Result */}
          {result && (
            <div style={{ marginTop: 20, background: "rgba(0,229,160,0.07)", border: "1px solid rgba(0,229,160,0.3)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ color: "#00e5a0", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>✓ Upload Berhasil</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                {[
                  { label: "Format", value: result.format || "-" },
                  { label: "Total Baris", value: result.rows?.toLocaleString() || "-" },
                  { label: "Jumlah ATM", value: result.atm_count || "-" },
                  { label: "Prediksi Cache", value: `${result.predictions || 0} ATM` },
                  { label: "Retrain", value: result.retrain ? "✓ Berjalan" : "Tidak" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ color: "#64748b", fontSize: 11 }}>{item.label}</div>
                    <div style={{ color: "#e2e8f0", fontWeight: 600, marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {err && (
            <div style={{ marginTop: 20, background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 12, padding: "14px 18px", color: "#ff3b5c" }}>
              ⚠ {err}
            </div>
          )}
        </div>

        {/* ── Kolom Kanan: Ringkasan Upload Hari Ini ── */}
        <div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.12)", borderRadius: 14, padding: "20px", position: "sticky", top: 20 }}>
            {/* Header panel */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>📅 Upload Hari Ini</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                  {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
              <button
                onClick={loadTodayLogs}
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, color: "#60a5fa", padding: "5px 10px", fontSize: 12, cursor: "pointer" }}
              >
                ↺
              </button>
            </div>

            {/* Stats ringkasan */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Upload", value: totalUploadsToday, color: "#60a5fa", icon: "↑" },
                { label: "Baris", value: totalRowsToday > 0 ? totalRowsToday.toLocaleString("id-ID") : "—", color: "#a78bfa", icon: "≡" },
                { label: "ATM", value: totalAtmToday > 0 ? totalAtmToday.toLocaleString("id-ID") : "—", color: "#00e5a0", icon: "◈" },
              ].map(s => (
                <div key={s.label} style={{ background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ color: s.color, fontSize: 11, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ color: s.color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: "#475569", fontSize: 9, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Upload terakhir */}
            {lastUpload && (
              <div style={{ background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.12)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Upload Terakhir</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, marginBottom: 3, wordBreak: "break-all" }}>
                  {lastUpload.filename || "-"}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: "#64748b", fontSize: 11 }}>
                    {lastUpload.uploaded_at
                      ? new Date(lastUpload.uploaded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                  <span style={{ color: "#a78bfa", fontSize: 11 }}>{lastUpload.format || "-"}</span>
                  <span style={{ color: "#00e5a0", fontSize: 11 }}>{(lastUpload.total_rows || 0).toLocaleString()} baris</span>
                  <span style={{ color: "#f59e0b", fontSize: 11 }}>{lastUpload.atm_count || 0} ATM</span>
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(99,179,237,0.08)", marginBottom: 14 }} />

            {/* List semua upload hari ini */}
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Riwayat Hari Ini
            </div>

            {loadingLogs ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 0", gap: 8, color: "#475569", fontSize: 12 }}>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Memuat...
              </div>
            ) : todayLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📭</div>
                <div style={{ color: "#475569", fontSize: 12 }}>Belum ada upload hari ini</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                {todayLogs.map((log, i) => (
                  <UploadLogItem key={log.id || i} log={log} isLatest={i === 0} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Upload Log Item ──────────────────────────────────────────────────────── */
function UploadLogItem({ log, isLatest }) {
  const [expanded, setExpanded] = useState(false);
  const timeStr = log.uploaded_at
    ? new Date(log.uploaded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";
  const statusOk = (log.status || "success") === "success";

  return (
    <div
      style={{ background: isLatest ? "rgba(0,229,160,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${isLatest ? "rgba(0,229,160,0.15)" : "rgba(99,179,237,0.08)"}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", transition: "background 0.15s" }}
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.05)"}
      onMouseLeave={e => e.currentTarget.style.background = isLatest ? "rgba(0,229,160,0.04)" : "rgba(255,255,255,0.02)"}
    >
      {/* Baris pertama: waktu + nama file */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ color: "#64748b", fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>{timeStr}</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusOk ? "#00e5a0" : "#ff3b5c", flexShrink: 0 }} />
        <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {log.filename || "—"}
        </span>
        {isLatest && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(0,229,160,0.12)", color: "#00e5a0", border: "1px solid rgba(0,229,160,0.2)", flexShrink: 0 }}>TERBARU</span>}
        <span style={{ color: "#475569", fontSize: 10, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Baris kedua: tag-tag ringkasan */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Tag color="#a78bfa">{log.format || "—"}</Tag>
        <Tag color="#60a5fa">{(log.total_rows || 0).toLocaleString("id-ID")} baris</Tag>
        <Tag color="#00e5a0">{log.atm_count || 0} ATM</Tag>
        {log.predictions > 0 && <Tag color="#f59e0b">{log.predictions} prediksi</Tag>}
        {log.retrain ? <Tag color="#a78bfa">retrain ✓</Tag> : null}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(99,179,237,0.08)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: "Filename", value: log.filename || "—" },
              { label: "Format", value: log.format || "—" },
              { label: "Total Baris", value: (log.total_rows || 0).toLocaleString("id-ID") },
              { label: "Jumlah ATM", value: (log.atm_count || 0).toLocaleString("id-ID") },
              { label: "Prediksi", value: log.predictions || 0 },
              { label: "Retrain", value: log.retrain ? "Ya" : "Tidak" },
              { label: "Status", value: log.status || "success" },
              { label: "Waktu Upload", value: log.uploaded_at ? new Date(log.uploaded_at).toLocaleString("id-ID") : "—" },
            ].map(f => (
              <div key={f.label}>
                <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500, wordBreak: "break-all" }}>{f.value}</div>
              </div>
            ))}
          </div>
          {log.notes && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 6, color: "#f59e0b", fontSize: 11 }}>
              📝 {log.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${color}10`, color, border: `1px solid ${color}25`, fontWeight: 500 }}>
      {children}
    </span>
  );
}

/* ─── Sub Components ──────────────────────────────────────────────────────── */
function FormatCard({ icon, label, desc, color, recommended }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${recommended ? color + "40" : "rgba(99,179,237,0.1)"}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</span>
        {recommended && (
          <span style={{ marginLeft: "auto", background: color + "20", color, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 9999 }}>DISARANKAN</span>
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.55 }}>{desc}</div>
    </div>
  );
}

function LoadingDots({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      {label}
    </div>
  );
}