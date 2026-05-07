import { useState, useEffect, useCallback, useMemo } from "react";
import {
  apiFetch,
  getCashplanAPI,
  updateCashplanStatusAPI,
  removeCashplanAPI,
  getRekapReplacementAPI,
  updateRekapAPI,
} from "../utils/api";

// ── Config ─────────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD  = "brks2026";
const API_BASE        = import.meta.env?.VITE_API_URL || "http://localhost:8000";
const BULAN_ID        = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const WILAYAH_LIST    = ["Semua","Pekanbaru","Batam","Dumai","Tanjung Pinang"];
const KET_OPTIONS     = ["Mesin Rusak","Kas Banyak","Lokasi Tutup","Keluhan Jaringan"];
const ALL_DENOM       = [{ label:"Rp 50.000", value:50_000 },{ label:"Rp 100.000", value:100_000 }];
const fmtRp           = v => v == null || isNaN(v) ? "—" : "Rp " + Number(v).toLocaleString("id-ID");
const nowBulan        = () => BULAN_ID[new Date().getMonth()];
const nowTahun        = () => new Date().getFullYear();

function getDenomOpts(item) {
  const raw  = item?.denom_options || "100000";
  const vals = String(raw).split(",").map(v => parseInt(v.trim(),10)).filter(v => !isNaN(v) && v > 0);
  const opts = ALL_DENOM.filter(o => vals.includes(o.value));
  return opts.length > 0 ? opts : [{ label:"Rp 100.000", value:100_000 }];
}

