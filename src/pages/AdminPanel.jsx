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
const ADMIN_PASSWORD  = "brks2026";   // ganti sesuai kebutuhan
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

// ── Tiny API helpers not in api.js ──────────────────────────────────────────────
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
async function deleteRekapDirect(id) {
  // endpoint hapus rekap tidak ada di backend — kita pakai workaround update is_saved=0
  // atau tandai via keterangan; gunakan API yg tersedia
  // Jika perlu tambahkan endpoint DELETE /api/rekap-replacement/{id} di backend
  throw new Error("Endpoint DELETE rekap belum tersedia. Tambahkan di backend terlebih dahulu.");
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [authed,   setAuthed]   = useState(() => sessionStorage.getItem("admin_authed") === "1");
  const [pwInput,  setPwInput]  = useState("");
  const [pwErr,    setPwErr]    = useState(false);
  const [tab,      setTab]      = useState("cashplan"); // "cashplan" | "rekap"
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
      {/* ── Scanline overlay ── */}
      <div style={styles.scanlines} />

      {/* ── Header ── */}
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

      {/* ── Tab Bar ── */}
      <div style={styles.tabBar}>
        {[
          { key:"cashplan", label:"◈ Cash Plan (PENDING)", accent:"#38bdf8" },
          { key:"rekap",    label:"◎ Rekap Replacement",   accent:"#a78bfa" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...styles.tabBtn,
            borderBottomColor: tab === t.key ? t.accent : "transparent",
            color:             tab === t.key ? t.accent : "#475569",
            background:        tab === t.key ? `${t.accent}10` : "transparent",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={styles.content}>
        {tab === "cashplan" && <CashplanCRUD showToast={showToast} />}
        {tab === "rekap"    && <RekapCRUD    showToast={showToast} />}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "ok" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", borderColor: toast.type === "ok" ? "#4ade80" : "#f87171", color: toast.type === "ok" ? "#4ade80" : "#f87171" }}>
          {toast.type === "ok" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CASHPLAN CRUD
// ══════════════════════════════════════════════════════════════════════════════
function CashplanCRUD({ showToast }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [editRow,  setEditRow]  = useState(null);   // {id, field, value}
  const [showAdd,  setShowAdd]  = useState(false);
  const [addForm,  setAddForm]  = useState({ id_atm:"", lokasi:"-", wilayah:"Pekanbaru", tipe:"EMV", saldo:0, limit:0, status:"AWAS", added_by:"manual", denom_options:"100000" });
  const [confirm,  setConfirm]  = useState(null);   // {type, item}
  const [busy,     setBusy]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
    return items.filter(r => r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q) || r.wilayah?.toLowerCase().includes(q));
  }, [items, search]);

  // ── Inline edit save ────────────────────────────────────────────────────────
  const saveInlineKet = async (item, ket) => {
    setBusy(true);
    try {
      await patchCashplan(item.id, { status: item.status_cashplan || "PENDING", keterangan: ket });
      setItems(p => p.map(x => x.id === item.id ? { ...x, keterangan: ket } : x));
      showToast("Keterangan diperbarui");
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); setEditRow(null); }
  };

  // ── Status update ───────────────────────────────────────────────────────────
  const doStatusUpdate = async (item, newStatus) => {
    setBusy(true);
    try {
      if (newStatus === "DELETE") {
        await removeCashplanAPI(item.id);
        setItems(p => p.filter(x => x.id !== item.id));
        showToast(`ATM ${item.id_atm} dihapus dari antrian`);
      } else {
        await patchCashplan(item.id, { status: newStatus, keterangan: item.keterangan || "" });
        setItems(p => p.filter(x => x.id !== item.id));
        showToast(`ATM ${item.id_atm} → ${newStatus}`);
      }
    } catch(e) { showToast(e.message, "err"); }
    finally { setBusy(false); setConfirm(null); }
  };

  // ── Add new ─────────────────────────────────────────────────────────────────
  const doAdd = async () => {
    if (!addForm.id_atm.trim()) return showToast("ID ATM wajib diisi", "err");
    setBusy(true);
    try {
      const jumlah = Math.max(0, Number(addForm.limit) - Number(addForm.saldo));
      await postCashplan({ ...addForm, id_atm: addForm.id_atm.toUpperCase(), jumlah_isi: jumlah, pct_saldo: addForm.limit > 0 ? (addForm.saldo / addForm.limit) * 100 : 0 });
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
      <div style={styles.toolbar}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="⌕  Cari ID ATM / Lokasi..." style={styles.searchInput} />
        <span style={{ color:"#475569", fontSize:12, fontFamily:"monospace" }}>{filtered.length} rows</span>
        <button onClick={() => setShowAdd(true)} style={styles.addBtn}>+ Tambah Baru</button>
        <button onClick={load} style={styles.refreshBtn} disabled={loading}>↺</button>
      </div>

      {loading ? <TableSkeleton /> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["ID","Tgl Masuk","ID ATM","Lokasi","Wilayah","Tipe","Saldo","Limit","% Saldo","Denom","Jumlah Isi","Status Awal","Keterangan","Sumber","Aksi"].map(h => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={15} style={styles.empty}>Tidak ada data PENDING</td></tr>
              ) : filtered.map((item, i) => (
                <tr key={item.id} style={{ background: i%2===0?"transparent":"rgba(255,255,255,0.012)", transition:"background 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.05)"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,0.012)"}>
                  <Td mono dim>{item.id}</Td>
                  <Td dim small>{item.added_at ? new Date(item.added_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}) : "—"}</Td>
                  <Td mono bold accent="#38bdf8">{item.id_atm}</Td>
                  <Td dim small truncate>{item.lokasi || "—"}</Td>
                  <Td dim>{item.wilayah || "—"}</Td>
                  <Td>
                    <TypeBadge tipe={item.tipe} />
                  </Td>
                  <Td>{fmtRp(item.saldo)}</Td>
                  <Td dim>{fmtRp(item.limit)}</Td>
                  <Td>
                    <PctBadge pct={item.pct_saldo} />
                  </Td>
                  <Td dim small>{item.denom_options || "100000"}</Td>
                  <Td accent="#f59e0b">{fmtRp(item.jumlah_isi)}</Td>
                  <Td>
                    <StatusBadge status={item.status_awal || item.status} />
                  </Td>
                  {/* Inline edit keterangan */}
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
                  <Td small>
                    <SourceBadge src={item.added_by} />
                  </Td>
                  {/* Aksi */}
                  <Td>
                    <div style={{ display:"flex", gap:4 }}>
                      <ActionBtn color="#4ade80" onClick={() => setConfirm({ type:"DONE",   item })} title="Selesai">✔</ActionBtn>
                      <ActionBtn color="#f87171" onClick={() => setConfirm({ type:"REMOVED", item })} title="Batal">✕</ActionBtn>
                      <ActionBtn color="#ff3b5c" onClick={() => setConfirm({ type:"DELETE",  item })} title="Hapus dari DB">⌫</ActionBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirm && (
        <ConfirmModal
          title={
            confirm.type === "DELETE"  ? `Hapus ATM ${confirm.item.id_atm} dari antrian?` :
            confirm.type === "DONE"    ? `Tandai ATM ${confirm.item.id_atm} sebagai SELESAI?` :
                                         `Tandai ATM ${confirm.item.id_atm} sebagai BATAL?`
          }
          desc={
            confirm.type === "DELETE"  ? "Data tidak akan masuk Rekap Replacement. Aksi ini tidak bisa dibatalkan." :
            confirm.type === "DONE"    ? "ATM akan pindah ke Rekap Replacement dengan status SELESAI." :
                                         "ATM akan pindah ke Rekap Replacement dengan status BATAL."
          }
          danger={confirm.type === "DELETE"}
          onOk={() => doStatusUpdate(confirm.item, confirm.type)}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal title="+ Tambah ATM ke Cash Plan" onClose={() => setShowAdd(false)}>
          <div style={styles.formGrid}>
            {[
              { label:"ID ATM *",    key:"id_atm",    type:"text",   mono:true },
              { label:"Lokasi",      key:"lokasi",    type:"text"               },
              { label:"Saldo (Rp)",  key:"saldo",     type:"number"             },
              { label:"Limit (Rp)",  key:"limit",     type:"number"             },
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
                <option value="50000,100000">50.000 & 100.000</option>
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
function RekapCRUD({ showToast }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterBulan,setFilterBulan]= useState(nowBulan());
  const [filterWil,  setFilterWil]  = useState("Semua");
  const [search,     setSearch]     = useState("");
  const [editRow,    setEditRow]    = useState(null); // {id, fields}
  const [confirm,    setConfirm]    = useState(null);
  const [busy,       setBusy]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
    return items.filter(r => r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q));
  }, [items, search]);

  // ── Buka edit ───────────────────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditRow({
      id:          item.id,
      tgl_isi:     item.tgl_isi     || "",
      jam_cash_in: item.jam_cash_in || "",
      jam_cash_out:item.jam_cash_out|| "",
      denom:       item.denom       || 100_000,
      keterangan:  item.keterangan  || "",
    });
  };

  // ── Simpan edit ─────────────────────────────────────────────────────────────
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
      setItems(p => p.map(x => x.id === editRow.id
        ? { ...x, ...editRow, is_saved:true }
        : x
      ));
      showToast("Rekap diperbarui");
      setEditRow(null);
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); }
  };

  // ── Unlock (reset is_saved) ─────────────────────────────────────────────────
  const doUnlock = async (item) => {
    setBusy(true);
    try {
      // Patch ulang dengan data yang sama — is_saved akan false karena kita re-save
      await updateRekapAPI(item.id, {
        tgl_isi:      item.tgl_isi      || null,
        jam_cash_in:  item.jam_cash_in  || null,
        jam_cash_out: item.jam_cash_out || null,
        denom:        item.denom        || 100_000,
      });
      // Workaround: set is_saved=false di local state; backend akan set is_saved=1 ulang
      // Untuk unlock sungguhan tambahkan endpoint PATCH /rekap/{id}/unlock di backend
      setItems(p => p.map(x => x.id === item.id ? { ...x, is_saved: false } : x));
      showToast(`Rekap #${item.id} (${item.id_atm}) dibuka untuk edit`);
      setConfirm(null);
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="⌕  Cari ID ATM..." style={styles.searchInput} />
        <select value={filterBulan} onChange={e=>setFilterBulan(e.target.value)} style={styles.filterSelect}>
          {BULAN_ID.map(b=><option key={b} value={b}>{b} {nowTahun()}</option>)}
        </select>
        <select value={filterWil} onChange={e=>setFilterWil(e.target.value)} style={styles.filterSelect}>
          {WILAYAH_LIST.map(w=><option key={w} value={w}>{w}</option>)}
        </select>
        <span style={{ color:"#475569", fontSize:12, fontFamily:"monospace" }}>{filtered.length} rows</span>
        <button onClick={load} style={styles.refreshBtn} disabled={loading}>↺</button>
      </div>

      {loading ? <TableSkeleton /> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["ID","Done At","Bulan","ID ATM","Lokasi","Wilayah","Tipe","Saldo Akhir","Jumlah Isi","Denom","Lembar","Tgl Isi","Cash In","Cash Out","Status","Keterangan","Saved","Aksi"].map(h=>(
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={18} style={styles.empty}>Tidak ada data rekap bulan {filterBulan}</td></tr>
              ) : filtered.map((item, i) => {
                const isEditing = editRow?.id === item.id;
                const ed = editRow || {};
                const denomOpts = getDenomOpts(item);
                return (
                  <tr key={item.id} style={{ background: item.is_saved?"rgba(74,222,128,0.025)":i%2===0?"transparent":"rgba(255,255,255,0.012)", transition:"background 0.1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(167,139,250,0.05)"}
                    onMouseLeave={e=>e.currentTarget.style.background=item.is_saved?"rgba(74,222,128,0.025)":i%2===0?"transparent":"rgba(255,255,255,0.012)"}>
                    <Td mono dim>{item.id}</Td>
                    <Td dim small>{item.done_at ? new Date(item.done_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}) : "—"}</Td>
                    <Td dim small>{item.bulan||filterBulan}</Td>
                    <Td mono bold accent="#a78bfa">{item.id_atm}</Td>
                    <Td dim small truncate>{item.lokasi||"—"}</Td>
                    <Td dim>{item.wilayah||"—"}</Td>
                    <Td><TypeBadge tipe={item.tipe} /></Td>
                    <Td>{fmtRp(item.saldo_awal)}</Td>
                    <Td accent="#f59e0b">{fmtRp(item.jumlah_isi)}</Td>

                    {/* Denom — editable */}
                    <Td>
                      {isEditing ? (
                        <select value={ed.denom} onChange={e=>setEditRow(r=>({...r,denom:Number(e.target.value)}))} style={styles.inlineSelect}>
                          {denomOpts.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      ) : <span style={{ color:"#94a3b8", fontSize:11 }}>{fmtRp(item.denom)}</span>}
                    </Td>
                    <Td>{item.lembar ? `${item.lembar} lbr` : "—"}</Td>

                    {/* Tgl Isi — editable */}
                    <Td>
                      {isEditing ? (
                        <input type="date" value={ed.tgl_isi} onChange={e=>setEditRow(r=>({...r,tgl_isi:e.target.value}))} style={styles.inlineInput} />
                      ) : <span style={{ color: item.tgl_isi?"#e2e8f0":"#374151", fontSize:11 }}>{item.tgl_isi || "—"}</span>}
                    </Td>

                    {/* Cash In — editable */}
                    <Td>
                      {isEditing ? (
                        <input type="time" value={ed.jam_cash_in} onChange={e=>setEditRow(r=>({...r,jam_cash_in:e.target.value}))} style={{...styles.inlineInput, width:80}} />
                      ) : <span style={{ color: item.jam_cash_in?"#60a5fa":"#374151", fontSize:11, fontFamily:"monospace" }}>{item.jam_cash_in || "—"}</span>}
                    </Td>

                    {/* Cash Out — editable */}
                    <Td>
                      {isEditing ? (
                        <input type="time" value={ed.jam_cash_out} onChange={e=>setEditRow(r=>({...r,jam_cash_out:e.target.value}))} style={{...styles.inlineInput, width:80}} />
                      ) : <span style={{ color: item.jam_cash_out?"#60a5fa":"#374151", fontSize:11, fontFamily:"monospace" }}>{item.jam_cash_out || "—"}</span>}
                    </Td>

                    <Td>
                      <RekapStatusBadge status={item.status_done} />
                    </Td>
                    <Td dim small truncate>{item.keterangan || "—"}</Td>
                    <Td>
                      {item.is_saved
                        ? <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(74,222,128,0.1)", color:"#4ade80", border:"1px solid rgba(74,222,128,0.25)" }}>✓ SAVED</span>
                        : <span style={{ fontSize:10, color:"#475569" }}>—</span>
                      }
                    </Td>

                    {/* Aksi */}
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

      {/* Confirm unlock */}
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
//  SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function LoginGate({ pw, setPw, err, onLogin }) {
  return (
    <div style={styles.loginRoot}>
      <div style={styles.scanlines} />
      <div style={{ ...styles.loginCard, animation: err ? "shake 0.3s ease" : "none" }}>
        <div style={styles.loginLogo}>⬡</div>
        <h1 style={styles.loginTitle}>ADMIN ACCESS</h1>
        <p style={styles.loginSub}>BRK Syariah · ATM Monitoring</p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onLogin()}
          placeholder="Password"
          autoFocus
          style={{ ...styles.loginInput, borderColor: err ? "#f87171" : "rgba(56,189,248,0.25)" }}
        />
        {err && <p style={styles.loginErr}>⊗ Password salah</p>}
        <button onClick={onLogin} style={styles.loginBtn}>Masuk →</button>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#38bdf8", fontSize:16, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono', monospace" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#475569", fontSize:20, cursor:"pointer" }}>×</button>
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
        <p style={{ color:"#64748b", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>{desc}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onOk} disabled={loading}
            style={{ flex:1, padding:"10px", borderRadius:8, fontWeight:700, fontSize:13, cursor:loading?"not-allowed":"pointer", background:danger?"rgba(248,113,113,0.15)":"rgba(74,222,128,0.15)", border:danger?"1px solid rgba(248,113,113,0.4)":"1px solid rgba(74,222,128,0.4)", color:danger?"#f87171":"#4ade80" }}>
            {loading ? "Proses..." : danger ? "⌫ Hapus" : "✓ Konfirmasi"}
          </button>
          <button onClick={onCancel}
            style={{ padding:"10px 20px", borderRadius:8, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.15)", color:"#64748b" }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{ padding:"10px 12px", textAlign:"left", color:"#334155", fontWeight:700, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap", borderBottom:"1px solid rgba(56,189,248,0.1)", fontFamily:"'IBM Plex Mono', monospace", background:"rgba(0,0,0,0.2)" }}>
      {children}
    </th>
  );
}

function Td({ children, mono, bold, dim, accent, small, truncate }) {
  return (
    <td style={{ padding:"8px 12px", color: accent || (dim?"#475569":"#94a3b8"), fontSize: small?10:12, fontWeight: bold?700:400, fontFamily: mono?"'IBM Plex Mono',monospace":"inherit", whiteSpace:"nowrap", maxWidth: truncate?140:"none", overflow: truncate?"hidden":"visible", textOverflow: truncate?"ellipsis":"clip", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
      {children}
    </td>
  );
}

function ActionBtn({ children, color, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{ background:`${color}15`, border:`1px solid ${color}35`, borderRadius:5, color, padding:"3px 8px", fontSize:12, cursor:"pointer", fontWeight:700, transition:"all 0.15s" }}
      onMouseEnter={e=>{e.currentTarget.style.background=`${color}25`;e.currentTarget.style.borderColor=`${color}60`;}}
      onMouseLeave={e=>{e.currentTarget.style.background=`${color}15`;e.currentTarget.style.borderColor=`${color}35`;}}>
      {children}
    </button>
  );
}

function TypeBadge({ tipe }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:tipe==="CRM"?"rgba(167,139,250,0.15)":"rgba(56,189,248,0.12)", color:tipe==="CRM"?"#a78bfa":"#38bdf8", border:`1px solid ${tipe==="CRM"?"rgba(167,139,250,0.3)":"rgba(56,189,248,0.25)"}` }}>{tipe||"—"}</span>;
}
function StatusBadge({ status }) {
  const map = { BONGKAR:["#f87171","rgba(248,113,113,0.12)"], AWAS:["#fbbf24","rgba(251,191,36,0.1)"], "PERLU PANTAU":["#d4b800","rgba(212,184,0,0.1)"], AMAN:["#4ade80","rgba(74,222,128,0.1)"] };
  const [c,bg] = map[status] || ["#64748b","rgba(100,116,139,0.1)"];
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:bg, color:c, border:`1px solid ${c}33` }}>{status||"—"}</span>;
}
function RekapStatusBadge({ status }) {
  const s = (status||"").toUpperCase();
  const map = { SELESAI:["#4ade80","rgba(74,222,128,0.1)"], BATAL:["#94a3b8","rgba(148,163,184,0.08)"], REMOVED:["#f87171","rgba(248,113,113,0.08)"] };
  const [c,bg] = map[s] || ["#64748b","rgba(100,116,139,0.1)"];
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:bg, color:c }}>{s||"—"}</span>;
}
function SourceBadge({ src }) {
  const map = { system:["#38bdf8","rgba(56,189,248,0.1)"], notif:["#f59e0b","rgba(245,158,11,0.1)"], manual:["#4ade80","rgba(74,222,128,0.1)"], history:["#a78bfa","rgba(167,139,250,0.1)"] };
  const [c,bg] = map[src] || ["#64748b","rgba(100,116,139,0.1)"];
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
      <style>{`@keyframes pulse{from{opacity:0.4}to{opacity:0.8}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = {
  root:         { minHeight:"100vh", background:"#050b18", fontFamily:"'IBM Plex Sans',sans-serif", color:"#94a3b8", position:"relative", overflowX:"hidden" },
  scanlines:    { position:"fixed", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,200,0.012) 2px,rgba(0,255,200,0.012) 4px)", pointerEvents:"none", zIndex:0 },
  header:       { position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 32px", background:"rgba(5,11,24,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(56,189,248,0.12)" },
  headerLeft:   { display:"flex", alignItems:"center", gap:14 },
  logo:         { fontSize:28, color:"#38bdf8", lineHeight:1 },
  logoTitle:    { color:"#38bdf8", fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.15em" },
  logoSub:      { color:"#334155", fontSize:10, marginTop:2, letterSpacing:"0.05em" },
  statusDot:    { width:7, height:7, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80", animation:"glow 2s ease infinite alternate" },
  logoutBtn:    { background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:7, color:"#f87171", padding:"6px 14px", fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" },
  tabBar:       { display:"flex", gap:0, padding:"0 32px", borderBottom:"1px solid rgba(56,189,248,0.08)", background:"rgba(5,11,24,0.8)", position:"sticky", top:57, zIndex:90 },
  tabBtn:       { padding:"14px 24px", fontSize:12, fontWeight:600, cursor:"pointer", border:"none", borderBottom:"2px solid", background:"transparent", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.05em", transition:"all 0.2s" },
  content:      { padding:"28px 32px", position:"relative", zIndex:1 },
  toolbar:      { display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" },
  searchInput:  { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:12, outline:"none", width:240, fontFamily:"'IBM Plex Sans',sans-serif" },
  filterSelect: { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8, color:"#94a3b8", padding:"8px 12px", fontSize:12, cursor:"pointer", outline:"none" },
  addBtn:       { background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, color:"#4ade80", padding:"8px 16px", fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"'IBM Plex Mono',monospace" },
  refreshBtn:   { background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#38bdf8", padding:"8px 12px", fontSize:14, cursor:"pointer" },
  tableWrap:    { overflowX:"auto", borderRadius:10, border:"1px solid rgba(56,189,248,0.08)", background:"rgba(5,11,24,0.6)" },
  table:        { width:"100%", borderCollapse:"collapse", fontSize:12 },
  empty:        { padding:"60px 20px", textAlign:"center", color:"#334155", fontSize:13 },
  inlineInput:  { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.3)", borderRadius:5, color:"#e2e8f0", padding:"3px 7px", fontSize:11, outline:"none" },
  inlineSelect: { background:"#0a0f1e", border:"1px solid rgba(167,139,250,0.3)", borderRadius:5, color:"#a78bfa", padding:"3px 6px", fontSize:11, outline:"none", cursor:"pointer" },
  saveSmBtn:    { background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.35)", borderRadius:5, color:"#4ade80", padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:700 },
  cancelSmBtn:  { background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:5, color:"#f87171", padding:"3px 8px", fontSize:11, cursor:"pointer" },
  toast:        { position:"fixed", bottom:28, right:28, padding:"12px 20px", borderRadius:10, border:"1px solid", fontSize:13, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", zIndex:9999, backdropFilter:"blur(8px)", animation:"fadeIn 0.2s ease" },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modalBox:     { background:"#080e1d", border:"1px solid rgba(56,189,248,0.2)", borderRadius:16, padding:"28px 32px", width:600, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 30px 80px rgba(0,0,0,0.7)" },
  formGrid:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  formField:    { display:"flex", flexDirection:"column", gap:5 },
  formLabel:    { color:"#475569", fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" },
  formInput:    { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none" },
  formSelect:   { background:"#0a0f1e", border:"1px solid rgba(56,189,248,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none", cursor:"pointer" },
  confirmOkBtn: { flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)", color:"#4ade80", fontFamily:"'IBM Plex Mono',monospace" },
  confirmCancelBtn:{ padding:"11px 20px", borderRadius:9, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.12)", color:"#64748b" },
  // Login
  loginRoot:    { minHeight:"100vh", background:"#050b18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", position:"relative" },
  loginCard:    { background:"rgba(8,14,29,0.95)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:18, padding:"40px 44px", width:360, textAlign:"center", boxShadow:"0 0 60px rgba(56,189,248,0.06)" },
  loginLogo:    { fontSize:48, color:"#38bdf8", marginBottom:12, textShadow:"0 0 30px rgba(56,189,248,0.5)" },
  loginTitle:   { color:"#38bdf8", fontSize:18, fontWeight:700, letterSpacing:"0.2em", fontFamily:"'IBM Plex Mono',monospace", margin:"0 0 4px" },
  loginSub:     { color:"#334155", fontSize:11, margin:"0 0 28px", letterSpacing:"0.05em" },
  loginInput:   { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid", borderRadius:9, color:"#e2e8f0", padding:"11px 14px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.1em", textAlign:"center", marginBottom:8 },
  loginErr:     { color:"#f87171", fontSize:12, fontFamily:"'IBM Plex Mono',monospace", margin:"0 0 8px" },
  loginBtn:     { width:"100%", padding:"12px", borderRadius:9, background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.35)", color:"#38bdf8", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.1em" },
};