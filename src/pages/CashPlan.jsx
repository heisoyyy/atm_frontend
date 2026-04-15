// src/pages/CashPlan.jsx
// npm install xlsx

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "../utils/api";
import { addCashplanAPI, getCashplanAPI, updateCashplanStatusAPI, removeCashplanAPI } from "../utils/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DENOM_OPTIONS = [{ label: "Rp 50.000", value: 50_000 }, { label: "Rp 100.000", value: 100_000 }];
const WILAYAH_LIST  = ["Semua", "PEKANBARU", "BATAM", "DUMAI", "Tanjung Pinang"];
const STATUS_FILTER = ["Semua", "BONGKAR", "AWAS"];
const KET_OPTIONS   = ["Mesin Rusak", "Kas Banyak", "Lokasi Tutup", "Keluhan Jaringan"];
const SAVE_PATH     = "D:\\Bank Riau Kepri 2";
const BULAN_ID      = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const nowBulan      = () => BULAN_ID[new Date().getMonth()];
const nowTahun      = () => new Date().getFullYear();
const fmtRp         = v => v == null || isNaN(v) ? "—" : "Rp " + Number(v).toLocaleString("id-ID");
const fmtLembar     = (total, denom) => !total || !denom ? "—" : Math.ceil(total / denom).toLocaleString("id-ID") + " lembar";
const jumlahIsi     = (saldo, limit) => Math.max(0, limit - saldo);

const PROSES_STYLE  = { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" };
const SELESAI_STYLE = { color: "#00e5a0", bg: "rgba(0,229,160,0.12)",   border: "rgba(0,229,160,0.3)" };
const BATAL_STYLE   = { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)" };
const PENDING_STYLE = { color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.25)" };

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const NOTIF_SEEN_KEY      = "cashplan_notif_seen_ids";
const NOTIF_DISMISSED_KEY = "cashplan_notif_dismissed_ids";
const getSeenIds      = () => { try { return new Set(JSON.parse(localStorage.getItem(NOTIF_SEEN_KEY) || "[]")); } catch { return new Set(); } };
const getDismissedIds = () => { try { return new Set(JSON.parse(localStorage.getItem(NOTIF_DISMISSED_KEY) || "[]")); } catch { return new Set(); } };
const markSeen        = ids => localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify([...ids]));
const markDismissedLS = id  => {
  const s = getDismissedIds(); s.add(id);
  localStorage.setItem(NOTIF_DISMISSED_KEY, JSON.stringify([...s]));
};

