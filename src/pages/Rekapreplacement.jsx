// src/pages/RekapReplacement.jsx
// Halaman Rekap Replacement — ATM yang sudah selesai diisi (Status DONE dari Cash Plan)
import { useState, useMemo } from "react";
import { fmt } from "../utils/api";

const BULAN_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

const fmtRp = (v) => {
  if (v == null || isNaN(v)) return "—";
  return "Rp " + Number(v).toLocaleString("id-ID");
};

const fmtLembar = (total, denom) => {
  if (!total || !denom) return "—";
  return Math.ceil(total / denom).toLocaleString("id-ID") + " lembar";
};

const nowBulan = () => BULAN_ID[new Date().getMonth()];
const nowTahun = () => new Date().getFullYear();

const targetSaldo = (limit) => Math.round(limit * 1);
const jumlahIsi   = (saldo, limit) => Math.max(0, targetSaldo(limit) - saldo);

const WILAYAH_LIST  = ["Semua", "PEKANBARU", "BATAM", "DUMAI", "Tanjung Pinang"];

export default function RekapReplacement({ doneItems = [], navigateTo }) {
  const [filterWilayah, setFilterWilayah] = useState("Semua");
  const [filterBulan,   setFilterBulan]   = useState(nowBulan());
  const [filterTipe,    setFilterTipe]    = useState("Semua");
  const [search,        setSearch]        = useState("");
  const [sort,          setSort]          = useState({ key: "done_at", dir: -1 });
  const [page,          setPage]          = useState(0);
  const PAGE_SIZE = 15;

  // ── Filter + sort ─────────────────────────────────────
  const filtered = useMemo(() => {
    let d = doneItems;
    if (filterWilayah !== "Semua") d = d.filter(r => r.wilayah === filterWilayah);
    if (filterTipe    !== "Semua") d = d.filter(r => r.tipe    === filterTipe);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r =>
        r.id_atm?.toLowerCase().includes(q) ||
        r.lokasi?.toLowerCase().includes(q) ||
        r.wilayah?.toLowerCase().includes(q)
      );
    }
    return [...d].sort((a, b) => {
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [doneItems, filterWilayah, filterTipe, search, sort]);

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (key) => {
    setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));
    setPage(0);
  };

  // ── Summary ───────────────────────────────────────────
  const totalNominal = filtered.reduce((sum, d) => sum + jumlahIsi(d.saldo || 0, d.limit || 0), 0);
  const byWilayah    = WILAYAH_LIST.slice(1).map(w => ({
    wilayah: w,
    count:   doneItems.filter(d => d.wilayah === w).length,
    nominal: doneItems.filter(d => d.wilayah === w).reduce((s, d) => s + jumlahIsi(d.saldo || 0, d.limit || 0), 0),
  })).filter(w => w.count > 0);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Rekap Replacement ATM
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {filterBulan} {nowTahun()} · ATM yang sudah selesai diisi (Status DONE dari Cash Plan) · {doneItems.length} ATM terselesaikan
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}
            style={selectStyle}
          >
            {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
          </select>
          <button
            onClick={() => navigateTo && navigateTo("cashplan")}
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 8, color: "#60a5fa",
              padding: "8px 16px", fontSize: 13,
              cursor: "pointer", fontWeight: 600,
            }}
          >
            ← Kembali ke Cash Plan
          </button>
        </div>
      </div>

      {/* ── Empty State ── */}
      {doneItems.length === 0 ? (
        <EmptyState navigateTo={navigateTo} />
      ) : (
        <>
          {/* ── Summary Cards ──────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total ATM Selesai",  value: doneItems.length, color: "#00e5a0", icon: "✓" },
              { label: "Total Nominal Isi",   value: fmtRp(doneItems.reduce((s, d) => s + jumlahIsi(d.saldo||0, d.limit||0), 0)), color: "#a78bfa", icon: "◎", small: true },
              { label: "Ditampilkan (Filter)", value: filtered.length, color: "#60a5fa", icon: "◈" },
              { label: "Est. Nominal (Filter)", value: fmtRp(totalNominal), color: "#f59e0b", icon: "⊕", small: true },
            ].map(c => (
              <div key={c.label} style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${c.color}28`,
                borderRadius: 10, padding: "14px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, color: c.color, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ color: c.color, fontSize: c.small ? 13 : 26, fontWeight: 700, lineHeight: 1 }}>{c.value}</div>
                <div style={{ color: "#64748b", fontSize: 10, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* ── Per Wilayah ── */}
          {byWilayah.length > 0 && (
            <div style={{
              display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap",
            }}>
              {byWilayah.map(w => (
                <div key={w.wilayah} style={{
                  background: "rgba(0,229,160,0.04)",
                  border: "1px solid rgba(0,229,160,0.15)",
                  borderRadius: 8, padding: "10px 16px",
                }}>
                  <div style={{ color: "#00e5a0", fontWeight: 700, fontSize: 13 }}>{w.wilayah}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    {w.count} ATM · {fmtRp(w.nominal)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Filter Bar ─────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Cari ID ATM / lokasi / wilayah..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(99,179,237,0.15)",
                borderRadius: 8, color: "#e2e8f0",
                padding: "8px 14px", fontSize: 13, width: 220, outline: "none",
              }}
            />
            {[
              { label: "Wilayah", val: filterWilayah, set: setFilterWilayah, opts: WILAYAH_LIST },
              { label: "Tipe",    val: filterTipe,    set: setFilterTipe,    opts: ["Semua","EMV","CRM"] },
            ].map(f => (
              <select key={f.label} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }} style={selectStyle}>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            <span style={{ color: "#64748b", fontSize: 12, marginLeft: "auto" }}>
              {filtered.length} dari {doneItems.length} ATM
            </span>
          </div>

          {/* ── Table ──────────────────────────────────────── */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(0,229,160,0.1)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,229,160,0.15)", background: "rgba(0,229,160,0.03)" }}>
                    {[
                      { label: "No",             key: null },
                      { label: "ID ATM",         key: "id_atm" },
                      { label: "Lokasi ATM",     key: "lokasi" },
                      { label: "Wilayah",        key: "wilayah" },
                      { label: "EMV/CRM",        key: "tipe" },
                      { label: "Saldo Sebelum",  key: "saldo" },
                      { label: "Limit",          key: "limit" },
                      { label: "Total Diisi",    key: null },
                      { label: "Denom",          key: "denom" },
                      { label: "Lembar",         key: null },
                      { label: "Jam Cash Out",   key: null },
                      { label: "Jam Cash In",    key: "tgl_isi" },
                      { label: "Status Asal",    key: "status" },
                      { label: "Status",         key: null },
                      { label: "Keterangan",     key: null },
                    ].map((col, ci) => (
                      <th
                        key={ci}
                        onClick={col.key ? () => toggleSort(col.key) : undefined}
                        style={{
                          padding: "11px 12px",
                          textAlign: "left",
                          color: col.key && sort.key === col.key ? "#00e5a0" : "#64748b",
                          fontWeight: 600, fontSize: 10,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          cursor: col.key ? "pointer" : "default",
                          whiteSpace: "nowrap",
                          userSelect: "none",
                        }}
                      >
                        {col.label}
                        {col.key && sort.key === col.key && (
                          <span style={{ marginLeft: 3, color: "#00e5a0" }}>{sort.dir > 0 ? "↑" : "↓"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((atm, i) => {
                    const rowNo     = page * PAGE_SIZE + i + 1;
                    const denom     = atm.denom || 100_000;
                    const totalIsi  = jumlahIsi(atm.saldo || 0, atm.limit || 0);

                    const lastUpDt   = atm.last_update ? new Date(atm.last_update) : null;
                    const tglStr     = lastUpDt ? lastUpDt.toLocaleDateString("id-ID", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—";
                    const jamCashOut = lastUpDt ? lastUpDt.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" }) : "—";
                    const jamCashIn  = atm.tgl_isi && atm.jam_isi
                      ? `${atm.tgl_isi} ${atm.jam_isi}`
                      : atm.tgl_isi || "—";

                    const statusOrigStyle = {
                      BONGKAR:        { color: "#ff3b5c", bg: "rgba(255,59,92,0.1)"  },
                      AWAS:           { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
                      "PERLU PANTAU": { color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
                    }[atm.status] || { color: "#64748b", bg: "rgba(100,116,139,0.1)" };

                    return (
                      <tr
                        key={atm.id_atm + i}
                        style={{
                          background: i % 2 === 0 ? "rgba(0,229,160,0.01)" : "transparent",
                          borderBottom: "1px solid rgba(99,179,237,0.05)",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,229,160,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(0,229,160,0.01)" : "transparent"}
                      >
                        <td style={tdStyle("#64748b")}>{rowNo}</td>

                        {/* ID ATM */}
                        <td style={{ ...tdStyle("#e2e8f0"), fontFamily: "monospace", fontWeight: 700 }}>
                          <span
                            style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                            onClick={() => navigateTo && navigateTo("history", atm.id_atm)}
                          >
                            {atm.id_atm}
                          </span>
                        </td>

                        <td style={{ ...tdStyle("#94a3b8"), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={atm.lokasi}>{atm.lokasi || "—"}</td>

                        <td style={tdStyle("#94a3b8")}>{atm.wilayah || "—"}</td>

                        {/* Tipe */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            background: atm.tipe === "CRM" ? "rgba(167,139,250,0.15)" : "rgba(96,165,250,0.12)",
                            color: atm.tipe === "CRM" ? "#a78bfa" : "#60a5fa",
                            border: atm.tipe === "CRM" ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(96,165,250,0.25)",
                          }}>
                            {atm.tipe || "—"}
                          </span>
                        </td>

                        {/* Saldo Sebelum */}
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 12 }}>{fmtRp(atm.saldo)}</div>
                          <div style={{ marginTop: 3 }}>
                            <SaldoBar pct={atm.pct_saldo} />
                          </div>
                        </td>

                        {/* Limit */}
                        <td style={tdStyle("#64748b")}>{fmtRp(atm.limit)}</td>

                        {/* Total Diisi */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>{fmtRp(totalIsi)}</span>
                        </td>

                        {/* Denom */}
                        <td style={tdStyle("#a78bfa")}>
                          {fmtRp(denom)}
                        </td>

                        {/* Lembar */}
                        <td style={tdStyle("#94a3b8")}>
                          {totalIsi > 0 ? fmtLembar(totalIsi, denom) : "—"}
                        </td>

                        {/* Jam Cash Out */}
                        <td style={tdStyle("#94a3b8")}>{jamCashOut}</td>

                        {/* Jam Cash In */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>{jamCashIn}</span>
                        </td>

                        {/* Status Asal */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            background: statusOrigStyle.bg, color: statusOrigStyle.color,
                            border: `1px solid ${statusOrigStyle.color}33`,
                          }}>
                            {atm.status || "—"}
                          </span>
                        </td>

                        {/* Status DONE */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 5,
                            background: "rgba(0,229,160,0.12)", color: "#00e5a0",
                            border: "1px solid rgba(0,229,160,0.3)",
                          }}>
                            ✓ DONE
                          </span>
                        </td>

                        {/* Keterangan */}
                        <td style={{ ...tdStyle("#94a3b8"), fontStyle: atm.keterangan ? "normal" : "italic" }}>
                          {atm.keterangan || <span style={{ color: "#374151" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {maxPage > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px", borderTop: "1px solid rgba(0,229,160,0.08)",
              }}>
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  Halaman {page + 1} dari {maxPage} · {filtered.length} ATM
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <PageBtn disabled={page === 0}          onClick={() => setPage(p => p - 1)}>← Prev</PageBtn>
                  <PageBtn disabled={page >= maxPage - 1} onClick={() => setPage(p => p + 1)}>Next →</PageBtn>
                </div>
              </div>
            )}
          </div>

          {/* ── Legend ─────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: "DONE — ATM sudah berhasil diisi",         color: "#00e5a0" },
              { label: "Saldo Sebelum = kondisi sebelum diisi",   color: "#f59e0b" },
              { label: "Total Diisi = target 100% - saldo awal",  color: "#a78bfa" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <span style={{ color: "#64748b", fontSize: 11 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────
function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#ff3b5c" : pct <= 30 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 50, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min(pct || 0, 100)}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "transparent" : "rgba(0,229,160,0.1)",
      border: "1px solid rgba(0,229,160,0.2)",
      borderRadius: 6, color: disabled ? "#374151" : "#00e5a0",
      padding: "5px 12px", fontSize: 12,
      cursor: disabled ? "default" : "pointer",
    }}>{children}</button>
  );
}

function EmptyState({ navigateTo }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: 320, gap: 16,
      background: "rgba(0,229,160,0.02)",
      border: "1px solid rgba(0,229,160,0.08)", borderRadius: 12,
    }}>
      <span style={{ fontSize: 48, opacity: 0.3 }}>✓</span>
      <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 18 }}>Belum Ada Data Replacement</span>
      <span style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 400 }}>
        Rekap akan otomatis terisi ketika ATM di Cash Plan ditandai sebagai <strong style={{ color: "#00e5a0" }}>DONE</strong>.
        Buka Cash Plan dan klik tombol status pada ATM yang sudah diisi.
      </span>
      <button
        onClick={() => navigateTo && navigateTo("cashplan")}
        style={{
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.4)",
          borderRadius: 8, color: "#60a5fa",
          padding: "10px 24px", fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}
      >
        → Buka Cash Plan
      </button>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────
const selectStyle = {
  background: "#0d1228",
  border: "1px solid rgba(99,179,237,0.15)",
  borderRadius: 8, color: "#94a3b8",
  padding: "8px 12px", fontSize: 13,
  cursor: "pointer", outline: "none",
};

const tdStyle = (color) => ({
  padding: "8px 12px",
  color,
  whiteSpace: "nowrap",
});