// ── Tiny API helpers ──────────────────────────────────────────────────────────
async function deleteCashplanDirect(id) {
  const r = await fetch(`${API_BASE}/api/cashplan/${id}`, { method:"DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
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

// ══════════════════════════════════════════════════════════════════════════════
//  DEFAULT EXPORT — AdminPanel (akses via /#/admin)
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [authed,   setAuthed]   = useState(() => sessionStorage.getItem("admin_authed") === "1");
  const [pwInput,  setPwInput]  = useState("");
  const [pwErr,    setPwErr]    = useState(false);
  const [tab,      setTab]      = useState("cashplan");
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_authed","1");
      setAuthed(true);
    } else {
      setPwErr(true);
      setTimeout(() => setPwErr(false), 1200);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authed");
    setAuthed(false);
    setPwInput("");
  };

  if (!authed) return <LoginGate pw={pwInput} setPw={setPwInput} err={pwErr} onLogin={handleLogin} />;

  return (
    <div style={styles.root}>
      <div style={styles.scanlines} />
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>⬡</div>
          <div>
            <div style={styles.logoTitle}>ADMIN PANEL</div>
            <div style={styles.logoSub}>BRK Syariah · ATM Monitoring System</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={styles.statusDot} />
          <span style={{ color:"#4ade80", fontSize:11, fontFamily:"monospace" }}>CONNECTED</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>⎋ Logout</button>
        </div>
      </header>

      <div style={styles.tabBar}>
        {[
          { key:"cashplan", label:"◈ Cash Plan (PENDING)", accent:"#38bdf8" },
          { key:"rekap",    label:"◎ Rekap Replacement",   accent:"#a78bfa" },
          { key:"users",    label:"◉ Kelola User",          accent:"#4ade80" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...styles.tabBtn,
            borderBottomColor: tab === t.key ? t.accent : "transparent",
            color:             tab === t.key ? t.accent : "#ffffff",
            background:        tab === t.key ? `${t.accent}10` : "transparent",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={styles.content}>
        {tab === "cashplan" && <CashplanCRUD showToast={showToast} />}
        {tab === "rekap"    && <RekapCRUD    showToast={showToast} />}
        {tab === "users"    && <UserCRUD     showToast={showToast} />}
      </div>

      {toast && (
        <div style={{
          ...styles.toast,
          background:  toast.type === "ok" ? "rgba(74,222,128,0.12)"  : "rgba(248,113,113,0.12)",
          borderColor: toast.type === "ok" ? "#4ade80" : "#f87171",
          color:       toast.type === "ok" ? "#4ade80" : "#f87171",
        }}>
          {toast.type === "ok" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes glow    { from{opacity:0.7;box-shadow:0 0 4px #4ade80}  to{opacity:1;box-shadow:0 0 10px #4ade80} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)}     to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { from{opacity:0.4} to{opacity:0.8} }
        @keyframes shake   { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        @keyframes bulkSlideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .cb-row:hover { background: rgba(56,189,248,0.05) !important; }
        input[type="checkbox"].atm-cb   { accent-color:#38bdf8; width:15px; height:15px; cursor:pointer; }
        input[type="checkbox"].rekap-cb { accent-color:#a78bfa; width:15px; height:15px; cursor:pointer; }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CASHPLAN CRUD
// ══════════════════════════════════════════════════════════════════════════════
export function CashplanCRUD({ showToast }) {
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
        id_atm:    addForm.id_atm.toUpperCase(),
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
      <div style={styles.toolbar}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="⌕  Cari ID ATM / Lokasi..." style={styles.searchInput} />
        <span style={{ color:"#ffffff", fontSize:12, fontFamily:"monospace" }}>{filtered.length} rows</span>
        <button onClick={() => setShowAdd(true)} style={styles.addBtn}>+ Tambah Baru</button>
        <button onClick={load} style={styles.refreshBtn} disabled={loading}>↺</button>
      </div>

      {selectedCount > 0 && (
        <div style={styles.bulkBar}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={styles.bulkBadge}>{selectedCount}</span>
            <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>item dipilih</span>
            <button onClick={() => setSelected(new Set())} style={styles.bulkClearBtn}>✕ Batal pilih</button>
          </div>
          <button onClick={() => setBulkConfirm(true)} disabled={busy} style={styles.bulkDeleteBtn}>
            ⌫ Hapus {selectedCount} yang dipilih
          </button>
        </div>
      )}

      {loading ? <TableSkeleton /> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.thStyle, width:36, padding:"10px 8px 10px 14px" }}>
                  <input type="checkbox" className="atm-cb" checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll} title="Pilih semua" />
                </th>
                {["ID","Tgl Masuk","ID ATM","Lokasi","Wilayah","Tipe","Saldo","Limit","% Saldo",
                  "Denom","Jumlah Isi","Status Awal","Keterangan","Sumber","Aksi"].map(h => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={16} style={styles.empty}>Tidak ada data PENDING</td></tr>
              ) : filtered.map((item, i) => {
                const isSelected = selected.has(item.id);
                return (
                  <tr key={item.id} className="cb-row" style={{
                    background: isSelected ? "rgba(56,189,248,0.08)"
                      : i%2===0 ? "transparent" : "rgba(255,255,255,0.012)",
                    transition:"background 0.1s",
                    outline: isSelected ? "1px solid rgba(56,189,248,0.2)" : "none",
                  }}>
                    <td style={{ padding:"8px 8px 8px 14px", borderBottom:"1px solid rgb(255, 255, 255)", verticalAlign:"middle" }}>
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
                          <select value={editRow.value} onChange={e=>setEditRow(r=>({...r,value:e.target.value}))}
                            style={{ ...styles.inlineSelect, width:130 }}>
                            <option value="">— pilih —</option>
                            {KET_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
                          </select>
                          <button onClick={() => saveInlineKet(item, editRow.value)} disabled={busy} style={styles.saveSmBtn}>✓</button>
                          <button onClick={() => setEditRow(null)} style={styles.cancelSmBtn}>✕</button>
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
                        <ActionBtn color="#4ade80" onClick={() => setConfirm({ type:"DONE",    item })} title="Selesai">✔</ActionBtn>
                        <ActionBtn color="#f87171" onClick={() => setConfirm({ type:"REMOVED", item })} title="Batal">✕</ActionBtn>
                        <ActionBtn color="#ff3b5c" onClick={() => setConfirm({ type:"DELETE",  item })} title="Hapus dari DB">⌫</ActionBtn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {bulkConfirm && (
        <BulkConfirmModal count={selectedCount} items={filtered.filter(x => selected.has(x.id))}
          onOk={doBulkDelete} onCancel={() => setBulkConfirm(false)} loading={busy} accent="#38bdf8" />
      )}

      {confirm && (
        <ConfirmModal
          title={
            confirm.type==="DELETE"  ? `Hapus ATM ${confirm.item.id_atm} dari antrian?` :
            confirm.type==="DONE"    ? `Tandai ATM ${confirm.item.id_atm} sebagai SELESAI?` :
                                       `Tandai ATM ${confirm.item.id_atm} sebagai BATAL?`
          }
          desc={
            confirm.type==="DELETE"  ? "Data tidak akan masuk Rekap Replacement. Aksi ini tidak bisa dibatalkan." :
            confirm.type==="DONE"    ? "ATM akan pindah ke Rekap Replacement dengan status SELESAI." :
                                       "ATM akan pindah ke Rekap Replacement dengan status BATAL."
          }
          danger={confirm.type==="DELETE"}
          onOk={() => doStatusUpdate(confirm.item, confirm.type)}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}

      {showAdd && (
        <Modal title="+ Tambah ATM ke Cash Plan" onClose={() => setShowAdd(false)}>
          <div style={styles.formGrid}>
            {[
              { label:"ID ATM *",   key:"id_atm",  type:"text",   mono:true },
              { label:"Lokasi",     key:"lokasi",  type:"text"              },
              { label:"Saldo (Rp)", key:"saldo",   type:"number"            },
              { label:"Limit (Rp)", key:"limit",   type:"number"            },
            ].map(f => (
              <div key={f.key} style={styles.formField}>
                <label style={styles.formLabel}>{f.label}</label>
                <input type={f.type} value={addForm[f.key]}
                  onChange={e => setAddForm(p => ({ ...p, [f.key]: f.type==="number" ? Number(e.target.value) : e.target.value }))}
                  style={{ ...styles.formInput, fontFamily: f.mono?"monospace":"inherit" }} />
              </div>
            ))}
            <div style={styles.formField}>
              <label style={styles.formLabel}>Wilayah</label>
              <select value={addForm.wilayah} onChange={e=>setAddForm(p=>({...p,wilayah:e.target.value}))} style={styles.formSelect}>
                {WILAYAH_LIST.slice(1).map(w=><option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Tipe</label>
              <select value={addForm.tipe} onChange={e=>setAddForm(p=>({...p,tipe:e.target.value}))} style={styles.formSelect}>
                {["EMV","CRM"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Status Awal</label>
              <select value={addForm.status} onChange={e=>setAddForm(p=>({...p,status:e.target.value}))} style={styles.formSelect}>
                {["BONGKAR","AWAS","PERLU PANTAU"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Denom Options</label>
              <select value={addForm.denom_options} onChange={e=>setAddForm(p=>({...p,denom_options:e.target.value}))} style={styles.formSelect}>
                <option value="100000">100.000</option>
                <option value="50000">50.000</option>
                <option value="50000,100000">50.000 &amp; 100.000</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={doAdd} disabled={busy} style={styles.confirmOkBtn}>
              {busy ? "Menyimpan..." : "✓ Simpan ke Cash Plan"}
            </button>
            <button onClick={() => setShowAdd(false)} style={styles.confirmCancelBtn}>Batal</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  REKAP CRUD
// ══════════════════════════════════════════════════════════════════════════════
export function RekapCRUD({ showToast }) {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterBulan, setFilterBulan] = useState(nowBulan());
  const [filterWil,   setFilterWil]   = useState("Semua");
  const [search,      setSearch]      = useState("");
  const [editRow,     setEditRow]     = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [busy,        setBusy]        = useState(false);
  const [selected,    setSelected]    = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await getRekapReplacementAPI({
        bulan:   filterBulan,
        tahun:   nowTahun(),
        wilayah: filterWil !== "Semua" ? filterWil : undefined,
      });
      setItems(r.data || []);
    } catch(e) { showToast(e.message,"err"); }
    finally { setLoading(false); }
  }, [filterBulan, filterWil]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(r =>
      r.id_atm?.toLowerCase().includes(q) ||
      r.lokasi?.toLowerCase().includes(q)
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

  const doBulkDeleteRekap = async () => {
    setBusy(true);
    showToast("Endpoint DELETE rekap belum tersedia di backend.", "err");
    setBulkConfirm(false);
    setBusy(false);
  };

  const openEdit = (item) => {
    setEditRow({
      id:           item.id,
      tgl_isi:      item.tgl_isi      || "",
      jam_cash_in:  item.jam_cash_in  || "",
      jam_cash_out: item.jam_cash_out || "",
      denom:        item.denom        || 100_000,
      keterangan:   item.keterangan   || "",
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      await updateRekapAPI(editRow.id, {
        tgl_isi:      editRow.tgl_isi      || null,
        jam_cash_in:  editRow.jam_cash_in  || null,
        jam_cash_out: editRow.jam_cash_out || null,
        denom:        editRow.denom,
      });
      setItems(p => p.map(x => x.id === editRow.id ? { ...x, ...editRow, is_saved:true } : x));
      showToast("Rekap diperbarui");
      setEditRow(null);
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); }
  };

  const doUnlock = async (item) => {
    setBusy(true);
    try {
      await updateRekapAPI(item.id, {
        tgl_isi:      item.tgl_isi      || null,
        jam_cash_in:  item.jam_cash_in  || null,
        jam_cash_out: item.jam_cash_out || null,
        denom:        item.denom        || 100_000,
      });
      setItems(p => p.map(x => x.id === item.id ? { ...x, is_saved: false } : x));
      showToast(`Rekap #${item.id} (${item.id_atm}) dibuka untuk edit`);
      setConfirm(null);
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div style={styles.toolbar}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="⌕  Cari ID ATM..." style={styles.searchInput} />
        <select value={filterBulan} onChange={e=>setFilterBulan(e.target.value)} style={styles.filterSelect}>
          {BULAN_ID.map(b=><option key={b} value={b}>{b} {nowTahun()}</option>)}
        </select>
        <select value={filterWil} onChange={e=>setFilterWil(e.target.value)} style={styles.filterSelect}>
          {WILAYAH_LIST.map(w=><option key={w} value={w}>{w}</option>)}
        </select>
        <span style={{ color:"#ffffff", fontSize:12, fontFamily:"monospace" }}>{filtered.length} rows</span>
        <button onClick={load} style={styles.refreshBtn} disabled={loading}>↺</button>
      </div>

      {selectedCount > 0 && (
        <div style={{ ...styles.bulkBar, borderColor:"rgba(167,139,250,0.3)", background:"rgba(167,139,250,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ ...styles.bulkBadge, background:"rgba(167,139,250,0.2)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.4)" }}>{selectedCount}</span>
            <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>rekap dipilih</span>
            <button onClick={() => setSelected(new Set())} style={{ ...styles.bulkClearBtn, color:"#a78bfa", borderColor:"rgba(167,139,250,0.3)" }}>✕ Batal pilih</button>
          </div>
          <button onClick={() => setBulkConfirm(true)} disabled={busy} style={styles.bulkDeleteBtn}>
            ⌫ Hapus {selectedCount} yang dipilih
          </button>
        </div>
      )}

      {loading ? <TableSkeleton /> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["ID","Done At","Bulan","ID ATM","Lokasi","Wilayah","Tipe","Saldo Akhir",
                  "Jumlah Isi","Denom","Lembar","Tgl Isi","Cash In","Cash Out","Status",
                  "Keterangan","Saved","Aksi"].map(h=>(
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={18} style={styles.empty}>Tidak ada data rekap bulan {filterBulan}</td></tr>
              ) : filtered.map((item, i) => {
                const isEditing  = editRow?.id === item.id;
                const isSelected = selected.has(item.id);
                const ed = editRow || {};
                const denomOpts = getDenomOpts(item);
                return (
                  <tr key={item.id} className="cb-row" style={{
                    background: isSelected ? "rgba(167,139,250,0.08)"
                      : item.is_saved ? "rgba(74,222,128,0.025)"
                      : i%2===0 ? "transparent" : "rgba(255,255,255,0.012)",
                    transition:"background 0.1s",
                    outline: isSelected ? "1px solid rgba(167,139,250,0.2)" : "none",
                  }}>
                    <Td mono dim>{item.id}</Td>
                    <Td dim small>{item.done_at ? new Date(item.done_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}) : "—"}</Td>
                    <Td dim small>{item.bulan||filterBulan}</Td>
                    <Td mono bold accent="#a78bfa">{item.id_atm}</Td>
                    <Td dim small truncate>{item.lokasi||"—"}</Td>
                    <Td dim>{item.wilayah||"—"}</Td>
                    <Td><TypeBadge tipe={item.tipe} /></Td>
                    <Td>{fmtRp(item.saldo_awal)}</Td>
                    <Td accent="#f59e0b">{fmtRp(item.jumlah_isi)}</Td>
                    <Td>
                      {isEditing ? (
                        <select value={ed.denom} onChange={e=>setEditRow(r=>({...r,denom:Number(e.target.value)}))} style={styles.inlineSelect}>
                          {denomOpts.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      ) : <span style={{ color:"#ffffff", fontSize:11 }}>{fmtRp(item.denom)}</span>}
                    </Td>
                    <Td>{item.lembar ? `${item.lembar} lbr` : "—"}</Td>
                    <Td>
                      {isEditing ? (
                        <input type="date" value={ed.tgl_isi} onChange={e=>setEditRow(r=>({...r,tgl_isi:e.target.value}))} style={styles.inlineInput} />
                      ) : <span style={{ color: item.tgl_isi?"#e2e8f0":"#374151", fontSize:11 }}>{item.tgl_isi || "—"}</span>}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input type="time" value={ed.jam_cash_in} onChange={e=>setEditRow(r=>({...r,jam_cash_in:e.target.value}))} style={{...styles.inlineInput,width:80}} />
                      ) : <span style={{ color: item.jam_cash_in?"#60a5fa":"#374151", fontSize:11, fontFamily:"monospace" }}>{item.jam_cash_in||"—"}</span>}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input type="time" value={ed.jam_cash_out} onChange={e=>setEditRow(r=>({...r,jam_cash_out:e.target.value}))} style={{...styles.inlineInput,width:80}} />
                      ) : <span style={{ color: item.jam_cash_out?"#60a5fa":"#374151", fontSize:11, fontFamily:"monospace" }}>{item.jam_cash_out||"—"}</span>}
                    </Td>
                    <Td><RekapStatusBadge status={item.status_done} /></Td>
                    <Td dim small truncate>{item.keterangan||"—"}</Td>
                    <Td>
                      {item.is_saved
                        ? <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(74,222,128,0.1)", color:"#4ade80", border:"1px solid rgba(74,222,128,0.25)" }}>✓ SAVED</span>
                        : <span style={{ fontSize:10, color:"#ffffff" }}>—</span>
                      }
                    </Td>
                    <Td>
                      {isEditing ? (
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={saveEdit} disabled={busy} style={styles.saveSmBtn}>✓ Save</button>
                          <button onClick={() => setEditRow(null)} style={styles.cancelSmBtn}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex", gap:4 }}>
                          <ActionBtn color="#38bdf8" onClick={() => openEdit(item)} title="Edit">✎</ActionBtn>
                          {item.is_saved && (
                            <ActionBtn color="#f59e0b" onClick={() => setConfirm({ type:"unlock", item })} title="Buka kunci">🔓</ActionBtn>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {bulkConfirm && (
        <BulkConfirmModal count={selectedCount} items={filtered.filter(x => selected.has(x.id))}
          onOk={doBulkDeleteRekap} onCancel={() => setBulkConfirm(false)} loading={busy} accent="#a78bfa" />
      )}

      {confirm?.type === "unlock" && (
        <ConfirmModal
          title={`Buka kunci rekap #${confirm.item.id} (${confirm.item.id_atm})?`}
          desc="Data akan bisa diedit kembali. Setelah disimpan ulang, status SAVED akan aktif lagi."
          danger={false}
          onOk={() => doUnlock(confirm.item)}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  USER CRUD
// ══════════════════════════════════════════════════════════════════════════════
export function UserCRUD({ showToast }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [confirm,     setConfirm]     = useState(null);
  const [busy,        setBusy]        = useState(false);
  const [search,      setSearch]      = useState("");
  const [resetModal,  setResetModal]  = useState(null);
  const [newPw,       setNewPw]       = useState("");
  const [addForm,     setAddForm]     = useState({
    username:"", email:"", full_name:"", password:"",
    role:"viewer", wilayah:"",
  });

  const WILAYAH_OPTS = ["","Pekanbaru","Batam","Dumai","Tanjung Pinang"];
  const ROLE_OPTS    = ["viewer","operator","admin"];
  const ROLE_COLOR   = { admin:"#ffffff", operator:"#60a5fa", viewer:"#4ade80" };
  const ROLE_BG      = { admin:"rgba(248,113,113,0.12)", operator:"rgba(96,165,250,0.12)", viewer:"rgba(74,222,128,0.1)" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sipras_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/auth/users`, { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Gagal memuat user");
      }
      const data = await res.json();
      setUsers(data.data || []);
    } catch(e) {
      showToast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const doAdd = async () => {
    if (!addForm.username.trim())    return showToast("Username wajib diisi", "err");
    if (!addForm.email.trim())       return showToast("Email wajib diisi", "err");
    if (!addForm.full_name.trim())   return showToast("Nama lengkap wajib diisi", "err");
    if (addForm.password.length < 6) return showToast("Password minimal 6 karakter", "err");
    setBusy(true);
    try {
      const token = localStorage.getItem("sipras_token");
      const res = await fetch(`${API_BASE}/api/auth/register-by-admin`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username:  addForm.username.trim(),
          email:     addForm.email.trim(),
          full_name: addForm.full_name.trim(),
          password:  addForm.password,
          role:      addForm.role,
          wilayah:   addForm.wilayah || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal tambah user");
      showToast(`User '${addForm.username}' berhasil ditambahkan`);
      setShowAdd(false);
      setAddForm({ username:"", email:"", full_name:"", password:"", role:"viewer", wilayah:"" });
      await load();
    } catch(e) {
      showToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const doToggle = async (user) => {
    setBusy(true);
    try {
      const token = localStorage.getItem("sipras_token");
      const res = await fetch(`${API_BASE}/api/auth/users/${user.id}/toggle`, {
        method:  "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal update status");
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, is_active: data.is_active } : u
      ));
      showToast(`User '${user.username}' ${data.is_active ? "diaktifkan" : "dinonaktifkan"}`);
    } catch(e) {
      showToast(e.message, "err");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const doResetPw = async () => {
    if (!newPw || newPw.length < 6) return showToast("Password minimal 6 karakter", "err");
    setBusy(true);
    try {
      const token = localStorage.getItem("sipras_token");
      const res = await fetch(`${API_BASE}/api/auth/users/${resetModal.id}/reset-password`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal reset password");
      showToast(`Password '${resetModal.username}' berhasil direset`);
      setResetModal(null);
      setNewPw("");
    } catch(e) {
      showToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    admin:    users.filter(u => u.role === "admin").length,
    operator: users.filter(u => u.role === "operator").length,
    viewer:   users.filter(u => u.role === "viewer").length,
  }), [users]);

  return (
    <div>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Total User",  value:stats.total,    color:"#38bdf8" },
          { label:"Aktif",       value:stats.active,   color:"#4ade80" },
          { label:"Admin",       value:stats.admin,    color:"#f87171" },
          { label:"Operator",    value:stats.operator, color:"#60a5fa" },
          { label:"Viewer",      value:stats.viewer,   color:"#a3a3a3" },
        ].map(s => (
          <div key={s.label} style={{
            background:"rgba(255,255,255,0.03)",
            border:`1px solid ${s.color}22`,
            borderRadius:10, padding:"14px 16px", textAlign:"center",
          }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:"'IBM Plex Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize:10, color:"#ffffff", marginTop:3, textTransform:"uppercase", letterSpacing:"0.07em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="⌕  Cari username / nama / email..."
          style={{ ...styles.searchInput, width:280 }} />
        <span style={{ color:"#ffffff", fontSize:12, fontFamily:"monospace" }}>{filtered.length} user</span>
        <button onClick={() => setShowAdd(true)} style={styles.addBtn}>+ Tambah User</button>
        <button onClick={load} style={styles.refreshBtn} disabled={loading}>↺</button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton /> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["ID","Username","Nama Lengkap","Email","Role","Wilayah",
                  "Status","Terdaftar","Last Login","Aksi"].map(h => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={styles.empty}>Tidak ada user ditemukan</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} className="cb-row" style={{
                  background: !u.is_active ? "rgba(248,113,113,0.03)"
                    : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                  opacity: u.is_active ? 1 : 0.6,
                }}>
                  <Td mono dim>{u.id}</Td>
                  <Td mono bold accent="#38bdf8">{u.username}</Td>
                  <Td>{u.full_name || "—"}</Td>
                  <Td dim small>{u.email}</Td>
                  <Td>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:5,
                      background: ROLE_BG[u.role]    || "rgba(100,116,139,0.1)",
                      color:      ROLE_COLOR[u.role]  || "#ffffff",
                      border:     `1px solid ${ROLE_COLOR[u.role] || "#ffffff"}33`,
                      textTransform:"uppercase",
                    }}>
                      {u.role}
                    </span>
                  </Td>
                  <Td dim small>{u.wilayah || "Semua"}</Td>
                  <Td>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5,
                      background: u.is_active ? "rgba(74,222,128,0.1)"  : "rgba(248,113,113,0.1)",
                      color:      u.is_active ? "#4ade80" : "#f87171",
                      border:     `1px solid ${u.is_active ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                    }}>
                      {u.is_active ? "✓ AKTIF" : "✕ NONAKTIF"}
                    </span>
                  </Td>
                  <Td dim small>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID",{dateStyle:"short"}) : "—"}
                  </Td>
                  <Td dim small>
                    {u.last_login
                      ? new Date(u.last_login).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"})
                      : <span style={{ color:"#374151" }}>Belum login</span>}
                  </Td>
                  <Td>
                    <div style={{ display:"flex", gap:4 }}>
                      <ActionBtn color={u.is_active ? "#f87171" : "#4ade80"}
                        title={u.is_active ? "Nonaktifkan" : "Aktifkan"}
                        onClick={() => setConfirm({ type:"toggle", user: u })}>
                        {u.is_active ? "⏸" : "▶"}
                      </ActionBtn>
                      <ActionBtn color="#f59e0b" title="Reset Password"
                        onClick={() => { setResetModal(u); setNewPw(""); }}>
                        🔑
                      </ActionBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah User */}
      {showAdd && (
        <Modal title="+ Tambah User Baru" onClose={() => setShowAdd(false)}>
          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Username *</label>
              <input style={{ ...styles.formInput, fontFamily:"monospace" }}
                placeholder="min. 3 karakter"
                value={addForm.username}
                onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Nama Lengkap *</label>
              <input style={styles.formInput} placeholder="Nama lengkap"
                value={addForm.full_name}
                onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Email *</label>
              <input type="email" style={styles.formInput} placeholder="email@brks.co.id"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Password * (min. 6 karakter)</label>
              <input type="password" style={styles.formInput} placeholder="••••••••"
                value={addForm.password}
                onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Role</label>
              <select style={styles.formSelect} value={addForm.role}
                onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                {ROLE_OPTS.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Wilayah (kosong = semua)</label>
              <select style={styles.formSelect} value={addForm.wilayah}
                onChange={e => setAddForm(p => ({ ...p, wilayah: e.target.value }))}>
                {WILAYAH_OPTS.map(w => (
                  <option key={w} value={w}>{w || "— Semua Wilayah —"}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(56,189,248,0.05)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8 }}>
            <p style={{ color:"#93c5fd", fontSize:11, margin:0, lineHeight:1.7 }}>
              <span style={{ color:"#f87171", fontWeight:700 }}>Admin</span> — Akses penuh + kelola user &nbsp;|&nbsp;
              <span style={{ color:"#60a5fa", fontWeight:700 }}>Operator</span> — Upload & manage cashplan &nbsp;|&nbsp;
              <span style={{ color:"#4ade80", fontWeight:700 }}>Viewer</span> — Hanya lihat data
            </p>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={doAdd} disabled={busy} style={styles.confirmOkBtn}>
              {busy ? "Menyimpan..." : "✓ Tambah User"}
            </button>
            <button onClick={() => setShowAdd(false)} style={styles.confirmCancelBtn}>Batal</button>
          </div>
        </Modal>
      )}

      {/* Modal Reset Password */}
      {resetModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalBox, maxWidth:400 }}>
            <div style={{ fontSize:32, textAlign:"center", marginBottom:12 }}>🔑</div>
            <h3 style={{ color:"#f59e0b", fontSize:15, fontWeight:700, textAlign:"center", margin:"0 0 6px", fontFamily:"'IBM Plex Mono',monospace" }}>
              Reset Password
            </h3>
            <p style={{ color:"#ffffff", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>
              User: <strong style={{ color:"#38bdf8" }}>{resetModal.username}</strong>
              {" · "}{resetModal.full_name}
            </p>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Password Baru *</label>
              <input type="password"
                style={{ ...styles.formInput, textAlign:"center", letterSpacing:"0.15em" }}
                placeholder="min. 6 karakter"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                autoFocus />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={doResetPw} disabled={busy} style={{
                ...styles.confirmOkBtn,
                background:"rgba(245,158,11,0.15)",
                borderColor:"rgba(245,158,11,0.4)",
                color:"#f59e0b",
              }}>
                {busy ? "Menyimpan..." : "✓ Simpan Password"}
              </button>
              <button onClick={() => { setResetModal(null); setNewPw(""); }} style={styles.confirmCancelBtn}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Toggle */}
      {confirm?.type === "toggle" && (
        <ConfirmModal
          title={confirm.user.is_active
            ? `Nonaktifkan user '${confirm.user.username}'?`
            : `Aktifkan kembali user '${confirm.user.username}'?`}
          desc={confirm.user.is_active
            ? "User tidak bisa login sampai diaktifkan kembali."
            : "User akan bisa login kembali ke sistem."}
          danger={confirm.user.is_active}
          onOk={() => doToggle(confirm.user)}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  BULK CONFIRM MODAL
// ══════════════════════════════════════════════════════════════════════════════
function BulkConfirmModal({ count, items, onOk, onCancel, loading, accent="#38bdf8" }) {
  const preview = items.slice(0, 5);
  const extra   = items.length - preview.length;
  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalBox, maxWidth:480 }}>
        <div style={{ fontSize:32, marginBottom:12, textAlign:"center" }}>🗑️</div>
        <h3 style={{ color:"#f87171", fontSize:16, fontWeight:700, margin:"0 0 6px", textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>
          Hapus {count} Item?
        </h3>
        <p style={{ color:"#ffffff", fontSize:12, textAlign:"center", margin:"0 0 16px" }}>
          Aksi ini tidak bisa dibatalkan. Data berikut akan dihapus permanen:
        </p>
        <div style={{ background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.15)", borderRadius:8, padding:"10px 14px", marginBottom:20 }}>
          {preview.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color:accent, fontSize:11, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>{item.id_atm}</span>
              <span style={{ color:"#ffffff", fontSize:11 }}>{item.lokasi || "—"}</span>
              <span style={{ color:"#ffffff", fontSize:10, marginLeft:"auto" }}>{item.wilayah || ""}</span>
            </div>
          ))}
          {extra > 0 && (
            <div style={{ color:"#ffffff", fontSize:11, paddingTop:6, fontStyle:"italic" }}>
              + {extra} item lainnya...
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onOk} disabled={loading} style={{
            flex:1, padding:"11px", borderRadius:8, fontWeight:700, fontSize:13,
            cursor:loading?"not-allowed":"pointer",
            background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.4)",
            color:"#f87171", fontFamily:"'IBM Plex Mono',monospace",
          }}>
            {loading ? "Menghapus..." : `⌫ Ya, Hapus ${count} Item`}
          </button>
          <button onClick={onCancel} style={{
            padding:"11px 20px", borderRadius:8, fontSize:13, cursor:"pointer",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.15)", color:"#ffffff",
          }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function LoginGate({ pw, setPw, err, onLogin }) {
  return (
    <div style={styles.loginRoot}>
      <div style={styles.scanlines} />
      <div style={{ ...styles.loginCard, animation: err ? "shake 0.3s ease" : "none" }}>
        <h1 style={styles.loginTitle}>ADMIN ACCESS</h1>
        <p style={styles.loginSub}>BRK Syariah · 2026</p>
        <input type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onLogin()}
          placeholder="Password" autoFocus
          style={{ ...styles.loginInput, borderColor: err ? "#f87171" : "rgba(56,189,248,0.25)" }} />
        {err && <p style={styles.loginErr}>⊗ Password salah</p>}
        <button onClick={onLogin} style={styles.loginBtn}>Masuk →</button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#38bdf8", fontSize:16, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono', monospace" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#ffffff", fontSize:20, cursor:"pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, desc, danger, onOk, onCancel, loading }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalBox, maxWidth:420 }}>
        <div style={{ fontSize:28, marginBottom:12, textAlign:"center" }}>{danger ? "⚠️" : "❓"}</div>
        <h3 style={{ color: danger?"#f87171":"#e2e8f0", fontSize:15, fontWeight:700, margin:"0 0 8px", textAlign:"center" }}>{title}</h3>
        <p style={{ color:"#ffffff", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>{desc}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onOk} disabled={loading} style={{
            flex:1, padding:"10px", borderRadius:8, fontWeight:700, fontSize:13,
            cursor:loading?"not-allowed":"pointer",
            background:danger?"rgba(248,113,113,0.15)":"rgba(74,222,128,0.15)",
            border:danger?"1px solid rgba(248,113,113,0.4)":"1px solid rgba(74,222,128,0.4)",
            color:danger?"#f87171":"#4ade80",
          }}>
            {loading ? "Proses..." : danger ? "⌫ Hapus" : "✓ Konfirmasi"}
          </button>
          <button onClick={onCancel} style={{
            padding:"10px 20px", borderRadius:8, fontSize:13, cursor:"pointer",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.15)", color:"#ffffff",
          }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th style={styles.thStyle}>{children}</th>;
}

function Td({ children, mono, bold, dim, accent, small, truncate }) {
  return (
    <td style={{
      padding:"8px 12px", color: accent || "#ffffff",
      fontSize: small?10:12, fontWeight: bold?700:400,
      fontFamily: mono?"'IBM Plex Mono',monospace":"inherit",
      whiteSpace:"nowrap", maxWidth: truncate?140:"none",
      overflow: truncate?"hidden":"visible",
      textOverflow: truncate?"ellipsis":"clip",
      borderBottom:"1px solid rgb(255, 255, 255)",
    }}>
      {children}
    </td>
  );
}

function ActionBtn({ children, color, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      background:`${color}15`, border:`1px solid ${color}35`,
      borderRadius:5, color, padding:"3px 8px", fontSize:12,
      cursor:"pointer", fontWeight:700, transition:"all 0.15s",
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=`${color}25`;e.currentTarget.style.borderColor=`${color}60`;}}
      onMouseLeave={e=>{e.currentTarget.style.background=`${color}15`;e.currentTarget.style.borderColor=`${color}35`;}}>
      {children}
    </button>
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
  const map = {
    BONGKAR:["#f87171","rgba(248,113,113,0.12)"],
    AWAS:["#fbbf24","rgba(251,191,36,0.1)"],
    "PERLU PANTAU":["#d4b800","rgba(212,184,0,0.1)"],
    AMAN:["#4ade80","rgba(74,222,128,0.1)"],
  };
  const [c,bg] = map[status] || ["#ffffff","rgba(100,116,139,0.1)"];
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:bg, color:c, border:`1px solid ${c}33` }}>{status||"—"}</span>;
}
function RekapStatusBadge({ status }) {
  const s = (status||"").toUpperCase();
  const map = {
    SELESAI:["#4ade80","rgba(74,222,128,0.1)"],
    BATAL:["#ffffff","rgba(148,163,184,0.08)"],
    REMOVED:["#f87171","rgba(248,113,113,0.08)"],
  };
  const [c,bg] = map[s] || ["#ffffff","rgba(100,116,139,0.1)"];
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:bg, color:c }}>{s||"—"}</span>;
}
function SourceBadge({ src }) {
  const map = {
    system:["#38bdf8","rgba(56,189,248,0.1)"],
    notif:["#f59e0b","rgba(245,158,11,0.1)"],
    manual:["#4ade80","rgba(74,222,128,0.1)"],
    history:["#a78bfa","rgba(167,139,250,0.1)"],
  };
  const [c,bg] = map[src] || ["#ffffff","rgba(100,116,139,0.1)"];
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
      {[...Array(6)].map((_,i)=>(
        <div key={i} style={{ height:36, background:`rgba(56,189,248,${0.02+i*0.005})`, borderRadius:4, marginBottom:4, animation:"pulse 1.5s ease infinite alternate" }} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = {
  root:            { minHeight:"100vh", background:"#000000", fontFamily:"'IBM Plex Sans',sans-serif", color:"#ffffff", position:"relative", overflowX:"hidden" },
  scanlines:       { position:"fixed", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,200,0.012) 2px,rgba(0,255,200,0.012) 4px)", pointerEvents:"none", zIndex:0 },
  header:          { position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 32px", background:"rgba(5,11,24,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(56,189,248,0.12)" },
  headerLeft:      { display:"flex", alignItems:"center", gap:14 },
  logo:            { fontSize:28, color:"#38bdf8", lineHeight:1 },
  logoTitle:       { color:"#38bdf8", fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.15em" },
  logoSub:         { color:"#ffffff", fontSize:10, marginTop:2, letterSpacing:"0.05em" },
  statusDot:       { width:7, height:7, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80", animation:"glow 2s ease infinite alternate" },
  logoutBtn:       { background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:7, color:"#f87171", padding:"6px 14px", fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" },
  tabBar:          { display:"flex", gap:0, padding:"0 32px", borderBottom:"1px solid rgba(56,189,248,0.08)", background:"rgba(5,11,24,0.8)", position:"sticky", top:57, zIndex:90 },
  tabBtn:          { padding:"14px 24px", fontSize:12, fontWeight:600, cursor:"pointer", border:"none", borderBottom:"2px solid", background:"transparent", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.05em", transition:"all 0.2s" },
  content:         { padding:"28px 32px", position:"relative", zIndex:1 },
  toolbar:         { display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" },
  searchInput:     { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:12, outline:"none", width:240, fontFamily:"'IBM Plex Sans',sans-serif" },
  filterSelect:    { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8, color:"#ffffff", padding:"8px 12px", fontSize:12, cursor:"pointer", outline:"none" },
  addBtn:          { background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, color:"#4ade80", padding:"8px 16px", fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"'IBM Plex Mono',monospace" },
  refreshBtn:      { background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#38bdf8", padding:"8px 12px", fontSize:14, cursor:"pointer" },
  tableWrap:       { overflowX:"auto", borderRadius:10, border:"1px solid rgba(56,189,248,0.08)", background:"rgba(5,11,24,0.6)" },
  table:           { width:"100%", borderCollapse:"collapse", fontSize:12 },
  empty:           { padding:"60px 20px", textAlign:"center", color:"#ffffff", fontSize:13 },
  thStyle:         { padding:"10px 12px", textAlign:"left", color:"#ffffff", fontWeight:700, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap", borderBottom:"1px solid rgba(56,189,248,0.1)", fontFamily:"'IBM Plex Mono', monospace", background:"rgba(0,0,0,0.2)" },
  inlineInput:     { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.3)", borderRadius:5, color:"#e2e8f0", padding:"3px 7px", fontSize:11, outline:"none" },
  inlineSelect:    { background:"#000000", border:"1px solid rgba(167,139,250,0.3)", borderRadius:5, color:"#a78bfa", padding:"3px 6px", fontSize:11, outline:"none", cursor:"pointer" },
  saveSmBtn:       { background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.35)", borderRadius:5, color:"#4ade80", padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:700 },
  cancelSmBtn:     { background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:5, color:"#f87171", padding:"3px 8px", fontSize:11, cursor:"pointer" },
  toast:           { position:"fixed", bottom:28, right:28, padding:"12px 20px", borderRadius:10, border:"1px solid", fontSize:13, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", zIndex:9999, backdropFilter:"blur(8px)", animation:"fadeIn 0.2s ease" },
  modalOverlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modalBox:        { background:"#080e1d", border:"1px solid rgba(56,189,248,0.2)", borderRadius:16, padding:"28px 32px", width:600, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 30px 80px rgba(0,0,0,0.7)" },
  formGrid:        { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  formField:       { display:"flex", flexDirection:"column", gap:5 },
  formLabel:       { color:"#ffffff", fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" },
  formInput:       { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none" },
  formSelect:      { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none", cursor:"pointer" },
  confirmOkBtn:    { flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)", color:"#4ade80", fontFamily:"'IBM Plex Mono',monospace" },
  confirmCancelBtn:{ padding:"11px 20px", borderRadius:9, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.12)", color:"#ffffff" },
  bulkBar:         { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", marginBottom:12, borderRadius:9, background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.25)", animation:"bulkSlideIn 0.2s ease" },
  bulkBadge:       { display:"inline-flex", alignItems:"center", justifyContent:"center", minWidth:26, height:22, borderRadius:6, background:"rgba(56,189,248,0.2)", color:"#38bdf8", fontSize:12, fontWeight:800, border:"1px solid rgba(56,189,248,0.4)", fontFamily:"'IBM Plex Mono',monospace", padding:"0 6px" },
  bulkClearBtn:    { background:"transparent", border:"1px solid rgba(56,189,248,0.25)", borderRadius:6, color:"#38bdf8", padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" },
  bulkDeleteBtn:   { background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.35)", borderRadius:7, color:"#f87171", padding:"7px 16px", fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", transition:"all 0.15s" },
  loginRoot:       { minHeight:"100vh", background:"#000000", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", position:"relative" },
  loginCard:       { background:"rgba(8,14,29,0.95)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:18, padding:"40px 44px", width:360, textAlign:"center", boxShadow:"0 0 60px rgba(56,189,248,0.06)" },
  loginTitle:      { color:"#38bdf8", fontSize:18, fontWeight:700, letterSpacing:"0.2em", fontFamily:"'IBM Plex Mono',monospace", margin:"0 0 4px" },
  loginSub:        { color:"#ffffff", fontSize:11, margin:"0 0 28px", letterSpacing:"0.05em" },
  loginInput:      { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid", borderRadius:9, color:"#e2e8f0", padding:"11px 14px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.1em", textAlign:"center", marginBottom:8 },
  loginErr:        { color:"#f87171", fontSize:12, fontFamily:"'IBM Plex Mono',monospace", margin:"0 0 8px" },
  loginBtn:        { width:"100%", padding:"12px", borderRadius:9, background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.35)", color:"#38bdf8", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.1em" },
};