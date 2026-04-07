// src/pages/Monitoring.jsx
import { useState, useEffect, useMemo } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

const WILAYAH = ["Semua", "Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"];
const STATUS_LIST = ["Semua", "BONGKAR", "AWAS", "AMAN","PERLU PANTAU"];
const TIPE_LIST = ["Semua", "EMV", "CRM"];

export default function Monitoring({ navigateTo }) {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [wilayah, setWilayah]   = useState("Semua");
  const [status, setStatus]     = useState("Semua");
  const [tipe, setTipe]         = useState("Semua");
  const [sort, setSort]         = useState({ key: "skor_urgensi", dir: -1 });
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 20;

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

  const paged    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage  = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));

  if (loading) return <Spinner />;

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
    return <span style={{ marginLeft: 4, color: "#60a5fa" }}>{sort.dir > 0 ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Monitoring ATM
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          {filtered.length} dari {data.length} ATM ditampilkan
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Cari ID ATM atau lokasi..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8, color: "#e2e8f0", padding: "8px 14px", fontSize: 13,
            width: 220, outline: "none",
          }}
        />
        {[
          { label: "Wilayah", val: wilayah, set: setWilayah, opts: WILAYAH },
          { label: "Status",  val: status,  set: setStatus,  opts: STATUS_LIST },
          { label: "Tipe",    val: tipe,    set: setTipe,    opts: TIPE_LIST },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }}
            style={{
              background: "#0d1228", border: "1px solid rgba(99,179,237,0.15)",
              borderRadius: 8, color: "#94a3b8", padding: "8px 12px", fontSize: 13,
              cursor: "pointer", outline: "none",
            }}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
                {[
                  { label: "Ranking",     key: "ranking" },
                  { label: "ID ATM",      key: "id_atm" },
                  { label: "Lokasi",      key: "lokasi" },
                  { label: "Wilayah",     key: "wilayah" },
                  { label: "Saldo",       key: "saldo" },
                  { label: "% Saldo",     key: "pct_saldo" },
                  { label: "Est. Habis",  key: "est_jam" },
                  { label: "Tgl Isi",     key: "tgl_isi" },
                  { label: "Status",      key: "status" },
                  { label: "Skor",        key: "skor_urgensi" },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => toggleSort(col.key)}
                    style={{
                      padding: "12px 14px", textAlign: "left",
                      color: sort.key === col.key ? "#60a5fa" : "#64748b",
                      fontWeight: 600, fontSize: 11, letterSpacing: "0.08em",
                      textTransform: "uppercase", cursor: "pointer",
                      userSelect: "none", whiteSpace: "nowrap",
                    }}>
                    {col.label}<SortIcon k={col.key} />
                  </th>
                ))}
                <th style={{ padding: "12px 14px", color: "#64748b", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => {
                const sc = STATUS_COLOR[row.status] || "#6b7280";
                const sb = STATUS_BG[row.status] || "transparent";
                const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
                return (
                  <tr key={row.id_atm} style={{
                    background: rowBg,
                    borderBottom: "1px solid rgba(99,179,237,0.04)",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>#{row.ranking}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>
                      {row.id_atm}
                      {row.atm_sepi && <span style={{ marginLeft: 6, fontSize: 9, color: "#a78bfa", background: "rgba(167,139,250,0.1)", padding: "1px 5px", borderRadius: 3 }}>SEPI</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={row.lokasi}>{row.lokasi || "-"}</td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{row.wilayah || "-"}</td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }}>{fmt.rupiah(row.saldo)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <SaldoBar pct={row.pct_saldo} />
                    </td>
                    <td style={{ padding: "10px 14px", color: row.est_jam < 24 ? "#ff3b5c" : "#94a3b8", fontWeight: row.est_jam < 24 ? 600 : 400 }}>
                      {fmt.jam(row.est_jam)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>
                      {row.tgl_isi ? `${row.tgl_isi} ${row.jam_isi}` : "-"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 5, background: sb, color: sc, whiteSpace: "nowrap",
                        border: `1px solid ${sc}33`,
                      }}>{row.status}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${Math.min(row.skor_urgensi, 100)}%`, background: sc, borderRadius: 2 }} />
                        </div>
                        <span style={{ color: sc, fontSize: 12, fontWeight: 600, minWidth: 28 }}>{row.skor_urgensi?.toFixed(0)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => navigateTo("history", row.id_atm)} style={{
                        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                        borderRadius: 6, color: "#60a5fa", padding: "4px 10px", fontSize: 11,
                        cursor: "pointer", fontWeight: 600,
                      }}>Detail</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {maxPage > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(99,179,237,0.08)" }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              Halaman {page + 1} dari {maxPage} · {filtered.length} ATM
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <PageBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</PageBtn>
              <PageBtn disabled={page >= maxPage - 1} onClick={() => setPage(p => p + 1)}>Next →</PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#ff3b5c" : pct <= 25 ? "#ff8c00" : pct <= 40 ? "#f5c518" : "#00e5a0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, minWidth: 36 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "transparent" : "rgba(59,130,246,0.1)",
      border: "1px solid rgba(59,130,246,0.2)",
      borderRadius: 6, color: disabled ? "#374151" : "#60a5fa",
      padding: "5px 12px", fontSize: 12, cursor: disabled ? "default" : "pointer",
    }}>{children}</button>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span>Memuat data ATM...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
