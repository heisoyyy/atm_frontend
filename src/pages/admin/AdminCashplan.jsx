// src/pages/admin/AdminCashplan.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getCashplanAPI,
  removeCashplanAPI,
} from "../../utils/api";

const API_BASE    = import.meta.env?.VITE_API_URL || "http://localhost:8000";
const WILAYAH_LIST = ["Semua","Pekanbaru","Batam","Dumai","Tanjung Pinang"];
const KET_OPTIONS  = ["Mesin Rusak","Kas Banyak","Lokasi Tutup","Keluhan Jaringan"];
const ALL_DENOM    = [{ label:"Rp 50.000", value:50_000 },{ label:"Rp 100.000", value:100_000 }];
const fmtRp        = v => v == null || isNaN(v) ? "—" : "Rp " + Number(v).toLocaleString("id-ID");

function getDenomOpts(item) {
  const raw  = item?.denom_options || "100000";
  const vals = String(raw).split(",").map(v => parseInt(v.trim(),10)).filter(v => !isNaN(v) && v > 0);
  const opts = ALL_DENOM.filter(o => vals.includes(o.value));
  return opts.length > 0 ? opts : [{ label:"Rp 100.000", value:100_000 }];
}

async function patchCashplan(id, body) {
  const r = await fetch(`${API_BASE}/api/cashplan/${id}/status`, {
    method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function postCashplan(body) {
  const r = await fetch(`${API_BASE}/api/cashplan`, {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function AdminCashplan({ showToast }) {
  const [items,       setItems]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState("");
  const [editRow,     setEditRow]    = useState(null);
  const [showAdd,     setShowAdd]    = useState(false);
  const [addForm,     setAddForm]    = useState({
    id_atm:"", lokasi:"-", wilayah:"Pekanbaru", tipe:"EMV",
    saldo:0, limit:0, status:"AWAS", added_by:"manual", denom_options:"100000",
  });
  const [confirm,     setConfirm]    = useState(null);
  const [busy,        setBusy]       = useState(false);
  const [selected,    setSelected]   = useState(new Set());
  const [bulkConfirm, setBulkConfirm]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await getCashplanAPI("PENDING");
      setItems(r.data || []);
    } catch(e) { showToast(e.message, "err"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(r =>
      r.id_atm?.toLowerCase().includes(q) ||
      r.lokasi?.toLowerCase().includes(q) ||
      r.wilayah?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const allFilteredIds = filtered.map(r => r.id);
  const allChecked     = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someChecked    = allFilteredIds.some(id => selected.has(id)) && !allChecked;
  const selectedCount  = [...selected].filter(id => allFilteredIds.includes(id)).length;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.add(id)); return n; });
    }
  };
  const toggleOne = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const doBulkDelete = async () => {
    setBusy(true);
    const ids = [...selected].filter(id => allFilteredIds.includes(id));
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await removeCashplanAPI(id); ok++; } catch { fail++; }
    }
    setItems(prev => prev.filter(x => !ids.includes(x.id)));
    setSelected(new Set());
    setBulkConfirm(false);
    setBusy(false);
    if (fail === 0) showToast(`${ok} ATM berhasil dihapus dari antrian`);
    else showToast(`${ok} berhasil, ${fail} gagal`, "err");
  };

  const saveInlineKet = async (item, ket) => {
    setBusy(true);
    try {
      await patchCashplan(item.id, { status: item.status_cashplan || "PENDING", keterangan: ket });
      setItems(p => p.map(x => x.id === item.id ? { ...x, keterangan: ket } : x));
      showToast("Keterangan diperbarui");
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); setEditRow(null); }
  };

  const doStatusUpdate = async (item, newStatus) => {
    setBusy(true);
    try {
      if (newStatus === "DELETE") {
        await removeCashplanAPI(item.id);
        setItems(p => p.filter(x => x.id !== item.id));
        setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
        showToast(`ATM ${item.id_atm} dihapus dari antrian`);
      } else {
        await patchCashplan(item.id, { status: newStatus, keterangan: item.keterangan || "" });
        setItems(p => p.filter(x => x.id !== item.id));
        setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
        showToast(`ATM ${item.id_atm} → ${newStatus}`);
      }
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); setConfirm(null); }
  };

  const doAdd = async () => {
    if (!addForm.id_atm.trim()) return showToast("ID ATM wajib diisi", "err");
    setBusy(true);
    try {
      const jumlah = Math.max(0, Number(addForm.limit) - Number(addForm.saldo));
      await postCashplan({
        ...addForm,
        id_atm: addForm.id_atm.toUpperCase(),
        jumlah_isi: jumlah,
        pct_saldo: addForm.limit > 0 ? (addForm.saldo / addForm.limit) * 100 : 0,
      });
      showToast(`ATM ${addForm.id_atm.toUpperCase()} ditambahkan`);
      setShowAdd(false);
      setAddForm({ id_atm:"", lokasi:"-", wilayah:"Pekanbaru", tipe:"EMV", saldo:0, limit:0, status:"AWAS", added_by:"manual", denom_options:"100000" });
      await load();
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="⌕  Cari ID ATM / Lokasi..." style={s.searchInput} />
        <span style={{ color:"#94a3b8", fontSize:12, fontFamily:"monospace" }}>{filtered.length} rows</span>
        <button onClick={() => setShowAdd(true)} style={s.addBtn}>+ Tambah Baru</button>
        <button onClick={load} style={s.refreshBtn} disabled={loading}>↺</button>
      </div>

      {/* Bulk bar */}
      {selectedCount > 0 && (
        <div style={s.bulkBar}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={s.bulkBadge}>{selectedCount}</span>
            <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>item dipilih</span>
            <button onClick={() => setSelected(new Set())} style={s.bulkClearBtn}>✕ Batal</button>
          </div>
          <button onClick={() => setBulkConfirm(true)} disabled={busy} style={s.bulkDeleteBtn}>
            ⌫ Hapus {selectedCount} yang dipilih
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? <TableSkeleton /> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width:36 }}>
                  <input type="checkbox" className="atm-cb" checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll} />
                </th>
                {["ID","Tgl Masuk","ID ATM","Lokasi","Wilayah","Tipe","Saldo","Limit","% Saldo",
                  "Denom","Jumlah Isi","Status Awal","Keterangan","Sumber","Aksi"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={16} style={s.empty}>Tidak ada data PENDING</td></tr>
              ) : filtered.map((item, i) => {
                const isSelected = selected.has(item.id);
                return (
                  <tr key={item.id} style={{
                    background: isSelected ? "rgba(56,189,248,0.08)" : i%2===0 ? "transparent" : "rgba(255,255,255,0.012)",
                    outline: isSelected ? "1px solid rgba(56,189,248,0.2)" : "none",
                  }}>
                    <td style={s.td}>
                      <input type="checkbox" className="atm-cb" checked={isSelected} onChange={() => toggleOne(item.id)} />
                    </td>
                    <Td mono dim>{item.id}</Td>
                    <Td dim small>{item.added_at ? new Date(item.added_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}) : "—"}</Td>
                    <Td mono bold accent="#38bdf8">{item.id_atm}</Td>
                    <Td dim small truncate>{item.lokasi || "—"}</Td>
                    <Td dim>{item.wilayah || "—"}</Td>
                    <Td><TypeBadge tipe={item.tipe} /></Td>
                    <Td>{fmtRp(item.saldo)}</Td>
                    <Td dim>{fmtRp(item.limit)}</Td>
                    <Td><PctBadge pct={item.pct_saldo} /></Td>
                    <Td dim small>{item.denom_options || "100000"}</Td>
                    <Td accent="#f59e0b">{fmtRp(item.jumlah_isi)}</Td>
                    <Td><StatusBadge status={item.status_awal || item.status} /></Td>
                    <Td>
                      {editRow?.id === item.id ? (
                        <div style={{ display:"flex", gap:4 }}>
                          <select value={editRow.value} onChange={e => setEditRow(r => ({...r,value:e.target.value}))}
                            style={{ ...s.inlineSelect, width:130 }}>
                            <option value="">— pilih —</option>
                            {KET_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                          <button onClick={() => saveInlineKet(item, editRow.value)} disabled={busy} style={s.saveSmBtn}>✓</button>
                          <button onClick={() => setEditRow(null)} style={s.cancelSmBtn}>✕</button>
                        </div>
                      ) : (
                        <span style={{ color: item.keterangan ? "#e2e8f0" : "#374151", fontSize:11, cursor:"pointer" }}
                          onClick={() => setEditRow({ id:item.id, value:item.keterangan||"" })}>
                          {item.keterangan || <span style={{ color:"#374151" }}>— edit</span>}
                        </span>
                      )}
                    </Td>
                    <Td small><SourceBadge src={item.added_by} /></Td>
                    <Td>
                      <div style={{ display:"flex", gap:4 }}>
                        <ActionBtn color="#4ade80" onClick={() => setConfirm({ type:"DONE", item })} title="Selesai">✔</ActionBtn>
                        <ActionBtn color="#f87171" onClick={() => setConfirm({ type:"REMOVED", item })} title="Batal">✕</ActionBtn>
                        <ActionBtn color="#ff3b5c" onClick={() => setConfirm({ type:"DELETE", item })} title="Hapus">⌫</ActionBtn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk confirm */}
      {bulkConfirm && (
        <ConfirmModal
          title={`Hapus ${selectedCount} ATM dari antrian?`}
          desc="Data tidak akan masuk Rekap Replacement. Aksi ini tidak bisa dibatalkan."
          danger onOk={doBulkDelete} onCancel={() => setBulkConfirm(false)} loading={busy} />
      )}

      {/* Single confirm */}
      {confirm && (
        <ConfirmModal
          title={
            confirm.type==="DELETE"  ? `Hapus ATM ${confirm.item.id_atm} dari antrian?` :
            confirm.type==="DONE"    ? `Tandai ATM ${confirm.item.id_atm} sebagai SELESAI?` :
                                       `Tandai ATM ${confirm.item.id_atm} sebagai BATAL?`
          }
          desc={
            confirm.type==="DELETE"  ? "Data tidak akan masuk Rekap. Tidak bisa dibatalkan." :
            confirm.type==="DONE"    ? "ATM akan pindah ke Rekap Replacement dengan status SELESAI." :
                                       "ATM akan pindah ke Rekap Replacement dengan status BATAL."
          }
          danger={confirm.type==="DELETE"}
          onOk={() => doStatusUpdate(confirm.item, confirm.type)}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}

      {/* Modal tambah */}
      {showAdd && (
        <Modal title="+ Tambah ATM ke Cash Plan" onClose={() => setShowAdd(false)}>
          <div style={s.formGrid}>
            {[
              { label:"ID ATM *",   key:"id_atm",  type:"text",   mono:true },
              { label:"Lokasi",     key:"lokasi",  type:"text"              },
              { label:"Saldo (Rp)", key:"saldo",   type:"number"            },
              { label:"Limit (Rp)", key:"limit",   type:"number"            },
            ].map(f => (
              <div key={f.key} style={s.formField}>
                <label style={s.formLabel}>{f.label}</label>
                <input type={f.type} value={addForm[f.key]}
                  onChange={e => setAddForm(p => ({ ...p, [f.key]: f.type==="number" ? Number(e.target.value) : e.target.value }))}
                  style={{ ...s.formInput, fontFamily: f.mono?"monospace":"inherit" }} />
              </div>
            ))}
            <div style={s.formField}>
              <label style={s.formLabel}>Wilayah</label>
              <select value={addForm.wilayah} onChange={e => setAddForm(p => ({...p,wilayah:e.target.value}))} style={s.formSelect}>
                {WILAYAH_LIST.slice(1).map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div style={s.formField}>
              <label style={s.formLabel}>Tipe</label>
              <select value={addForm.tipe} onChange={e => setAddForm(p => ({...p,tipe:e.target.value}))} style={s.formSelect}>
                {["EMV","CRM"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={s.formField}>
              <label style={s.formLabel}>Status Awal</label>
              <select value={addForm.status} onChange={e => setAddForm(p => ({...p,status:e.target.value}))} style={s.formSelect}>
                {["BONGKAR","AWAS","PERLU PANTAU"].map(ss => <option key={ss} value={ss}>{ss}</option>)}
              </select>
            </div>
            <div style={s.formField}>
              <label style={s.formLabel}>Denom Options</label>
              <select value={addForm.denom_options} onChange={e => setAddForm(p => ({...p,denom_options:e.target.value}))} style={s.formSelect}>
                <option value="100000">100.000</option>
                <option value="50000">50.000</option>
                <option value="50000,100000">50.000 &amp; 100.000</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={doAdd} disabled={busy} style={s.okBtn}>
              {busy ? "Menyimpan..." : "✓ Simpan ke Cash Plan"}
            </button>
            <button onClick={() => setShowAdd(false)} style={s.cancelBtn}>Batal</button>
          </div>
        </Modal>
      )}

      <style>{`
        input[type="checkbox"].atm-cb { accent-color:#38bdf8; width:15px; height:15px; cursor:pointer; }
      `}</style>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function Td({ children, mono, bold, dim, accent, small, truncate }) {
  return (
    <td style={{
      padding:"8px 12px", color: accent || "#e2e8f0",
      fontSize: small?10:12, fontWeight: bold?700:400,
      fontFamily: mono?"'IBM Plex Mono',monospace":"inherit",
      whiteSpace:"nowrap", maxWidth: truncate?140:"none",
      overflow: truncate?"hidden":"visible",
      textOverflow: truncate?"ellipsis":"clip",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
    }}>{children}</td>
  );
}
function ActionBtn({ children, color, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      background:`${color}15`, border:`1px solid ${color}35`,
      borderRadius:5, color, padding:"3px 8px", fontSize:12, cursor:"pointer", fontWeight:700,
    }}>{children}</button>
  );
}
function TypeBadge({ tipe }) {
  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
      background:tipe==="CRM"?"rgba(167,139,250,0.15)":"rgba(56,189,248,0.12)",
      color:tipe==="CRM"?"#a78bfa":"#38bdf8",
      border:`1px solid ${tipe==="CRM"?"rgba(167,139,250,0.3)":"rgba(56,189,248,0.25)"}`,
    }}>{tipe||"—"}</span>
  );
}
function StatusBadge({ status }) {
  const map = { BONGKAR:["#f87171","rgba(248,113,113,0.12)"], AWAS:["#fbbf24","rgba(251,191,36,0.1)"], "PERLU PANTAU":["#d4b800","rgba(212,184,0,0.1)"], AMAN:["#4ade80","rgba(74,222,128,0.1)"] };
  const [c,bg] = map[status] || ["#94a3b8","rgba(100,116,139,0.1)"];
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:bg, color:c, border:`1px solid ${c}33` }}>{status||"—"}</span>;
}
function SourceBadge({ src }) {
  const map = { system:["#38bdf8","rgba(56,189,248,0.1)"], notif:["#f59e0b","rgba(245,158,11,0.1)"], manual:["#4ade80","rgba(74,222,128,0.1)"], history:["#a78bfa","rgba(167,139,250,0.1)"] };
  const [c,bg] = map[src] || ["#94a3b8","rgba(100,116,139,0.1)"];
  return <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:bg, color:c }}>{src||"—"}</span>;
}
function PctBadge({ pct }) {
  const v = parseFloat(pct||0);
  const c = v<=20?"#f87171":v<=30?"#fbbf24":v<=35?"#d4b800":"#4ade80";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <div style={{ width:36, height:4, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
        <div style={{ width:`${Math.min(v,100)}%`, height:"100%", background:c, borderRadius:2 }} />
      </div>
      <span style={{ color:c, fontSize:11, fontWeight:700, fontFamily:"monospace" }}>{v.toFixed(0)}%</span>
    </div>
  );
}
function TableSkeleton() {
  return (
    <div style={{ padding:"20px 0" }}>
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{ height:36, background:`rgba(56,189,248,${0.02+i*0.005})`, borderRadius:4, marginBottom:4 }} />
      ))}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#38bdf8", fontSize:16, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", fontSize:20, cursor:"pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ConfirmModal({ title, desc, danger, onOk, onCancel, loading }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth:420 }}>
        <div style={{ fontSize:28, marginBottom:12, textAlign:"center" }}>{danger ? "⚠️" : "❓"}</div>
        <h3 style={{ color: danger?"#f87171":"#e2e8f0", fontSize:15, fontWeight:700, margin:"0 0 8px", textAlign:"center" }}>{title}</h3>
        <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>{desc}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onOk} disabled={loading} style={{ flex:1, padding:"10px", borderRadius:8, fontWeight:700, fontSize:13, cursor:loading?"not-allowed":"pointer", background:danger?"rgba(248,113,113,0.15)":"rgba(74,222,128,0.15)", border:danger?"1px solid rgba(248,113,113,0.4)":"1px solid rgba(74,222,128,0.4)", color:danger?"#f87171":"#4ade80" }}>
            {loading ? "Proses..." : danger ? "⌫ Hapus" : "✓ Konfirmasi"}
          </button>
          <button onClick={onCancel} style={{ padding:"10px 20px", borderRadius:8, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8" }}>Batal</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  toolbar:    { display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" },
  searchInput:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:12, outline:"none", width:240 },
  addBtn:     { background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, color:"#4ade80", padding:"8px 16px", fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"monospace" },
  refreshBtn: { background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#38bdf8", padding:"8px 12px", fontSize:14, cursor:"pointer" },
  tableWrap:  { overflowX:"auto", borderRadius:10, border:"1px solid rgba(56,189,248,0.08)", background:"rgba(5,11,24,0.6)" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th:         { padding:"10px 12px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap", borderBottom:"1px solid rgba(56,189,248,0.1)", fontFamily:"'IBM Plex Mono',monospace", background:"rgba(0,0,0,0.2)" },
  td:         { padding:"8px 8px 8px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)", verticalAlign:"middle" },
  empty:      { padding:"60px 20px", textAlign:"center", color:"#475569", fontSize:13 },
  inlineSelect:{ background:"#000", border:"1px solid rgba(167,139,250,0.3)", borderRadius:5, color:"#a78bfa", padding:"3px 6px", fontSize:11, outline:"none", cursor:"pointer" },
  saveSmBtn:  { background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.35)", borderRadius:5, color:"#4ade80", padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:700 },
  cancelSmBtn:{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:5, color:"#f87171", padding:"3px 8px", fontSize:11, cursor:"pointer" },
  bulkBar:    { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", marginBottom:12, borderRadius:9, background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.25)" },
  bulkBadge:  { display:"inline-flex", alignItems:"center", justifyContent:"center", minWidth:26, height:22, borderRadius:6, background:"rgba(56,189,248,0.2)", color:"#38bdf8", fontSize:12, fontWeight:800, border:"1px solid rgba(56,189,248,0.4)", fontFamily:"monospace", padding:"0 6px" },
  bulkClearBtn:{ background:"transparent", border:"1px solid rgba(56,189,248,0.25)", borderRadius:6, color:"#38bdf8", padding:"4px 10px", fontSize:11, cursor:"pointer" },
  bulkDeleteBtn:{ background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.35)", borderRadius:7, color:"#f87171", padding:"7px 16px", fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"monospace" },
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:      { background:"#080e1d", border:"1px solid rgba(56,189,248,0.2)", borderRadius:16, padding:"28px 32px", width:600, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" },
  formGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  formField:  { display:"flex", flexDirection:"column", gap:5 },
  formLabel:  { color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" },
  formInput:  { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none" },
  formSelect: { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none", cursor:"pointer" },
  okBtn:      { flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)", color:"#4ade80", fontFamily:"monospace" },
  cancelBtn:  { padding:"11px 20px", borderRadius:9, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8" },
};