// ─── EXPORT EXCEL ─────────────────────────────────────────────────────────────
function exportExcel(data, wilayah, bulan, tahun, getDenomFn, getKetFn) {
  const rows = wilayah === "Semua"
    ? data
    : data.filter(d => d.wilayah?.toUpperCase() === wilayah.toUpperCase());

  const sheetData = rows.map((d, i) => {
    const denom    = getDenomFn(d.id_atm);
    const totalIsi = jumlahIsi(d.saldo, d.limit);
    return {
      "No":             i + 1,
      "Tgl Masuk":      d.added_at ? new Date(d.added_at).toLocaleString("id-ID", { dateStyle:"short", timeStyle:"short" }) : "-",
      "Bulan":          bulan,
      "Tahun":          tahun,
      "ID ATM":         d.id_atm || "-",
      "Lokasi":         d.lokasi || "-",
      "Wilayah":        d.wilayah || "-",
      "Tipe":           d.tipe || "-",
      "Denominasi":     `Rp ${Number(denom).toLocaleString("id-ID")}`,
      "Saldo Terakhir": d.saldo || 0,
      "Total Isi":      totalIsi,
      "Lembar":         totalIsi > 0 ? Math.ceil(totalIsi / denom) : 0,
      "Status":         d._in_db ? (d.status_done || "PROSES") : "BELUM KONFIRMASI",
      "Keterangan":     getKetFn(d.id_atm) || "-",
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws["!cols"] = [
    {wch:5},{wch:18},{wch:12},{wch:8},{wch:14},
    {wch:30},{wch:16},{wch:8},{wch:14},{wch:16},
    {wch:14},{wch:10},{wch:18},{wch:22},
  ];
  XLSX.utils.book_append_sheet(wb, ws, `CashPlan_${wilayah === "Semua" ? "Semua" : wilayah}`);
  const now   = new Date();
  const tglDl = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const fn    = `CashPlan_${wilayah === "Semua" ? "Semua_Wilayah" : wilayah}_${bulan}_${tahun}_dl${tglDl}.xlsx`;
  XLSX.writeFile(wb, fn);
  alert(`✅ File Excel berhasil didownload!\n\nNama file: ${fn}\n\n⚠️ Pindahkan manual ke:\n${SAVE_PATH}`);
}

// ═════════════════════════════════════════════════════════════════════════════
export default function CashPlan({ navigateTo }) {
  const [predData,      setPredData]      = useState([]);
  const [cashplanData,  setCashplanData]  = useState([]);
  const [removedAtmIds, setRemovedAtmIds] = useState(new Set());
  const [loading,       setLoading]       = useState(true);
  const [genAt,         setGenAt]         = useState(null);

  // Filter
  const [filterWilayah, setFilterWilayah] = useState("Semua");
  const [filterStatus,  setFilterStatus]  = useState("Semua");
  const [filterBulan,   setFilterBulan]   = useState(nowBulan());
  const [filterTipe,    setFilterTipe]    = useState("Semua");
  const [search,        setSearch]        = useState("");
  const [showDlModal,   setShowDlModal]   = useState(false);
  const [denomGlobal,   setDenomGlobal]   = useState(100_000);

  // Per-row overrides
  const [overrides, setOverrides] = useState({});
  const setOverride = (id, field, val) =>
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  const getDenom = id => overrides[id]?.denom ?? denomGlobal;
  const getKet   = id => overrides[id]?.keterangan ?? "";

  // Table
  const [sort,      setSort]      = useState({ key: "skor_urgensi", dir: -1 });
  const [page,      setPage]      = useState(0);
  const PAGE_SIZE = 15;
  const [selectedRows, setSelectedRows] = useState([]);

  // Tambah Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [addIdInput,   setAddIdInput]   = useState("");
  const [addLoading,   setAddLoading]   = useState(false);
  const [addError,     setAddError]     = useState("");

  // Notifikasi
  const [notifications,  setNotifications]  = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [seenIds,        setSeenIds]        = useState(getSeenIds);
  const [dismissedIds,   setDismissedIds]   = useState(getDismissedIds);
  const notifRef = useRef(null);

  // Validasi Bulk Modal
  const [validasiList,      setValidasiList]      = useState([]);
  const [showValidasiModal, setShowValidasiModal] = useState(false);
  const [validasiLoading,   setValidasiLoading]   = useState(false);
  const [validasiOverrides, setValidasiOverrides] = useState({});
  const setVOverride = (id, field, val) =>
    setValidasiOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  const getVDenom = id => validasiOverrides[id]?.denom ?? denomGlobal;
  const getVKet   = id => validasiOverrides[id]?.ket   ?? "";

  // ─── FETCH ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const predResp = await apiFetch("/api/predictions?limit=500");
      const filtered = (predResp.data || []).filter(d => d.status === "BONGKAR" || d.status === "AWAS");
      setPredData(filtered);
      setGenAt(predResp.generated_at || null);

      const [cpPending, cpDone, cpRemoved] = await Promise.all([
        getCashplanAPI("PENDING"),
        getCashplanAPI("DONE"),
        getCashplanAPI("REMOVED"),
      ]);
      const murniRemovedIds = new Set(
        (cpRemoved.data || []).filter(d => d.status_done === "REMOVED").map(d => d.id_atm)
      );
      setRemovedAtmIds(murniRemovedIds);

      const allCp = [
        ...(cpPending.data || []),
        ...(cpDone.data || []).map(d => ({ ...d, status_done: d.status_done || "SELESAI" })),
        ...(cpRemoved.data || []).filter(d => d.status_done === "BATAL").map(d => ({ ...d, status_done: "BATAL" })),
      ];
      setCashplanData(allCp);

      const cpAtmIds  = new Set(allCp.map(c => c.id_atm));
      const newNotifs = filtered.filter(p => !cpAtmIds.has(p.id_atm) && !murniRemovedIds.has(p.id_atm));
      setNotifications(newNotifs);

      const seen      = getSeenIds();
      const dismissed = getDismissedIds();
      setUnreadCount(newNotifs.filter(n => !seen.has(n.id_atm) && !dismissed.has(n.id_atm)).length);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─── NOTIF ─────────────────────────────────────────────────────────────────
  const handleOpenNotif = () => {
    setShowNotifPanel(p => !p);
    const newSeen = new Set([...seenIds, ...notifications.map(n => n.id_atm)]);
    setSeenIds(newSeen); markSeen(newSeen); setUnreadCount(0);
  };
  const handleDismissNotif = (id_atm, e) => {
    e.stopPropagation();
    markDismissedLS(id_atm);
    setDismissedIds(prev => new Set([...prev, id_atm]));
    setNotifications(prev => prev.filter(n => n.id_atm !== id_atm));
  };

  // ─── BUKA VALIDASI MODAL (1 atau banyak ATM) ───────────────────────────────
  const openValidasiModal = (atmList) => {
    setValidasiList(atmList);
    const init = {};
    atmList.forEach(a => { init[a.id_atm] = { denom: denomGlobal, ket: "" }; });
    setValidasiOverrides(init);
    setShowValidasiModal(true);
    setShowNotifPanel(false);
  };

  // ─── KONFIRMASI BULK ───────────────────────────────────────────────────────
  const handleKonfirmasiBulk = async () => {
    if (!validasiList.length) return;
    setValidasiLoading(true);
    const errors = [];
    try {
      await Promise.all(
        validasiList.map(async atm => {
          try {
            await addCashplanAPI({
              id_atm: atm.id_atm, lokasi: atm.lokasi, wilayah: atm.wilayah,
              tipe: atm.tipe, saldo: atm.saldo, limit: atm.limit,
              pct_saldo: atm.pct_saldo, status: atm.status,
              tgl_isi: atm.tgl_isi, jam_isi: atm.jam_isi,
              est_jam: atm.est_jam, skor_urgensi: atm.skor_urgensi,
              denom: getVDenom(atm.id_atm),
              keterangan: getVKet(atm.id_atm),
              added_by: "konfirmasi",
            });
            markDismissedLS(atm.id_atm);
            setDismissedIds(prev => new Set([...prev, atm.id_atm]));
          } catch (e) {
            errors.push(`${atm.id_atm}: ${e.message}`);
          }
        })
      );
      setShowValidasiModal(false);
      setValidasiList([]);
      setSelectedRows([]);
      if (errors.length) alert(`⚠️ Beberapa ATM gagal:\n\n${errors.join("\n")}`);
      else alert(`✅ ${validasiList.length} ATM berhasil dikonfirmasi ke Cash Plan!`);
      await fetchData();
    } catch (e) {
      alert("Gagal konfirmasi: " + e.message);
    } finally {
      setValidasiLoading(false);
    }
  };

  // ─── DATA MERGE ────────────────────────────────────────────────────────────
  const allData = useMemo(() => {
    const map = {};
    for (const p of predData) {
      if (removedAtmIds.has(p.id_atm)) continue;
      map[p.id_atm] = { ...p, _in_db: false };
    }
    for (const c of cashplanData) {
      map[c.id_atm] = { ...map[c.id_atm], ...c, _in_db: true, _cp_id: c.id, status: c.status_awal, pct_saldo: c.pct_saldo };
    }
    return Object.values(map);
  }, [predData, cashplanData, removedAtmIds]);

  // ─── FILTER + SORT ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = allData;
    if (filterWilayah !== "Semua") d = d.filter(r => r.wilayah?.toUpperCase() === filterWilayah.toUpperCase());
    if (filterStatus  !== "Semua") d = d.filter(r => (r.status || r.status_awal) === filterStatus);
    if (filterTipe    !== "Semua") d = d.filter(r => r.tipe === filterTipe);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r => r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q) || r.wilayah?.toLowerCase().includes(q));
    }
    return [...d].sort((a, b) => {
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [allData, filterWilayah, filterStatus, filterTipe, search, sort]);

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE);
  const toggleSort = key => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(0); };

  // ─── CHECKBOX ──────────────────────────────────────────────────────────────
  const toggleSelect    = id  => setSelectedRows(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSelectAll = () => {
    const ids = paged.map(d => d.id_atm);
    const all = ids.every(id => selectedRows.includes(id));
    if (all) setSelectedRows(p => p.filter(id => !ids.includes(id)));
    else     setSelectedRows(p => [...new Set([...p, ...ids])]);
  };
  const isAllPage  = paged.length > 0 && paged.every(d => selectedRows.includes(d.id_atm));
  const isSomePage = paged.some(d => selectedRows.includes(d.id_atm));

  const selectedUnconfirmed = useMemo(
    () => allData.filter(d => selectedRows.includes(d.id_atm) && !d._in_db),
    [allData, selectedRows]
  );

  // ─── UPDATE STATUS ─────────────────────────────────────────────────────────
// GANTI fungsi handleUpdateStatus yang lama dengan ini:
const handleUpdateStatus = async (atm, newStatus) => {
  if (!window.confirm(`Tandai ATM ${atm.id_atm} sebagai ${newStatus}?`)) return;

  // Jika BATAL → keterangan wajib diisi
  if (newStatus === "BATAL") {
    const ket = getKet(atm.id_atm);
    if (!ket) {
      alert(`⚠️ Keterangan wajib diisi sebelum membatalkan ATM ${atm.id_atm}.\n\nPilih keterangan terlebih dahulu di kolom Keterangan.`);
      return;
    }
  }

  // Jika SELESAI → kosongkan keterangan
  if (newStatus === "SELESAI") {
    setOverride(atm.id_atm, "keterangan", "");
  }

  try {
    await updateCashplanStatusAPI(
      atm._cp_id,
      newStatus,
      newStatus === "SELESAI" ? "" : getKet(atm.id_atm),
      getDenom(atm.id_atm)
    );
    alert(newStatus === "SELESAI"
      ? `✅ ATM ${atm.id_atm} ditandai Selesai.`
      : `🚫 ATM ${atm.id_atm} dibatalkan.`
    );
    await fetchData();
  } catch (e) { alert("Gagal update status: " + e.message); }
};

  // ─── REMOVE ────────────────────────────────────────────────────────────────
  const handleRemove = async (atm) => {
    if (!atm._in_db) {
      if (!window.confirm(`Abaikan ATM ${atm.id_atm} dari daftar?`)) return;
      markDismissedLS(atm.id_atm);
      setDismissedIds(prev => new Set([...prev, atm.id_atm]));
      await fetchData();
      return;
    }
    const pct = atm.pct_saldo ?? 0;
    if (pct <= 25 && atm.status_done !== "SELESAI" && atm.status_done !== "BATAL") {
      alert(`⚠️ ATM ${atm.id_atm} tidak bisa dihapus!\n\nSaldo ${Number(pct).toFixed(1)}% — wajib diisi dulu.`);
      return;
    }
    if (!window.confirm(`Hapus ATM ${atm.id_atm} dari antrian Cash Plan?`)) return;
    try { await removeCashplanAPI(atm._cp_id); await fetchData(); }
    catch (e) { alert("Gagal hapus: " + e.message); }
  };

  // ─── BULK REMOVE ───────────────────────────────────────────────────────────
  const handleBulkRemove = async () => {
    const selected = allData.filter(d => selectedRows.includes(d.id_atm));
    const blocked  = selected.filter(d => d._in_db && (d.pct_saldo ?? 0) <= 25 && d.status_done !== "SELESAI" && d.status_done !== "BATAL");
    if (blocked.length) {
      alert(`⚠️ ${blocked.length} ATM tidak bisa dihapus (saldo ≤ 25%):\n\n${blocked.map(d => `• ${d.id_atm} (${Number(d.pct_saldo??0).toFixed(1)}%)`).join("\n")}`);
      return;
    }
    if (!window.confirm(`Hapus ${selected.length} ATM dari antrian?`)) return;
    try {
      await Promise.all(selected.filter(a => a._in_db && a._cp_id).map(a => removeCashplanAPI(a._cp_id)));
      selected.filter(a => !a._in_db).forEach(a => markDismissedLS(a.id_atm));
      setSelectedRows([]);
      await fetchData();
    } catch (e) { alert("Gagal hapus: " + e.message); }
  };

  // ─── TAMBAH MANUAL ─────────────────────────────────────────────────────────
  const handleAddManual = async () => {
    const id = addIdInput.trim().toUpperCase();
    if (!id) return;
    if (allData.some(d => d.id_atm === id)) { setAddError("ATM ini sudah ada dalam daftar."); return; }
    setAddLoading(true); setAddError("");
    try {
      const res = await apiFetch(`/api/predictions/${id}`);
      if (!res?.id_atm) throw new Error("ATM tidak ditemukan");
      setAddIdInput(""); setShowAddModal(false);
      openValidasiModal([res]);
    } catch (e) {
      setAddError(e.message || "ATM tidak ditemukan di sistem.");
    } finally { setAddLoading(false); }
  };

  // ─── SUMMARY ───────────────────────────────────────────────────────────────
  const totalBongkar     = allData.filter(d => (d.status || d.status_awal) === "BONGKAR").length;
  const totalAwas        = allData.filter(d => (d.status || d.status_awal) === "AWAS").length;
  const totalSelesai     = allData.filter(d => d.status_done === "SELESAI").length;
  const totalNominal     = filtered.reduce((s, d) => s + jumlahIsi(d.saldo, d.limit), 0);
  const totalUnconfirmed = allData.filter(d => !d._in_db).length;
  const doneBatalCount   = allData.filter(d => d.status_done === "SELESAI" || d.status_done === "BATAL").length;
  const activeNotifs     = notifications.filter(n => !dismissedIds.has(n.id_atm));

  if (loading) return <Spinner />;

  return (
    <div style={{ position:"relative" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ color:"#e2e8f0", fontSize:24, fontWeight:700, margin:"0 0 4px", letterSpacing:"-0.02em" }}>
            Cash Plan — Penambahan Saldo ATM
          </h1>
          <p style={{ color:"#64748b", fontSize:13, margin:0 }}>
            {filterBulan} {nowTahun()} · ATM saldo ≤30% ·{" "}
            {genAt ? `Prediksi: ${new Date(genAt).toLocaleString("id-ID")}` : "—"}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} style={selectStyle}>
            {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
          </select>

          {/* 🔔 Bell */}
          <div ref={notifRef} style={{ position:"relative" }}>
            <button onClick={handleOpenNotif} style={{ position:"relative", background:unreadCount>0?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.04)", border:unreadCount>0?"1px solid rgba(245,158,11,0.4)":"1px solid rgba(99,179,237,0.15)", borderRadius:8, color:unreadCount>0?"#f59e0b":"#94a3b8", padding:"8px 14px", fontSize:18, cursor:"pointer", transition:"all 0.2s" }}>
              🔔
              {unreadCount > 0 && (
                <span style={{ position:"absolute", top:-6, right:-6, background:"#ff3b5c", color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #0d1228", animation:"pulse 1.5s infinite" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div style={{ position:"absolute", right:0, top:"calc(100% + 10px)", width:390, maxHeight:500, background:"#0d1228", border:"1px solid rgba(245,158,11,0.25)", borderRadius:14, boxShadow:"0 20px 60px rgba(0,0,0,0.7)", zIndex:500, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(99,179,237,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:8, flexWrap:"wrap" }}>
                  <div>
                    <span style={{ color:"#e2e8f0", fontWeight:700, fontSize:14 }}>🔔 ATM Menunggu Konfirmasi</span>
                    <span style={{ marginLeft:8, fontSize:11, color:"#64748b" }}>{activeNotifs.length} ATM</span>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {activeNotifs.length > 0 && (
                      <button onClick={() => openValidasiModal([...activeNotifs])}
                        style={{ fontSize:11, padding:"4px 10px", borderRadius:6, background:"rgba(0,229,160,0.12)", color:"#00e5a0", border:"1px solid rgba(0,229,160,0.3)", cursor:"pointer", fontWeight:700, whiteSpace:"nowrap" }}>
                        + Konfirmasi Semua ({activeNotifs.length})
                      </button>
                    )}
                    {activeNotifs.length > 0 && (
                      <button onClick={() => { activeNotifs.forEach(n => markDismissedLS(n.id_atm)); setDismissedIds(prev => new Set([...prev,...activeNotifs.map(n=>n.id_atm)])); setNotifications([]); }}
                        style={{ fontSize:11, color:"#64748b", background:"none", border:"none", cursor:"pointer" }}>Abaikan</button>
                    )}
                  </div>
                </div>
                <div style={{ overflowY:"auto", flex:1 }}>
                  {activeNotifs.length === 0 ? (
                    <div style={{ padding:"40px 20px", textAlign:"center", color:"#475569" }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
                      <div style={{ fontSize:13 }}>Tidak ada notifikasi baru</div>
                    </div>
                  ) : activeNotifs.sort((a,b)=>(b.skor_urgensi||0)-(a.skor_urgensi||0)).map(atm => {
                    const isUrgent = atm.status === "BONGKAR";
                    return (
                      <div key={atm.id_atm} style={{ padding:"11px 16px", borderBottom:"1px solid rgba(99,179,237,0.06)", background:isUrgent?"rgba(255,59,92,0.04)":"transparent", cursor:"pointer", transition:"background 0.15s" }}
                        onClick={() => openValidasiModal([atm])}
                        onMouseEnter={e => e.currentTarget.style.background = isUrgent?"rgba(255,59,92,0.08)":"rgba(59,130,246,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = isUrgent?"rgba(255,59,92,0.04)":"transparent"}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                              <span style={{ color:"#e2e8f0", fontWeight:700, fontFamily:"monospace", fontSize:13 }}>{atm.id_atm}</span>
                              <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, fontWeight:700, background:isUrgent?"rgba(255,59,92,0.15)":"rgba(245,158,11,0.15)", color:isUrgent?"#ff3b5c":"#f59e0b", border:`1px solid ${isUrgent?"rgba(255,59,92,0.3)":"rgba(245,158,11,0.3)"}` }}>{atm.status}</span>
                              {!seenIds.has(atm.id_atm) && <span style={{ width:6, height:6, borderRadius:"50%", background:"#f59e0b", flexShrink:0 }} />}
                            </div>
                            <div style={{ color:"#94a3b8", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📍 {atm.lokasi||"—"} · {atm.wilayah||"—"}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                              <SaldoBar pct={atm.pct_saldo} compact />
                              <span style={{ color:"#64748b", fontSize:10 }}>{fmtRp(atm.saldo)} / {fmtRp(atm.limit)}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                            <button onClick={e=>{e.stopPropagation();openValidasiModal([atm]);}}
                              style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:"rgba(0,229,160,0.12)", color:"#00e5a0", border:"1px solid rgba(0,229,160,0.3)", cursor:"pointer", fontWeight:700 }}>+ Konfirmasi</button>
                            <button onClick={e=>handleDismissNotif(atm.id_atm,e)}
                              style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:"transparent", color:"#475569", border:"1px solid rgba(99,179,237,0.1)", cursor:"pointer" }}>Abaikan</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {activeNotifs.length > 0 && (
                  <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(99,179,237,0.08)", background:"rgba(0,0,0,0.2)", flexShrink:0 }}>
                    <div style={{ color:"#64748b", fontSize:11, textAlign:"center" }}>Klik notif atau <strong style={{ color:"#00e5a0" }}>+ Konfirmasi Semua</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => setShowDlModal(true)} style={btnStyle("#a78bfa")}>↓ Download Excel</button>
          <button onClick={() => { setAddError(""); setShowAddModal(true); }} style={btnStyle("#00e5a0")}>+ Tambah Manual</button>
          <button onClick={fetchData} style={btnStyle("#3b82f6")}>↺ Refresh</button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ─────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Total ATM",      value:allData.length,       color:"#60a5fa", icon:"◈" },
          { label:"Blm Konfirmasi", value:totalUnconfirmed,     color:"#60a5fa", icon:"⏳", clickable: totalUnconfirmed > 0 },
          { label:"BONGKAR",        value:totalBongkar,         color:"#ff3b5c", icon:"⚠" },
          { label:"AWAS",           value:totalAwas,            color:"#f59e0b", icon:"⊕" },
          { label:"Selesai",        value:totalSelesai,         color:"#00e5a0", icon:"✓" },
          { label:"Est. Total Isi", value:fmtRp(totalNominal), color:"#a78bfa", icon:"◎", small:true },
        ].map(c => (
          <div key={c.label}
            style={{ background:c.clickable?"rgba(96,165,250,0.07)":"rgba(255,255,255,0.02)", border:`1px solid ${c.clickable?"rgba(96,165,250,0.4)":c.color+"28"}`, borderRadius:10, padding:"12px 14px", textAlign:"center", cursor:c.clickable?"pointer":"default", transition:"all 0.2s" }}
            onClick={() => c.clickable && openValidasiModal(allData.filter(d => !d._in_db))}>
            <div style={{ fontSize:16, color:c.color, marginBottom:5 }}>{c.icon}</div>
            <div style={{ color:c.color, fontSize:c.small?13:24, fontWeight:700, lineHeight:1 }}>{c.value}</div>
            <div style={{ color:"#64748b", fontSize:9, marginTop:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>{c.label}</div>
            {c.clickable && <div style={{ color:"#60a5fa", fontSize:9, marginTop:3 }}>▶ klik konfirmasi</div>}
          </div>
        ))}
      </div>

      {/* ── BANNER BELUM KONFIRMASI ────────────────────────────────────────── */}
      {totalUnconfirmed > 0 && (
        <div style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.25)", borderRadius:10, padding:"12px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:20 }}>⏳</span>
          <div style={{ flex:1 }}>
            <div style={{ color:"#60a5fa", fontWeight:700, fontSize:13, marginBottom:3 }}>
              {totalUnconfirmed} ATM belum dikonfirmasi ke Cash Plan
            </div>
            <div style={{ color:"#94a3b8", fontSize:12 }}>
              Baris berwarna biru di tabel — tombol Selesai/Batal <strong style={{ color:"#60a5fa" }}>dinonaktifkan</strong> sampai dikonfirmasi.
              Pilih via checkbox lalu klik <strong style={{ color:"#00e5a0" }}>Konfirmasi</strong> di bulk action bar.
            </div>
          </div>
          <button onClick={() => openValidasiModal(allData.filter(d => !d._in_db))}
            style={{ ...btnStyle("#00e5a0"), fontSize:12, padding:"8px 16px", flexShrink:0, whiteSpace:"nowrap" }}>
            ✅ Konfirmasi Semua ({totalUnconfirmed})
          </button>
        </div>
      )}

      {doneBatalCount > 0 && (
        <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:10, padding:"12px 18px", marginBottom:12, display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:18, marginTop:1 }}>ℹ️</span>
          <div>
            <div style={{ color:"#93c5fd", fontWeight:700, fontSize:13, marginBottom:4 }}>{doneBatalCount} ATM sudah Selesai/Batal</div>
            <div style={{ color:"#94a3b8", fontSize:12 }}>Data otomatis masuk ke <strong style={{ color:"#a78bfa" }}>Rekap Replacement</strong> saat upload data baru.</div>
          </div>
        </div>
      )}

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="Cari ID ATM / lokasi / wilayah..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(99,179,237,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:13, width:220, outline:"none" }}
        />
        {[
          { val:filterWilayah, set:setFilterWilayah, opts:WILAYAH_LIST },
          { val:filterStatus,  set:setFilterStatus,  opts:STATUS_FILTER },
          { val:filterTipe,    set:setFilterTipe,    opts:["Semua","EMV","CRM"] },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }} style={selectStyle}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"#64748b", fontSize:12 }}>Denom default:</span>
          <select value={denomGlobal} onChange={e => setDenomGlobal(Number(e.target.value))}
            style={{ ...selectStyle, border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa" }}>
            {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── BULK ACTION BAR ───────────────────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", marginBottom:10, background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:10, flexWrap:"wrap" }}>
          <span style={{ color:"#60a5fa", fontSize:13, fontWeight:600 }}>{selectedRows.length} ATM dipilih</span>
          {selectedUnconfirmed.length > 0 && (
            <span style={{ color:"#94a3b8", fontSize:12 }}>· {selectedUnconfirmed.length} belum dikonfirmasi</span>
          )}
          <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
            {selectedUnconfirmed.length > 0 && (
              <button onClick={() => openValidasiModal(selectedUnconfirmed)} style={bulkBtn("#00e5a0")}>
                ✅ Konfirmasi ({selectedUnconfirmed.length})
              </button>
            )}
            <button onClick={handleBulkRemove} style={bulkBtn("#ff3b5c")}>✕ Hapus ({selectedRows.length})</button>
            <button onClick={() => setSelectedRows([])} style={bulkBtn("#64748b")}>Batal Pilih</button>
          </div>
        </div>
      )}

      {/* ── TABLE ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? <EmptyState /> : (
        <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(99,179,237,0.08)", borderRadius:12, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(99,179,237,0.12)", background:"rgba(255,255,255,0.02)" }}>
                  <th style={{ padding:"11px 14px", width:40 }}>
                    <Checkbox checked={isAllPage} indeterminate={isSomePage && !isAllPage} onChange={toggleSelectAll} />
                  </th>
                  {[
                    {label:"No",key:null},{label:"Tgl Masuk",key:"added_at"},{label:"ID ATM",key:"id_atm"},
                    {label:"Lokasi ATM",key:"lokasi"},{label:"Wilayah",key:"wilayah"},{label:"Tipe",key:"tipe"},
                    {label:"Denom",key:null},{label:"Total Isi",key:"saldo"},{label:"Lembar",key:null},
                    {label:"Saldo Terakhir",key:"saldo"},{label:"Status",key:"status"},
                    {label:"Keterangan",key:null},{label:"Aksi",key:null},
                  ].map((col, ci) => (
                    <th key={ci} onClick={col.key?()=>toggleSort(col.key):undefined}
                      style={{ padding:"11px 12px", textAlign:"left", color:col.key&&sort.key===col.key?"#60a5fa":"#64748b", fontWeight:600, fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", cursor:col.key?"pointer":"default", whiteSpace:"nowrap", userSelect:"none" }}>
                      {col.label}{col.key&&sort.key===col.key&&<span style={{marginLeft:3}}>{sort.dir>0?"↑":"↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((atm, i) => {
                  const rowNo         = page * PAGE_SIZE + i + 1;
                  const denom         = getDenom(atm.id_atm);
                  const totalIsiV     = jumlahIsi(atm.saldo, atm.limit);
                  const ket           = getKet(atm.id_atm);
                  const statusDone    = atm.status_done || null;
                  const isDone        = statusDone === "SELESAI" || statusDone === "BATAL";
                  const isUnconfirmed = !atm._in_db;
                  const isSelected    = selectedRows.includes(atm.id_atm);
                  const ss            = statusDone==="SELESAI"?SELESAI_STYLE:statusDone==="BATAL"?BATAL_STYLE:isUnconfirmed?PENDING_STYLE:PROSES_STYLE;
                  const rowBg         = isSelected?"rgba(59,130,246,0.1)":isUnconfirmed?"rgba(96,165,250,0.04)":isDone?"rgba(0,229,160,0.02)":(atm.status||atm.status_awal)==="BONGKAR"?"rgba(255,59,92,0.025)":"transparent";

                  return (
                    <tr key={atm.id_atm}
                      style={{ background:rowBg, borderBottom:isUnconfirmed?"1px solid rgba(96,165,250,0.12)":isSelected?"1px solid rgba(59,130,246,0.15)":"1px solid rgba(99,179,237,0.05)", transition:"all 0.1s" }}
                      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background=isUnconfirmed?"rgba(96,165,250,0.08)":"rgba(59,130,246,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background=rowBg; }}>

                      <td style={{padding:"8px 14px"}}><Checkbox checked={isSelected} onChange={()=>toggleSelect(atm.id_atm)} /></td>
                      <td style={td("#64748b")}>{rowNo}</td>

                      {/* Tgl Masuk */}
                      <td style={{padding:"8px 12px"}}>
                        {atm.added_at ? (
                          <div>
                            <div style={{color:"#60a5fa",fontSize:11,fontWeight:600}}>{new Date(atm.added_at).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</div>
                            <div style={{color:"#475569",fontSize:10,marginTop:1}}>{new Date(atm.added_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</div>
                          </div>
                        ) : (
                          <span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:PENDING_STYLE.bg,color:PENDING_STYLE.color,border:`1px solid ${PENDING_STYLE.border}`,fontWeight:700}}>⏳ Blm Konfirmasi</span>
                        )}
                      </td>

                      {/* ID ATM */}
                      <td style={{padding:"8px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:"#e2e8f0",fontFamily:"monospace",fontWeight:700,cursor:"pointer",textDecoration:"underline dotted"}} onClick={()=>navigateTo?.("history",atm.id_atm)}>{atm.id_atm}</span>
                          {isDone && <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:ss.bg,color:ss.color,border:`1px solid ${ss.border}`}}>{statusDone}</span>}
                        </div>
                      </td>

                      <td style={{...td("#94a3b8"),maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={atm.lokasi}>{atm.lokasi||"—"}</td>
                      <td style={td("#94a3b8")}>{atm.wilayah||"—"}</td>

                      {/* Tipe */}
                      <td style={{padding:"8px 12px"}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:atm.tipe==="CRM"?"rgba(167,139,250,0.15)":"rgba(96,165,250,0.12)",color:atm.tipe==="CRM"?"#a78bfa":"#60a5fa",border:atm.tipe==="CRM"?"1px solid rgba(167,139,250,0.3)":"1px solid rgba(96,165,250,0.25)"}}>
                          {atm.tipe||"—"}
                        </span>
                      </td>

                      {/* Denom — dikunci jika belum konfirmasi */}
                      <td style={{padding:"8px 10px"}}>
                        <select value={denom} onChange={e=>setOverride(atm.id_atm,"denom",Number(e.target.value))} disabled={isUnconfirmed}
                          style={{background:"#0d1228",border:`1px solid ${isUnconfirmed?"rgba(99,179,237,0.08)":"rgba(167,139,250,0.25)"}`,borderRadius:6,color:isUnconfirmed?"#374151":"#a78bfa",padding:"4px 6px",fontSize:11,cursor:isUnconfirmed?"not-allowed":"pointer",outline:"none"}}>
                          {DENOM_OPTIONS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>

                      <td style={{padding:"8px 12px"}}>
                        <span style={{color:"#f59e0b",fontWeight:600}}>{fmtRp(totalIsiV)}</span>
                        <div style={{color:"#64748b",fontSize:10,marginTop:1}}>target: {fmtRp(atm.limit)}</div>
                      </td>
                      <td style={td("#94a3b8")}>{totalIsiV>0?fmtLembar(totalIsiV,denom):"—"}</td>
                      <td style={{padding:"8px 12px"}}>
                        <div style={{color:"#e2e8f0",fontWeight:600}}>{fmtRp(atm.saldo)}</div>
                        <SaldoBar pct={atm.pct_saldo} />
                      </td>

                      {/* Status kolom */}
                      <td style={{padding:"8px 12px"}}>
                        {isUnconfirmed ? (
                          <div style={{display:"flex",flexDirection:"column",gap:5}}>
                            <button onClick={()=>openValidasiModal([atm])}
                              style={{fontSize:10,fontWeight:700,padding:"5px 10px",borderRadius:6,background:"rgba(96,165,250,0.12)",color:"#60a5fa",border:"1px solid rgba(96,165,250,0.3)",cursor:"pointer",whiteSpace:"nowrap"}}>
                              ⏳ Konfirmasi Dulu
                            </button>
                            <div style={{fontSize:9,color:"#374151",textAlign:"center"}}>Selesai/Batal dikunci</div>
                          </div>
                        ) : isDone ? (
                          <div style={{fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:6,...ss,textAlign:"center",border:`1px solid ${ss.border}`,display:"inline-block"}}>
                            {statusDone==="SELESAI"?"✔ Selesai":"✕ Batal"}
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            <div style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:5,...PROSES_STYLE,border:`1px solid ${PROSES_STYLE.border}`,textAlign:"center"}}>◎ Proses</div>
                            <div style={{display:"flex",gap:4}}>
                              <button
                                onClick={() => handleUpdateStatus(atm, "SELESAI")}
                                style={{flex:1,fontSize:10,fontWeight:700,padding:"3px 6px",borderRadius:5,background:"rgba(0,229,160,0.1)",color:"#00e5a0",border:"1px solid rgba(0,229,160,0.3)",cursor:"pointer"}}
                              >✔</button>
                              <button
                                onClick={() => handleUpdateStatus(atm, "BATAL")}
                                title={!ket ? "Pilih keterangan dulu sebelum membatalkan" : "Tandai Batal"}
                                style={{
                                  flex:1,fontSize:10,fontWeight:700,padding:"3px 6px",borderRadius:5,
                                  background: ket ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.04)",
                                  color: ket ? "#94a3b8" : "#374151",
                                  border: ket ? "1px solid rgba(148,163,184,0.35)" : "1px solid rgba(148,163,184,0.12)",
                                  cursor: ket ? "pointer" : "not-allowed",
                                  opacity: ket ? 1 : 0.5,
                                }}
                              >✕</button>
                            </div>
                            {!ket && (
                              <div style={{color:"#f59e0b",fontSize:9,textAlign:"center",marginTop:2}}>
                                isi ket. dulu ↑
                              </div>
                            )}
                            <div style={{color:"#374151",fontSize:9,textAlign:"center"}}>✔ selesai · ✕ batal</div>
                          </div>
                        )}
                      </td>

                      {/* Keterangan — dikunci jika belum konfirmasi */}
                      <td style={{padding:"8px 10px"}}>
                        <select value={ket} onChange={e=>setOverride(atm.id_atm,"keterangan",e.target.value)} disabled={isUnconfirmed}
                          style={{background:"#0d1228",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:ket?"#e2e8f0":isUnconfirmed?"#2d3748":"#475569",padding:"5px 8px",fontSize:11,width:150,outline:"none",cursor:isUnconfirmed?"not-allowed":"pointer"}}>
                          <option value="">— pilih keterangan —</option>
                          {KET_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
                        </select>
                      </td>

                      {/* Aksi */}
                      <td style={{padding:"8px 10px"}}>
                        <button onClick={()=>handleRemove(atm)}
                          style={{background:"rgba(255,59,92,0.08)",border:"1px solid rgba(255,59,92,0.25)",borderRadius:6,color:"#ff3b5c",padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                          ✕ {isUnconfirmed?"Abaikan":"Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {maxPage > 1 && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderTop:"1px solid rgba(99,179,237,0.08)"}}>
              <span style={{color:"#64748b",fontSize:12}}>Halaman {page+1} dari {maxPage} · {filtered.length} ATM</span>
              <div style={{display:"flex",gap:6}}>
                <PageBtn disabled={page===0}        onClick={()=>setPage(p=>p-1)}>← Prev</PageBtn>
                <PageBtn disabled={page>=maxPage-1} onClick={()=>setPage(p=>p+1)}>Next →</PageBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEGEND ────────────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:16,marginTop:16,flexWrap:"wrap"}}>
        {[
          {label:"Baris biru — belum dikonfirmasi (Selesai/Batal dikunci)",color:"#60a5fa"},
          {label:"BONGKAR — saldo ≤ 20%",color:"#ff3b5c"},
          {label:"AWAS — saldo 20–30%",color:"#f59e0b"},
          {label:"Remove ≤25% diblokir",color:"#f59e0b"},
        ].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:8,height:8,borderRadius:2,background:l.color}} />
            <span style={{color:"#64748b",fontSize:11}}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL VALIDASI BULK
      ══════════════════════════════════════════════════════════════════════ */}
      {showValidasiModal && validasiList.length > 0 && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:16}}>
          <div style={{background:"#0d1228",border:"1px solid rgba(0,229,160,0.25)",borderRadius:18,padding:"24px 28px",width:validasiList.length===1?520:720,maxWidth:"98vw",maxHeight:"90vh",boxShadow:"0 30px 100px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column",gap:0}}>

            {/* Header */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <h2 style={{color:"#00e5a0",fontSize:17,fontWeight:700,margin:"0 0 4px"}}>✅ Konfirmasi Masuk Cash Plan</h2>
                <p style={{color:"#64748b",fontSize:12,margin:0}}>
                  {validasiList.length===1
                    ? `Review detail ATM ${validasiList[0].id_atm}`
                    : `${validasiList.length} ATM akan dikonfirmasi sekaligus — atur denom & keterangan per ATM`}
                </p>
              </div>
              <button onClick={()=>{setShowValidasiModal(false);setValidasiList([]);}} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
            </div>

            {/* Bulk denom shortcut */}
            {validasiList.length > 1 && (
              <div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span style={{color:"#a78bfa",fontSize:12,fontWeight:600}}>⚙️ Set Denom Semua:</span>
                  {DENOM_OPTIONS.map(d=>(
                    <button key={d.value} onClick={()=>{const upd={};validasiList.forEach(a=>{upd[a.id_atm]={...validasiOverrides[a.id_atm],denom:d.value};});setValidasiOverrides(prev=>({...prev,...upd}));}}
                      style={{fontSize:11,padding:"4px 12px",borderRadius:6,background:"rgba(167,139,250,0.1)",color:"#a78bfa",border:"1px solid rgba(167,139,250,0.3)",cursor:"pointer",fontWeight:600}}>
                      {d.label}
                    </button>
                  ))}
                  <span style={{color:"#64748b",fontSize:11}}>atau atur per ATM ↓</span>
                </div>
              </div>
            )}

            {/* Content */}
            <div style={{overflowY:"auto",flex:1,marginBottom:16,maxHeight:validasiList.length===1?"none":400}}>
              {validasiList.length === 1 ? (
                /* ── SINGLE detail ── */
                (() => {
                  const atm = validasiList[0];
                  const vd  = getVDenom(atm.id_atm);
                  return (
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                        <span style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:700,background:atm.status==="BONGKAR"?"rgba(255,59,92,0.15)":"rgba(245,158,11,0.15)",color:atm.status==="BONGKAR"?"#ff3b5c":"#f59e0b",border:`1px solid ${atm.status==="BONGKAR"?"rgba(255,59,92,0.3)":"rgba(245,158,11,0.3)"}`}}>⚠ {atm.status}</span>
                        <span style={{color:"#64748b",fontSize:12}}>Skor: <strong style={{color:"#e2e8f0"}}>{atm.skor_urgensi?.toFixed(2)||"—"}</strong></span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                        {[
                          {label:"ID ATM",value:atm.id_atm,mono:true,color:"#e2e8f0"},
                          {label:"Tipe",value:atm.tipe||"—",color:atm.tipe==="CRM"?"#a78bfa":"#60a5fa"},
                          {label:"Lokasi",value:atm.lokasi||"—",span:true},
                          {label:"Wilayah",value:atm.wilayah||"—"},
                          {label:"Saldo",value:fmtRp(atm.saldo),color:"#ff3b5c"},
                          {label:"Limit",value:fmtRp(atm.limit),color:"#94a3b8"},
                          {label:"Total Isi",value:fmtRp(jumlahIsi(atm.saldo,atm.limit)),color:"#f59e0b"},
                          {label:"Est. Jam Kosong",value:atm.est_jam?`${atm.est_jam} jam`:"—"},
                        ].map((f,fi)=>(
                          <div key={fi} style={{gridColumn:f.span?"1 / -1":"auto",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(99,179,237,0.1)",borderRadius:8,padding:"10px 12px"}}>
                            <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{f.label}</div>
                            <div style={{color:f.color||"#94a3b8",fontSize:13,fontWeight:600,fontFamily:f.mono?"monospace":"inherit"}}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(99,179,237,0.1)",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{color:"#64748b",fontSize:11}}>Persentase Saldo</span>
                          <span style={{color:(atm.pct_saldo||0)<=20?"#ff3b5c":"#f59e0b",fontWeight:700,fontSize:13}}>{(atm.pct_saldo||0).toFixed(1)}%</span>
                        </div>
                        <div style={{width:"100%",height:8,background:"rgba(255,255,255,0.06)",borderRadius:4}}>
                          <div style={{height:"100%",borderRadius:4,width:`${Math.min(atm.pct_saldo||0,100)}%`,background:(atm.pct_saldo||0)<=20?"linear-gradient(90deg,#ff3b5c,#ff6b8a)":"linear-gradient(90deg,#f59e0b,#fbbf24)",transition:"width 0.4s"}} />
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                        <div>
                          <label style={{color:"#64748b",fontSize:11,display:"block",marginBottom:5}}>Denominasi</label>
                          <select value={vd} onChange={e=>setVOverride(atm.id_atm,"denom",Number(e.target.value))}
                            style={{width:"100%",background:"#0d1228",border:"1px solid rgba(167,139,250,0.3)",borderRadius:8,color:"#a78bfa",padding:"8px 10px",fontSize:12,outline:"none",cursor:"pointer"}}>
                            {DENOM_OPTIONS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{color:"#64748b",fontSize:11,display:"block",marginBottom:5}}>Jumlah Lembar</label>
                          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"8px 10px",color:"#f59e0b",fontSize:12,fontWeight:700}}>
                            {fmtLembar(jumlahIsi(atm.saldo,atm.limit),vd)}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{color:"#64748b",fontSize:11,display:"block",marginBottom:5}}>Keterangan (opsional)</label>
                        <select value={getVKet(atm.id_atm)} onChange={e=>setVOverride(atm.id_atm,"ket",e.target.value)}
                          style={{width:"100%",background:"#0d1228",border:"1px solid rgba(99,179,237,0.15)",borderRadius:8,color:getVKet(atm.id_atm)?"#e2e8f0":"#475569",padding:"8px 10px",fontSize:12,outline:"none",cursor:"pointer"}}>
                          <option value="">— pilih keterangan (opsional) —</option>
                          {KET_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* ── MULTI: tabel ── */
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"rgba(255,255,255,0.03)",borderBottom:"1px solid rgba(99,179,237,0.1)"}}>
                      {["No","ID ATM","Lokasi","Wilayah","Status","Saldo %","Total Isi","Denominasi","Keterangan"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validasiList.map((atm,idx)=>{
                      const vd = getVDenom(atm.id_atm);
                      return (
                        <tr key={atm.id_atm} style={{borderBottom:"1px solid rgba(99,179,237,0.06)",background:atm.status==="BONGKAR"?"rgba(255,59,92,0.03)":"transparent"}}>
                          <td style={td("#64748b")}>{idx+1}</td>
                          <td style={{padding:"7px 10px",color:"#e2e8f0",fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap"}}>{atm.id_atm}</td>
                          <td style={{...td("#94a3b8"),maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={atm.lokasi}>{atm.lokasi||"—"}</td>
                          <td style={td("#94a3b8")}>{atm.wilayah||"—"}</td>
                          <td style={{padding:"7px 10px"}}>
                            <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,fontWeight:700,background:atm.status==="BONGKAR"?"rgba(255,59,92,0.15)":"rgba(245,158,11,0.15)",color:atm.status==="BONGKAR"?"#ff3b5c":"#f59e0b"}}>{atm.status}</span>
                          </td>
                          <td style={{padding:"7px 10px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <div style={{width:30,height:3,background:"rgba(255,255,255,0.08)",borderRadius:2}}>
                                <div style={{height:"100%",width:`${Math.min(atm.pct_saldo||0,100)}%`,background:(atm.pct_saldo||0)<=20?"#ff3b5c":"#f59e0b",borderRadius:2}} />
                              </div>
                              <span style={{color:(atm.pct_saldo||0)<=20?"#ff3b5c":"#f59e0b",fontWeight:700,fontSize:10}}>{(atm.pct_saldo||0).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td style={{padding:"7px 10px",color:"#f59e0b",fontWeight:600,whiteSpace:"nowrap"}}>{fmtRp(jumlahIsi(atm.saldo,atm.limit))}</td>
                          <td style={{padding:"7px 8px"}}>
                            <select value={vd} onChange={e=>setVOverride(atm.id_atm,"denom",Number(e.target.value))}
                              style={{background:"#0d1228",border:"1px solid rgba(167,139,250,0.25)",borderRadius:6,color:"#a78bfa",padding:"3px 6px",fontSize:10,cursor:"pointer",outline:"none"}}>
                              {DENOM_OPTIONS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"7px 8px"}}>
                            <select value={getVKet(atm.id_atm)} onChange={e=>setVOverride(atm.id_atm,"ket",e.target.value)}
                              style={{background:"#0d1228",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:getVKet(atm.id_atm)?"#e2e8f0":"#475569",padding:"3px 6px",fontSize:10,cursor:"pointer",outline:"none",width:115}}>
                              <option value="">— opsional —</option>
                              {KET_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Ringkasan */}
            <div style={{background:"rgba(0,229,160,0.05)",border:"1px solid rgba(0,229,160,0.2)",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
              <div style={{color:"#00e5a0",fontWeight:700,fontSize:12,marginBottom:6}}>📋 Ringkasan</div>
              <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                <span style={{color:"#94a3b8",fontSize:12}}>ATM: <strong style={{color:"#e2e8f0"}}>{validasiList.length}</strong></span>
                <span style={{color:"#94a3b8",fontSize:12}}>Total Isi: <strong style={{color:"#f59e0b"}}>{fmtRp(validasiList.reduce((s,a)=>s+jumlahIsi(a.saldo,a.limit),0))}</strong></span>
                <span style={{color:"#94a3b8",fontSize:12}}>BONGKAR: <strong style={{color:"#ff3b5c"}}>{validasiList.filter(a=>a.status==="BONGKAR").length}</strong></span>
                <span style={{color:"#94a3b8",fontSize:12}}>AWAS: <strong style={{color:"#f59e0b"}}>{validasiList.filter(a=>a.status==="AWAS").length}</strong></span>
              </div>
            </div>

            {/* Tombol */}
            <div style={{display:"flex",gap:10,flexShrink:0}}>
              <button onClick={handleKonfirmasiBulk} disabled={validasiLoading}
                style={{flex:1,background:validasiLoading?"rgba(0,229,160,0.05)":"rgba(0,229,160,0.15)",border:"1px solid rgba(0,229,160,0.4)",borderRadius:10,color:"#00e5a0",padding:"12px",fontSize:14,fontWeight:700,cursor:validasiLoading?"not-allowed":"pointer"}}>
                {validasiLoading?"Menyimpan...":`✅ Konfirmasi ${validasiList.length} ATM ke Cash Plan`}
              </button>
              <button onClick={()=>{setShowValidasiModal(false);setValidasiList([]);}}
                style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(99,179,237,0.15)",borderRadius:10,color:"#64748b",padding:"12px 18px",fontSize:13,cursor:"pointer"}}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL DOWNLOAD EXCEL
      ══════════════════════════════════════════════════════════════════════ */}
      {showDlModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#0d1228",border:"1px solid rgba(99,179,237,0.2)",borderRadius:16,padding:"28px 32px",width:440,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{color:"#e2e8f0",fontSize:18,fontWeight:700,margin:0}}>📊 Download Excel Cash Plan</h2>
              <button onClick={()=>setShowDlModal(false)} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{color:"#94a3b8",fontSize:13,marginBottom:20}}>
              Pilih wilayah. File .xlsx akan terdownload ke folder Downloads.
              <div style={{marginTop:8,padding:"6px 12px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:6,color:"#a78bfa",fontFamily:"monospace",fontSize:12}}>{SAVE_PATH}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["Semua","PEKANBARU","BATAM","DUMAI","Tanjung Pinang"].map(w=>{
                const cnt = w==="Semua" ? filtered.length : filtered.filter(d=>d.wilayah?.toUpperCase()===w.toUpperCase()).length;
                return (
                  <button key={w} onClick={()=>exportExcel(filtered,w,filterBulan,nowTahun(),getDenom,getKet)} disabled={cnt===0}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderRadius:8,background:cnt===0?"rgba(255,255,255,0.02)":"rgba(167,139,250,0.08)",border:`1px solid ${cnt===0?"rgba(99,179,237,0.1)":"rgba(167,139,250,0.25)"}`,color:cnt===0?"#374151":"#a78bfa",cursor:cnt===0?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>
                    <span>📥 {w==="Semua"?"Semua Wilayah":w}</span>
                    <span style={{fontSize:12,fontWeight:400,color:cnt===0?"#374151":"#64748b"}}>{cnt} ATM · .xlsx</span>
                  </button>
                );
              })}
            </div>
            <button onClick={()=>setShowDlModal(false)} style={{marginTop:16,width:"100%",padding:"10px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(99,179,237,0.12)",color:"#64748b",cursor:"pointer",fontSize:13}}>Tutup</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL TAMBAH MANUAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#0d1228",border:"1px solid rgba(99,179,237,0.2)",borderRadius:16,padding:"28px 32px",width:420,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{color:"#e2e8f0",fontSize:18,fontWeight:700,margin:0}}>Tambah ATM Manual</h2>
              <button onClick={()=>{setShowAddModal(false);setAddError("");setAddIdInput("");}} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#93c5fd",fontSize:12}}>
              ℹ️ ATM akan melewati <strong>validasi detail</strong> sebelum masuk ke antrian Cash Plan.
            </div>
            <label style={{color:"#94a3b8",fontSize:12,display:"block",marginBottom:6}}>ID ATM</label>
            <input value={addIdInput} onChange={e=>{setAddIdInput(e.target.value.toUpperCase());setAddError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleAddManual()}
              placeholder="Contoh: CRM10101 atau EMV82901" autoFocus
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(99,179,237,0.2)",borderRadius:8,color:"#e2e8f0",padding:"10px 14px",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}
            />
            {addError && <div style={{marginTop:10,padding:"8px 12px",background:"rgba(255,59,92,0.08)",border:"1px solid rgba(255,59,92,0.25)",borderRadius:8,color:"#ff3b5c",fontSize:12}}>⚠ {addError}</div>}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={handleAddManual} disabled={addLoading||!addIdInput.trim()}
                style={{flex:1,background:addLoading||!addIdInput.trim()?"rgba(0,229,160,0.05)":"rgba(0,229,160,0.15)",border:"1px solid rgba(0,229,160,0.3)",borderRadius:8,color:"#00e5a0",padding:"10px 0",fontSize:13,fontWeight:700,cursor:addLoading||!addIdInput.trim()?"not-allowed":"pointer"}}>
                {addLoading?"Mencari ATM...":"Cari & Review →"}
              </button>
              <button onClick={()=>{setShowAddModal(false);setAddError("");setAddIdInput("");}}
                style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(99,179,237,0.12)",borderRadius:8,color:"#64748b",padding:"10px 18px",fontSize:13,cursor:"pointer"}}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.8;transform:scale(1.15)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange }) {
  return (
    <div onClick={onChange} style={{width:16,height:16,borderRadius:4,cursor:"pointer",border:checked||indeterminate?"2px solid #3b82f6":"2px solid rgba(99,179,237,0.3)",background:checked?"#3b82f6":indeterminate?"rgba(59,130,246,0.3)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
      {checked&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {indeterminate&&!checked&&<div style={{width:8,height:2,background:"#60a5fa",borderRadius:1}} />}
    </div>
  );
}
function SaldoBar({ pct, compact }) {
  const color = pct<=20?"#ff3b5c":pct<=30?"#f59e0b":"#22c55e";
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:compact?0:3}}>
      <div style={{width:compact?40:50,height:3,background:"rgba(255,255,255,0.08)",borderRadius:2}}>
        <div style={{height:"100%",width:`${Math.min(pct||0,100)}%`,background:color,borderRadius:2}} />
      </div>
      <span style={{color,fontSize:10,fontWeight:700}}>{pct?.toFixed(0)}%</span>
    </div>
  );
}
function EmptyState() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:280,gap:12,background:"rgba(0,229,160,0.03)",border:"1px solid rgba(0,229,160,0.1)",borderRadius:12}}>
      <span style={{fontSize:36}}>✓</span>
      <span style={{color:"#00e5a0",fontWeight:600,fontSize:16}}>Semua ATM Dalam Kondisi Aman</span>
      <span style={{color:"#64748b",fontSize:13}}>Tidak ada ATM dengan status AWAS atau BONGKAR</span>
    </div>
  );
}
function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:12,color:"#64748b"}}>
      <div style={{width:32,height:32,border:"2px solid rgba(59,130,246,0.2)",borderTopColor:"#3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
      <span>Memuat data Cash Plan...</span>
    </div>
  );
}
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{background:disabled?"transparent":"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:6,color:disabled?"#374151":"#60a5fa",padding:"5px 12px",fontSize:12,cursor:disabled?"default":"pointer"}}>
      {children}
    </button>
  );
}

const selectStyle = {background:"#0d1228",border:"1px solid rgba(99,179,237,0.15)",borderRadius:8,color:"#94a3b8",padding:"8px 12px",fontSize:13,cursor:"pointer",outline:"none"};
const td          = color => ({padding:"8px 12px",color,whiteSpace:"nowrap"});
const btnStyle    = accent => ({background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:8,color:accent,padding:"8px 16px",fontSize:13,cursor:"pointer",fontWeight:600});
const bulkBtn     = accent => ({background:`${accent}15`,border:`1px solid ${accent}40`,borderRadius:7,color:accent,padding:"6px 14px",fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"});