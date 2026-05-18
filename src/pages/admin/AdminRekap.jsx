// src/pages/admin/AdminRekap.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { getRekapReplacementAPI, updateRekapAPI } from "../../utils/api";

const API_BASE   = import.meta.env?.VITE_API_URL || "http://localhost:8000";
const authHeader = () => {
  const token = localStorage.getItem("sipras_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const BULAN_ID     = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const WILAYAH_LIST = ["Semua","Pekanbaru","Batam","Dumai","Tanjung Pinang"];
const ALL_DENOM    = [{ label:"Rp 50.000", value:50_000 },{ label:"Rp 100.000", value:100_000 }];
const fmtRp        = v => v == null || isNaN(v) ? "—" : "Rp " + Number(v).toLocaleString("id-ID");
const nowBulan     = () => BULAN_ID[new Date().getMonth()];
const nowTahun     = () => new Date().getFullYear();

function getDenomOpts(item) {
  const raw  = item?.denom_options || "100000";
  const vals = String(raw).split(",").map(v => parseInt(v.trim(),10)).filter(v => !isNaN(v) && v > 0);
  const opts = ALL_DENOM.filter(o => vals.includes(o.value));
  return opts.length > 0 ? opts : [{ label:"Rp 100.000", value:100_000 }];
}

export default function AdminRekap({ showToast }) {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterBulan, setFilterBulan] = useState(nowBulan());
  const [filterWil,   setFilterWil]   = useState("Semua");
  const [search,      setSearch]      = useState("");
  const [editRow,     setEditRow]     = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [busy,        setBusy]        = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getRekapReplacementAPI({
        bulan:   filterBulan,
        tahun:   nowTahun(),
        wilayah: filterWil !== "Semua" ? filterWil : undefined,
      });
      setItems(r.data || []);
    } catch(e) { showToast(e.message, "err"); }
    finally { setLoading(false); }
  }, [filterBulan, filterWil]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(r =>
      r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q)
    );
  }, [items, search]);

  // ── Buka edit — include saldo_awal ─────────────────────────────────────────
  const openEdit = (item) => {
    setEditRow({
      id:           item.id,
      tgl_isi:      item.tgl_isi      || "",
      jam_cash_in:  item.jam_cash_in  || "",
      jam_cash_out: item.jam_cash_out || "",
      denom:        item.denom        || 100_000,
      saldo_awal:   item.saldo_awal   ?? "",   // ← field baru
    });
  };

  // ── Simpan edit ────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      const saldoVal = editRow.saldo_awal !== "" ? Number(editRow.saldo_awal) : null;
      await updateRekapAPI(editRow.id, {
        tgl_isi:      editRow.tgl_isi      || null,
        jam_cash_in:  editRow.jam_cash_in  || null,
        jam_cash_out: editRow.jam_cash_out || null,
        denom:        Number(editRow.denom),
        saldo_awal:   saldoVal,
        jumlah_isi:   null,   // jumlah_isi = limit ATM, tidak diubah dari sini
      });
      setItems(p => p.map(x => x.id === editRow.id
        ? { ...x, ...editRow, saldo_awal: saldoVal ?? x.saldo_awal, is_saved: true }
        : x
      ));
      showToast("Rekap diperbarui");
      setEditRow(null);
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); }
  };

  // ── Unlock (buka kunci) — pakai updateRekapAPI agar auth header ikut ───────
  const doUnlock = async (item) => {
    setBusy(true);
    try {
      // PATCH dengan is_saved=false — backend perlu support ini,
      // atau gunakan endpoint unlock khusus jika sudah ada
      const res = await fetch(`${API_BASE}/api/rekap-replacement/${item.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) {
        // Fallback: jika endpoint unlock belum ada, pakai PATCH biasa
        // yang akan reset is_saved lewat flag khusus
        const res2 = await fetch(`${API_BASE}/api/rekap-replacement/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({
            tgl_isi:      item.tgl_isi      || null,
            jam_cash_in:  item.jam_cash_in  || null,
            jam_cash_out: item.jam_cash_out || null,
            denom:        item.denom        || 100_000,
            saldo_awal:   item.saldo_awal   || null,
            jumlah_isi:   null,
            unlock:       true,   // flag untuk backend reset is_saved=0
          }),
        });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      }
      // Update local state — baris jadi bisa diedit lagi
      setItems(p => p.map(x => x.id === item.id ? { ...x, is_saved: false } : x));
      showToast(`Rekap #${item.id} (${item.id_atm}) dibuka untuk edit`);
      setConfirm(null);
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="⌕  Cari ID ATM..." style={s.searchInput} />
        <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} style={s.filterSelect}>
          {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
        </select>
        <select value={filterWil} onChange={e => setFilterWil(e.target.value)} style={s.filterSelect}>
          {WILAYAH_LIST.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <span style={{ color:"#94a3b8", fontSize:12, fontFamily:"monospace" }}>{filtered.length} rows</span>
        <button onClick={load} style={s.refreshBtn} disabled={loading}>↺</button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton /> : (
        <div style={s.tableWrap}>
          <div style={{ overflowX:"auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["ID","Done At","Bulan","ID ATM","Lokasi","Wilayah","Tipe",
                    "Saldo Akhir ✎","Jumlah Isi","Denom","Lembar",
                    "Tgl Isi","Cash In","Cash Out",
                    "Status","Keterangan","Saved","Aksi"].map(h => (
                    <th key={h} style={{
                      ...s.th,
                      color: h.includes("✎") ? "#f59e0b" : "#64748b",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={18} style={s.empty}>Tidak ada data rekap bulan {filterBulan}</td></tr>
                ) : filtered.map((item, i) => {
                  const isEditing = editRow?.id === item.id;
                  const ed        = editRow || {};
                  const denomOpts = getDenomOpts(item);

                  // Saldo yang ditampilkan — pakai editRow jika sedang edit
                  const saldoDisplay = isEditing
                    ? ed.saldo_awal
                    : (item.saldo_awal ?? "—");

                  // Deteksi apakah saldo diubah dari nilai asal
                  const saldoChanged = isEditing &&
                    ed.saldo_awal !== "" &&
                    Number(ed.saldo_awal) !== Number(item.saldo_awal);

                  return (
                    <tr key={item.id} style={{
                      background: item.is_saved
                        ? "rgba(74,222,128,0.025)"
                        : i%2===0 ? "transparent" : "rgba(255,255,255,0.012)",
                    }}>
                      <Td mono dim>{item.id}</Td>
                      <Td dim small>
                        {item.done_at
                          ? new Date(item.done_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"})
                          : "—"}
                      </Td>
                      <Td dim small>{item.bulan || filterBulan}</Td>
                      <Td mono bold accent="#a78bfa">{item.id_atm}</Td>
                      <Td dim small truncate>{item.lokasi || "—"}</Td>
                      <Td dim>{item.wilayah || "—"}</Td>
                      <Td><TypeBadge tipe={item.tipe} /></Td>

                      {/* ── Saldo Akhir — editable saat mode edit ────────── */}
                      <td style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                        {isEditing ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                            <input
                              type="number"
                              value={ed.saldo_awal}
                              onChange={e => setEditRow(r => ({
                                ...r,
                                saldo_awal: e.target.value === "" ? "" : Number(e.target.value),
                              }))}
                              style={{
                                ...s.inlineInput,
                                width: 120,
                                borderColor: saldoChanged
                                  ? "rgba(245,158,11,0.6)"
                                  : "rgba(56,189,248,0.3)",
                                color: saldoChanged ? "#f59e0b" : "#e2e8f0",
                              }}
                              placeholder="0"
                              min={0}
                              step={1000}
                            />
                            {saldoChanged && (
                              <span style={{ fontSize:9, color:"#f59e0b" }}>
                                semula {fmtRp(item.saldo_awal)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color:"#e2e8f0", fontSize:12 }}>
                            {fmtRp(item.saldo_awal)}
                          </span>
                        )}
                      </td>

                      {/* Jumlah Isi — selalu dari limit ATM, read-only */}
                      <Td accent="#f59e0b">{fmtRp(item.jumlah_isi || item.limit)}</Td>

                      {/* Denom */}
                      <Td>
                        {isEditing ? (
                          <select
                            value={ed.denom}
                            onChange={e => setEditRow(r => ({...r, denom: Number(e.target.value)}))}
                            style={s.inlineSelect}
                          >
                            {denomOpts.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        ) : (
                          <span style={{ color:"#e2e8f0", fontSize:11 }}>{fmtRp(item.denom)}</span>
                        )}
                      </Td>

                      <Td>{item.lembar ? `${item.lembar} lbr` : "—"}</Td>

                      {/* Tgl Isi */}
                      <Td>
                        {isEditing ? (
                          <input type="date" value={ed.tgl_isi}
                            onChange={e => setEditRow(r => ({...r, tgl_isi: e.target.value}))}
                            style={s.inlineInput} />
                        ) : (
                          <span style={{ color: item.tgl_isi ? "#e2e8f0" : "#374151", fontSize:11 }}>
                            {item.tgl_isi || "—"}
                          </span>
                        )}
                      </Td>

                      {/* Cash In */}
                      <Td>
                        {isEditing ? (
                          <input type="time" value={ed.jam_cash_in}
                            onChange={e => setEditRow(r => ({...r, jam_cash_in: e.target.value}))}
                            style={{...s.inlineInput, width:80}} />
                        ) : (
                          <span style={{ color: item.jam_cash_in ? "#60a5fa" : "#374151", fontSize:11, fontFamily:"monospace" }}>
                            {item.jam_cash_in || "—"}
                          </span>
                        )}
                      </Td>

                      {/* Cash Out */}
                      <Td>
                        {isEditing ? (
                          <input type="time" value={ed.jam_cash_out}
                            onChange={e => setEditRow(r => ({...r, jam_cash_out: e.target.value}))}
                            style={{...s.inlineInput, width:80}} />
                        ) : (
                          <span style={{ color: item.jam_cash_out ? "#60a5fa" : "#374151", fontSize:11, fontFamily:"monospace" }}>
                            {item.jam_cash_out || "—"}
                          </span>
                        )}
                      </Td>

                      <Td><RekapStatusBadge status={item.status_done} /></Td>
                      <Td dim small truncate>{item.keterangan || "—"}</Td>

                      {/* Saved badge */}
                      <Td>
                        {item.is_saved
                          ? <span style={s.savedBadge}>✓ SAVED</span>
                          : <span style={{ fontSize:10, color:"#475569" }}>—</span>
                        }
                      </Td>

                      {/* Aksi */}
                      <td style={{ padding:"6px 10px", whiteSpace:"nowrap", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                        {isEditing ? (
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={saveEdit} disabled={busy} style={s.saveSmBtn}>
                              {busy ? "..." : "✓ Save"}
                            </button>
                            <button onClick={() => setEditRow(null)} style={s.cancelSmBtn}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display:"flex", gap:4 }}>
                            {/* Tombol edit — selalu tampil */}
                            <ActionBtn
                              color="#38bdf8"
                              onClick={() => openEdit(item)}
                              title={item.is_saved ? "Edit (perlu unlock dulu)" : "Edit"}
                              disabled={item.is_saved}
                            >✎</ActionBtn>
                            {/* Tombol unlock — hanya jika is_saved */}
                            {item.is_saved && (
                              <ActionBtn
                                color="#f59e0b"
                                onClick={() => setConfirm({ type:"unlock", item })}
                                title="Buka kunci untuk edit ulang"
                              >🔓</ActionBtn>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm unlock */}
      {confirm?.type === "unlock" && (
        <ConfirmModal
          title={`Buka kunci rekap #${confirm.item.id} (${confirm.item.id_atm})?`}
          desc="Data akan bisa diedit kembali. Pastikan perubahan yang akan dibuat sudah benar."
          danger={false}
          onOk={() => doUnlock(confirm.item)}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Td({ children, mono, bold, dim, accent, small, truncate }) {
  return (
    <td style={{
      padding: "8px 12px",
      color: accent || (dim ? "#94a3b8" : "#e2e8f0"),
      fontSize: small ? 10 : 12,
      fontWeight: bold ? 700 : 400,
      fontFamily: mono ? "'IBM Plex Mono',monospace" : "inherit",
      whiteSpace: "nowrap",
      maxWidth: truncate ? 140 : "none",
      overflow: truncate ? "hidden" : "visible",
      textOverflow: truncate ? "ellipsis" : "clip",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>{children}</td>
  );
}

function ActionBtn({ children, color, onClick, title, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      style={{
        background: `${color}15`,
        border: `1px solid ${color}35`,
        borderRadius: 5, color: disabled ? "#374151" : color,
        padding: "3px 8px", fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700, opacity: disabled ? 0.4 : 1,
      }}
    >{children}</button>
  );
}

function TypeBadge({ tipe }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      background: tipe === "CRM" ? "rgba(167,139,250,0.15)" : "rgba(56,189,248,0.12)",
      color: tipe === "CRM" ? "#a78bfa" : "#38bdf8",
      border: `1px solid ${tipe === "CRM" ? "rgba(167,139,250,0.3)" : "rgba(56,189,248,0.25)"}`,
    }}>{tipe || "—"}</span>
  );
}

function RekapStatusBadge({ status }) {
  const s2 = (status || "").toUpperCase();
  const map = {
    SELESAI: ["#4ade80", "rgba(74,222,128,0.1)"],
    BATAL:   ["#94a3b8", "rgba(148,163,184,0.08)"],
    REMOVED: ["#f87171", "rgba(248,113,113,0.08)"],
  };
  const [c, bg] = map[s2] || ["#94a3b8", "rgba(100,116,139,0.1)"];
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:bg, color:c }}>
      {s2 || "—"}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div style={{ padding:"20px 0" }}>
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{ height:36, background:`rgba(167,139,250,${0.02+i*0.005})`, borderRadius:4, marginBottom:4 }} />
      ))}
    </div>
  );
}

function ConfirmModal({ title, desc, danger, onOk, onCancel, loading }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth:420 }}>
        <div style={{ fontSize:28, marginBottom:12, textAlign:"center" }}>{danger ? "⚠️" : "🔓"}</div>
        <h3 style={{ color: danger ? "#f87171" : "#f59e0b", fontSize:15, fontWeight:700, margin:"0 0 8px", textAlign:"center" }}>{title}</h3>
        <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>{desc}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onOk} disabled={loading} style={{
            flex:1, padding:"10px", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer",
            background: danger ? "rgba(248,113,113,0.15)" : "rgba(245,158,11,0.15)",
            border: danger ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(245,158,11,0.4)",
            color: danger ? "#f87171" : "#f59e0b",
          }}>
            {loading ? "Proses..." : "🔓 Buka Kunci"}
          </button>
          <button onClick={onCancel} style={{
            padding:"10px 20px", borderRadius:8, fontSize:13, cursor:"pointer",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
          }}>Batal</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  toolbar:     { display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" },
  searchInput: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:12, outline:"none", width:220 },
  filterSelect:{ background:"#0a0f1e", border:"1px solid rgba(167,139,250,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 12px", fontSize:12, cursor:"pointer", outline:"none" },
  refreshBtn:  { background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:8, color:"#a78bfa", padding:"8px 12px", fontSize:14, cursor:"pointer" },
  tableWrap:   { borderRadius:10, border:"1px solid rgba(167,139,250,0.08)", background:"rgba(5,11,24,0.6)" },
  table:       { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th:          { padding:"10px 12px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap", borderBottom:"1px solid rgba(167,139,250,0.1)", fontFamily:"'IBM Plex Mono',monospace", background:"rgba(0,0,0,0.2)" },
  empty:       { padding:"60px 20px", textAlign:"center", color:"#475569", fontSize:13 },
  inlineInput: { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.3)", borderRadius:5, color:"#e2e8f0", padding:"3px 7px", fontSize:11, outline:"none" },
  inlineSelect:{ background:"#000", border:"1px solid rgba(167,139,250,0.3)", borderRadius:5, color:"#a78bfa", padding:"3px 6px", fontSize:11, outline:"none", cursor:"pointer" },
  saveSmBtn:   { background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.35)", borderRadius:5, color:"#4ade80", padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:700 },
  cancelSmBtn: { background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:5, color:"#f87171", padding:"3px 8px", fontSize:11, cursor:"pointer" },
  savedBadge:  { fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(74,222,128,0.1)", color:"#4ade80", border:"1px solid rgba(74,222,128,0.25)" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:       { background:"#080e1d", border:"1px solid rgba(167,139,250,0.2)", borderRadius:16, padding:"28px 32px", width:480, maxWidth:"95vw" },
};