// src/pages/Monitoring.jsx
import { useState, useEffect, useMemo } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

const THR_BONGKAR = 20;
const THR_AWAS    = 30;
const THR_TRIGGER = 35;

const WILAYAH     = ["Semua", "Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"];
const STATUS_LIST = ["Semua", "BONGKAR", "AWAS", "PERLU PANTAU", "AMAN", "OVERFUND"];
const TIPE_LIST   = ["Semua", "EMV", "CRM"];

export default function Monitoring({ navigateTo }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [wilayah, setWilayah] = useState("Semua");
  const [status, setStatus]   = useState("Semua");
  const [tipe, setTipe]       = useState("Semua");
  const [sort, setSort]       = useState({ key: "skor_urgensi", dir: -1 });
  const [page, setPage]       = useState(0);
  const [pageSize, setPageSize] = useState(20);


  useEffect(() => {
    apiFetch("/api/predictions?limit=500")
      .then(r => { setData(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let d = data;
    if (wilayah !== "Semua") d = d.filter(r => r.wilayah === wilayah);
    if (status  !== "Semua") d = d.filter(r => r.status  === status);
    if (tipe    !== "Semua") d = d.filter(r => r.tipe    === tipe);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r => r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q));
    }
    return [...d].sort((a, b) => {
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [data, wilayah, status, tipe, search, sort]);

  const paged   = pageSize === "all" ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize);
  const maxPage = pageSize === "all" ? 1 : Math.ceil(filtered.length / pageSize);

  const toggleSort = (key) => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(0); };

  const counts = useMemo(() => {
    const c = { BONGKAR: 0, AWAS: 0, "PERLU PANTAU": 0, AMAN: 0, OVERFUND: 0 };
    data.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [data]);

  if (loading) return <Spinner />;

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <span style={{ opacity:0.3, marginLeft:4 }}>⇅</span>;
    return <span style={{ marginLeft:4, color:"#60a5fa" }}>{sort.dir > 0 ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ color:"#e2e8f0", fontSize:24, fontWeight:700, margin:"0 0 4px", letterSpacing:"-0.02em" }}>
          Monitoring ATM
        </h1>
        <p style={{ color:"#64748b", fontSize:13, margin:0 }}>
          {filtered.length} dari {data.length} ATM ditampilkan
        </p>
      </div>

      {/* Status Summary Bar */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { key:"BONGKAR",      color:"#E24B4A", bg:"rgba(226,75,74,0.1)",    border:"rgba(226,75,74,0.3)",    desc:`≤${THR_BONGKAR}%` },
          { key:"AWAS",         color:"#EF9F27", bg:"rgba(239,159,39,0.1)",   border:"rgba(239,159,39,0.3)",   desc:`${THR_BONGKAR}–${THR_AWAS}%` },
          { key:"PERLU PANTAU", color:"#d4b800", bg:"rgba(212,184,0,0.08)",   border:"rgba(212,184,0,0.3)",    desc:`${THR_AWAS}–${THR_TRIGGER}%` },
          { key:"AMAN",         color:"#1D9E75", bg:"rgba(29,158,117,0.08)",  border:"rgba(29,158,117,0.25)",  desc:`>${THR_TRIGGER}%` },
          { key:"OVERFUND",     color:"#7F77DD", bg:"rgba(127,119,221,0.08)", border:"rgba(127,119,221,0.25)", desc:">100%" },
        ].map(s => (
          <button key={s.key}
            onClick={() => { setStatus(status === s.key ? "Semua" : s.key); setPage(0); }}
            style={{
              background: status === s.key ? s.bg : "rgba(255,255,255,0.02)",
              border:`1px solid ${status === s.key ? s.border : "rgba(99,179,237,0.08)"}`,
              borderRadius:8, padding:"8px 14px", cursor:"pointer", transition:"all 0.15s",
              display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2,
            }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:s.color, fontSize:18, fontWeight:700, lineHeight:1 }}>{counts[s.key] ?? 0}</span>
              <span style={{ color:s.color, fontSize:11, fontWeight:600 }}>{s.key}</span>
            </div>
            <span style={{ color:"#475569", fontSize:10 }}>{s.desc}</span>
          </button>
        ))}
        {status !== "Semua" && (
          <button onClick={() => { setStatus("Semua"); setPage(0); }} style={{
            background:"transparent", border:"1px solid rgba(99,179,237,0.12)",
            borderRadius:8, padding:"8px 12px", color:"#64748b", fontSize:11, cursor:"pointer",
          }}>✕ Reset filter</button>
        )}
      </div>

      {/* Search & Filter */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="Cari ID ATM atau lokasi..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(99,179,237,0.15)",
            borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:13, width:220, outline:"none",
          }}
        />
        {[
          { label:"Wilayah", val:wilayah, set:setWilayah, opts:WILAYAH },
          { label:"Status",  val:status,  set:setStatus,  opts:STATUS_LIST },
          { label:"Tipe",    val:tipe,    set:setTipe,    opts:TIPE_LIST },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }}
            style={{
              background:"#0d1228", border:"1px solid rgba(99,179,237,0.15)",
              borderRadius:8, color:"#94a3b8", padding:"8px 12px", fontSize:13, cursor:"pointer", outline:"none",
            }}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        {/* Per-page selector */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"#64748b", fontSize:12 }}>Tampilkan:</span>
          <div style={{ display:"flex", gap:4 }}>
            {[10, 50, 100, "all"].map(v => (
              <button key={v} onClick={() => { setPageSize(v); setPage(0); }}
                style={{
                  padding:"5px 10px", borderRadius:6,
                  border:      pageSize === v ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(99,179,237,0.12)",
                  background:  pageSize === v ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
                  color:       pageSize === v ? "#60a5fa" : "#64748b",
                  fontSize:12, fontWeight: pageSize === v ? 700 : 400,
                  cursor:"pointer", transition:"all 0.15s",
                }}>
                {v === "all" ? "Semua" : v}
              </button>
            ))}
          </div>
          <span style={{ color:"#475569", fontSize:12 }}>
            {pageSize === "all"
              ? `${filtered.length} ATM`
              : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} / ${filtered.length}`
            }
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(99,179,237,0.08)", borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(99,179,237,0.1)" }}>
                {[
                  { label:"Ranking",    key:"ranking" },
                  { label:"ID ATM",     key:"id_atm" },
                  { label:"Lokasi",     key:"lokasi" },
                  { label:"Wilayah",    key:"wilayah" },
                  { label:"Saldo",      key:"saldo" },
                  { label:"% Saldo",    key:"pct_saldo" },
                  { label:"Est. Habis", key:"est_jam" },
                  { label:"Tgl Isi",    key:"tgl_isi" },
                  { label:"Status",     key:"status" },
                  { label:"Skor",       key:"skor_urgensi" },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{
                    padding:"12px 14px", textAlign:"left",
                    color: sort.key === col.key ? "#60a5fa" : "#64748b",
                    fontWeight:600, fontSize:11, letterSpacing:"0.08em",
                    textTransform:"uppercase", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap",
                  }}>
                    {col.label}<SortIcon k={col.key} />
                  </th>
                ))}
                <th style={{ padding:"12px 14px", color:"#64748b", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding:"40px 20px", textAlign:"center", color:"#64748b", fontSize:13 }}>
                    Tidak ada ATM yang sesuai filter
                  </td>
                </tr>
              ) : paged.map((row, i) => {
                const sc        = STATUS_COLOR[row.status] || "#6b7280";
                const sb        = STATUS_BG[row.status]   || "transparent";
                const rowBg     = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
                const isBongkar = row.status === "BONGKAR";
                const isAwas    = row.status === "AWAS";

                return (
                  <tr key={row.id_atm} style={{
                    background: isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : rowBg,
                    borderBottom:"1px solid rgba(99,179,237,0.04)", transition:"background 0.1s",
                    borderLeft: isBongkar ? "2px solid rgba(226,75,74,0.5)" : isAwas ? "2px solid rgba(239,159,39,0.4)" : "2px solid transparent",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : rowBg}
                  >
                    <td style={{ padding:"10px 14px", color:"#64748b" }}>#{row.ranking}</td>
                    <td style={{ padding:"10px 14px", fontWeight:600, color:"#e2e8f0", fontFamily:"monospace" }}>
                      {row.id_atm}
                      {row.atm_sepi && (
                        <span style={{ marginLeft:6, fontSize:9, color:"#7F77DD", background:"rgba(127,119,221,0.1)", padding:"1px 5px", borderRadius:3 }}>SEPI</span>
                      )}
                    </td>
                    <td style={{ padding:"10px 14px", color:"#94a3b8", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={row.lokasi}>
                      {row.lokasi || "-"}
                    </td>
                    <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{row.wilayah || "-"}</td>
                    <td style={{ padding:"10px 14px", color:"#e2e8f0", fontWeight:600 }}>{fmt.rupiah(row.saldo)}</td>
                    <td style={{ padding:"10px 14px" }}><SaldoBar pct={row.pct_saldo} /></td>
                    <td style={{ padding:"10px 14px", color: row.est_jam != null && row.est_jam < 24 ? "#E24B4A" : "#94a3b8", fontWeight: row.est_jam != null && row.est_jam < 24 ? 600 : 400 }}>
                      {fmt.jam(row.est_jam)}
                    </td>
                    <td style={{ padding:"10px 14px", color:"#94a3b8", fontSize:12 }}>
                      {row.tgl_isi ? `${row.tgl_isi} ${row.jam_isi || ""}` : "-"}
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:5, background:sb, color:sc, whiteSpace:"nowrap", border:`1px solid ${sc}33` }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:36, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
                          <div style={{ height:"100%", width:`${Math.min(row.skor_urgensi || 0, 100)}%`, background:sc, borderRadius:2 }} />
                        </div>
                        <span style={{ color:sc, fontSize:12, fontWeight:600, minWidth:28 }}>{row.skor_urgensi?.toFixed(0) ?? "-"}</span>
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <button onClick={() => navigateTo("history", row.id_atm)} style={{
                        background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.2)",
                        borderRadius:6, color:"#60a5fa", padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600,
                      }}>Detail</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ────────────────────────────────────────────────── */}
        {maxPage > 1 && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"12px 20px", borderTop:"1px solid rgba(99,179,237,0.08)",
            flexWrap:"wrap", gap:10,
          }}>
            {/* Info */}
            <span style={{ color:"#64748b", fontSize:12 }}>
              Halaman <strong style={{ color:"#94a3b8" }}>{page + 1}</strong> dari <strong style={{ color:"#94a3b8" }}>{maxPage}</strong>
              {" "}·{" "}
              <strong style={{ color:"#94a3b8" }}>{filtered.length}</strong> ATM
            </span>

            {/* Pagination buttons */}
            <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
              {/* First */}
              <NavBtn disabled={page === 0} onClick={() => setPage(0)} title="Halaman pertama">«</NavBtn>
              {/* Prev */}
              <NavBtn disabled={page === 0} onClick={() => setPage(p => p - 1)} title="Sebelumnya">‹</NavBtn>

              {/* Numbered pages */}
              {buildPageRange(page, maxPage).map((p_, idx) =>
                p_ === "…" ? (
                  <span key={`ellipsis-${idx}`} style={{ color:"#475569", padding:"0 4px", fontSize:13, userSelect:"none" }}>…</span>
                ) : (
                  <button
                    key={p_}
                    onClick={() => setPage(p_)}
                    style={{
                      minWidth:   32,
                      height:     32,
                      borderRadius: 6,
                      border:     p_ === page
                        ? "1px solid rgba(59,130,246,0.5)"
                        : "1px solid rgba(99,179,237,0.12)",
                      background: p_ === page
                        ? "rgba(59,130,246,0.2)"
                        : "rgba(255,255,255,0.02)",
                      color:      p_ === page ? "#60a5fa" : "#64748b",
                      fontSize:   12,
                      fontWeight: p_ === page ? 700 : 400,
                      cursor:     "pointer",
                      padding:    "0 6px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (p_ !== page) { e.currentTarget.style.background="rgba(59,130,246,0.08)"; e.currentTarget.style.color="#94a3b8"; } }}
                    onMouseLeave={e => { if (p_ !== page) { e.currentTarget.style.background="rgba(255,255,255,0.02)"; e.currentTarget.style.color="#64748b"; } }}
                  >
                    {p_ + 1}
                  </button>
                )
              )}

              {/* Next */}
              <NavBtn disabled={page >= maxPage - 1} onClick={() => setPage(p => p + 1)} title="Berikutnya">›</NavBtn>
              {/* Last */}
              <NavBtn disabled={page >= maxPage - 1} onClick={() => setPage(maxPage - 1)} title="Halaman terakhir">»</NavBtn>
            </div>
          </div>
        )}
      </div>

      {/* Threshold Legend */}
      <div style={{
        marginTop:16, padding:"10px 16px",
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(99,179,237,0.06)",
        borderRadius:8, display:"flex", gap:20, flexWrap:"wrap", alignItems:"center",
      }}>
        <span style={{ color:"#475569", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Threshold:</span>
        {[
          { label:"BONGKAR",      color:"#E24B4A", desc:`≤ ${THR_BONGKAR}%` },
          { label:"AWAS",         color:"#EF9F27", desc:`${THR_BONGKAR}–${THR_AWAS}%` },
          { label:"PERLU PANTAU", color:"#d4b800", desc:`${THR_AWAS}–${THR_TRIGGER}%` },
          { label:"AMAN",         color:"#1D9E75", desc:`> ${THR_TRIGGER}%` },
        ].map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:s.color, display:"inline-block" }} />
            <span style={{ color:s.color, fontSize:11, fontWeight:600 }}>{s.label}</span>
            <span style={{ color:"#475569", fontSize:11 }}>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Hasilkan array nomor halaman + "…" untuk range pagination.
 * Contoh: buildPageRange(5, 12) → [0, 1, "…", 4, 5, 6, "…", 10, 11]
 */
function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages = new Set([0, total - 1]);              // selalu tampil halaman pertama & terakhir
  for (let i = Math.max(0, current - 2); i <= Math.min(total - 1, current + 2); i++) {
    pages.add(i);                                     // 2 halaman di kiri & kanan current
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

// ── Sub Components ─────────────────────────────────────────────────────────────

function NavBtn({ children, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth:     32,
        height:       32,
        borderRadius: 6,
        border:       "1px solid rgba(99,179,237,0.12)",
        background:   disabled ? "transparent" : "rgba(255,255,255,0.02)",
        color:        disabled ? "#2d3748" : "#64748b",
        fontSize:     16,
        cursor:       disabled ? "default" : "pointer",
        padding:      "0 6px",
        transition:   "all 0.15s",
        lineHeight:   1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background="rgba(59,130,246,0.08)"; e.currentTarget.style.color="#60a5fa"; } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background="rgba(255,255,255,0.02)"; e.currentTarget.style.color="#64748b"; } }}
    >
      {children}
    </button>
  );
}

function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#E24B4A" : pct <= 30 ? "#EF9F27" : pct <= 35 ? "#d4b800" : "#1D9E75";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ width:60, height:5, background:"rgba(255,255,255,0.08)", borderRadius:3 }}>
        <div style={{ height:"100%", width:`${Math.min(pct || 0, 100)}%`, background:color, borderRadius:3 }} />
      </div>
      <span style={{ color, fontSize:12, fontWeight:600, minWidth:36 }}>{pct?.toFixed(0) ?? "-"}%</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:12, color:"#64748b" }}>
      <div style={{ width:32, height:32, border:"2px solid rgba(59,130,246,0.2)", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span>Memuat data ATM...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}