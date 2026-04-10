// src/pages/CashPlan.jsx
import { useState, useEffect, useMemo } from "react";
import { apiFetch, fmt } from "../utils/api";
import { addCashplanAPI, getCashplanAPI, updateCashplanStatusAPI, removeCashplanAPI } from "../utils/api";

const DENOM_OPTIONS  = [{ label: "Rp 50.000", value: 50_000 }, { label: "Rp 100.000", value: 100_000 }];
const WILAYAH_LIST   = ["Semua", "PEKANBARU", "BATAM", "DUMAI", "Tanjung Pinang"];
const STATUS_FILTER  = ["Semua", "BONGKAR", "AWAS"];
const KET_OPTIONS    = ["Mesin Rusak", "Kas Banyak", "Lokasi Tutup", "Keluhan Jaringan"];
const SAVE_PATH      = "D:\\Bank Riau Kepri 2";
const BULAN_ID       = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const nowBulan       = () => BULAN_ID[new Date().getMonth()];
const nowTahun       = () => new Date().getFullYear();
const fmtRp          = v => v == null || isNaN(v) ? "—" : "Rp " + Number(v).toLocaleString("id-ID");
const fmtLembar      = (total, denom) => !total || !denom ? "—" : Math.ceil(total / denom).toLocaleString("id-ID") + " lembar";
const jumlahIsi      = (saldo, limit) => Math.max(0, limit - saldo);

const STATUS_STYLE = {
  BONGKAR: { color: "#ff3b5c", bg: "rgba(255,59,92,0.12)",  border: "rgba(255,59,92,0.3)"  },
  AWAS:    { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
};
const PROSES_STYLE  = { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
const SELESAI_STYLE = { color: "#00e5a0", bg: "rgba(0,229,160,0.12)",  border: "rgba(0,229,160,0.3)" };
const BATAL_STYLE   = { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" };

// ── Download CSV ──────────────────────────────────────────
function downloadCSVPerWilayah(data, wilayah, bulan, tahun) {
  const rows = wilayah === "Semua"
    ? data
    : data.filter(d => d.wilayah?.toUpperCase() === wilayah.toUpperCase());

  const headers = [
    "No","Tgl Masuk Cash Plan","Bulan","Tahun","ID ATM","Lokasi","Wilayah","Tipe",
    "Denom","Saldo Terakhir","Total Isi","Lembar","Status","Keterangan",
  ];

  const csvRows = rows.map((d, i) => {
    const denom    = d._denom || 100_000;
    const totalIsi = jumlahIsi(d.saldo, d.limit);
    const addedAt  = d.added_at
      ? new Date(d.added_at).toLocaleString("id-ID", { dateStyle:"short", timeStyle:"short" })
      : "-";
    return [
      i + 1,
      `"${addedAt}"`,
      bulan, tahun,
      d.id_atm || "-",
      `"${(d.lokasi || "-").replace(/"/g,'""')}"`,
      d.wilayah || "-",
      d.tipe || "-",
      `Rp ${Number(denom).toLocaleString("id-ID")}`,
      d.saldo || 0,
      totalIsi,
      fmtLembar(totalIsi, denom),
      d._status_done || "PROSES",
      `"${(d._keterangan || "-").replace(/"/g,'""')}"`,
    ].join(",");
  });

  const csv  = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");

  const now   = new Date();
  const tglDl = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const fn    = `CashPlan_${wilayah === "Semua" ? "Semua_Wilayah" : wilayah}_${bulan}_${tahun}_dl${tglDl}.csv`;

  a.href = url; a.download = fn; a.click();
  URL.revokeObjectURL(url);
  alert(`✅ File berhasil didownload!\n\nNama file: ${fn}\n\n⚠️ Pindahkan manual ke:\n${SAVE_PATH}`);
}

// ════════════════════════════════════════════════════════
export default function CashPlan({ navigateTo }) {
  const [predData,      setPredData]      = useState([]);
  const [cashplanData,  setCashplanData]  = useState([]);
  // FIX: track id_atm yang sudah di-remove murni agar tidak muncul lagi dari predData
  const [removedAtmIds, setRemovedAtmIds] = useState(new Set());
  const [loading,       setLoading]       = useState(true);
  const [genAt,         setGenAt]         = useState(null);

  const [filterWilayah, setFilterWilayah] = useState("Semua");
  const [filterStatus,  setFilterStatus]  = useState("Semua");
  const [filterBulan,   setFilterBulan]   = useState(nowBulan());
  const [filterTipe,    setFilterTipe]    = useState("Semua");
  const [search,        setSearch]        = useState("");
  const [showDlModal,   setShowDlModal]   = useState(false);
  const [denomGlobal,   setDenomGlobal]   = useState(100_000);

  // Per-row overrides: denom, keterangan
  const [overrides, setOverrides] = useState({});
  const setOverride   = (id, field, val) =>
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  const getDenom      = id => overrides[id]?.denom ?? denomGlobal;
  const getKet        = id => overrides[id]?.keterangan ?? "";

  const [sort,  setSort]  = useState({ key: "skor_urgensi", dir: -1 });
  const [page,  setPage]  = useState(0);
  const PAGE_SIZE = 15;

  const [selectedRows,  setSelectedRows]  = useState([]);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [addIdInput,    setAddIdInput]    = useState("");
  const [addLoading,    setAddLoading]    = useState(false);
  const [addError,      setAddError]      = useState("");

  // ── Fetch ─────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const predResp = await apiFetch("/api/predictions?limit=500");
      const filtered = (predResp.data || []).filter(
        d => d.status === "BONGKAR" || d.status === "AWAS"
      );
      setPredData(filtered);
      setGenAt(predResp.generated_at || null);

      const [cpPending, cpDone, cpRemoved] = await Promise.all([
        getCashplanAPI("PENDING"),
        getCashplanAPI("DONE"),
        getCashplanAPI("REMOVED"),
      ]);

      // FIX: Kumpulkan id_atm yang di-remove murni (bukan Batal)
      // agar bisa di-exclude dari predData di allData
      const removedMurni = new Set(
        (cpRemoved.data || [])
          .filter(d => d.status_done !== "BATAL")
          .map(d => d.id_atm)
      );
      setRemovedAtmIds(removedMurni);

      const allCp = [
        ...(cpPending.data || []),
        ...(cpDone.data    || []).map(d => ({ ...d, status_done: d.status_done || "SELESAI" })),
        // FIX: REMOVED hanya ditampilkan jika status_done='BATAL' (ada rekam jejak)
        // REMOVED murni (tombol ✕ Remove) tidak ditampilkan sama sekali
        ...(cpRemoved.data || [])
          .filter(d => d.status_done === "BATAL")
          .map(d => ({ ...d, status_done: "BATAL" })),
      ];
      setCashplanData(allCp);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Gabungkan pred + cashplan ──────────────────────────
  const allData = useMemo(() => {
    const map = {};
    for (const p of predData) {
      // FIX: skip ATM yang sudah di-remove murni — jangan tampilkan lagi
      if (removedAtmIds.has(p.id_atm)) continue;
      map[p.id_atm] = { ...p, _in_db: false };
    }
    for (const c of cashplanData) {
      map[c.id_atm] = {
        ...map[c.id_atm],
        ...c,
        _in_db:    true,
        _cp_id:    c.id,
        status:    c.status_awal,
        pct_saldo: c.pct_saldo,
      };
    }
    return Object.values(map);
  }, [predData, cashplanData, removedAtmIds]);

  // ── Filter + sort ──────────────────────────────────────
  const filtered = useMemo(() => {
    let d = allData;
    if (filterWilayah !== "Semua")
      d = d.filter(r => r.wilayah?.toUpperCase() === filterWilayah.toUpperCase());
    if (filterStatus !== "Semua")
      d = d.filter(r => (r.status || r.status_awal) === filterStatus);
    if (filterTipe !== "Semua")
      d = d.filter(r => r.tipe === filterTipe);
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
  }, [allData, filterWilayah, filterStatus, filterTipe, search, sort]);

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE);
  const toggleSort = key => {
    setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));
    setPage(0);
  };

  // ── Checkbox ───────────────────────────────────────────
  const toggleSelect    = id => setSelectedRows(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSelectAll = () => {
    const ids = paged.map(d => d.id_atm);
    const all = ids.every(id => selectedRows.includes(id));
    if (all) setSelectedRows(p => p.filter(id => !ids.includes(id)));
    else     setSelectedRows(p => [...new Set([...p, ...ids])]);
  };
  const isAllPage  = paged.length > 0 && paged.every(d => selectedRows.includes(d.id_atm));
  const isSomePage = paged.some(d => selectedRows.includes(d.id_atm));

  // ── Update status (Selesai / Batal) ───────────────────
  const handleUpdateStatus = async (atm, newStatus) => {
    if (!window.confirm(`Tandai ATM ${atm.id_atm} sebagai ${newStatus}?`)) return;
    try {
      let cpId = atm._cp_id;
      if (!cpId) {
        const addRes = await addCashplanAPI({
          id_atm: atm.id_atm, lokasi: atm.lokasi, wilayah: atm.wilayah,
          tipe: atm.tipe, saldo: atm.saldo, limit: atm.limit,
          pct_saldo: atm.pct_saldo, status: atm.status,
          tgl_isi: atm.tgl_isi, jam_isi: atm.jam_isi,
          est_jam: atm.est_jam, skor_urgensi: atm.skor_urgensi,
          denom: getDenom(atm.id_atm), added_by: "user",
        });
        cpId = addRes.cashplan_id;
      }
      await updateCashplanStatusAPI(cpId, newStatus, getKet(atm.id_atm), getDenom(atm.id_atm));
      alert(
        newStatus === "SELESAI"
          ? `✅ ATM ${atm.id_atm} ditandai Selesai.\n\nData otomatis masuk ke Rekap Replacement dan akan hilang dari Cash Plan setelah upload data baru.`
          : `🚫 ATM ${atm.id_atm} dibatalkan.\n\nData masuk ke Rekap Replacement dengan status Batal.`
      );
      await fetchData();
    } catch (e) {
      alert("Gagal update status: " + e.message);
    }
  };

  // ── Remove ─────────────────────────────────────────────
  const handleRemove = async (atm) => {
    // FIX: fallback 0 bukan 100 — null/undefined tetap diblokir
    const pct = atm.pct_saldo ?? 0;
    const sd  = atm.status_done;

    // Blokir jika saldo ≤ 25% DAN belum SELESAI/BATAL
    if (pct <= 25 && sd !== "SELESAI" && sd !== "BATAL") {
      alert(
        `⚠️ ATM ${atm.id_atm} tidak bisa dihapus!\n\n` +
        `Saldo saat ini hanya ${Number(pct).toFixed(1)}% dari limit.\n` +
        `ATM ini wajib diisi terlebih dahulu.\n\n` +
        `Ubah status menjadi Selesai jika sudah diisi,\n` +
        `atau Batal jika ada alasan khusus.`
      );
      return;
    }

    if (!window.confirm(`Hapus ATM ${atm.id_atm} dari antrian Cash Plan?`)) return;

    try {
      if (atm._in_db && atm._cp_id) {
        // Hapus dari antrian — tidak masuk rekap_replacement
        await removeCashplanAPI(atm._cp_id);
      }
      // FIX: fetchData refresh semua state termasuk removedAtmIds
      // sehingga ATM hilang dari allData meskipun masih ada di predData
      await fetchData();
    } catch (e) {
      alert("Gagal hapus: " + e.message);
    }
  };

  // ── Bulk remove ────────────────────────────────────────
  const handleBulkRemove = async () => {
    const selected = allData.filter(d => selectedRows.includes(d.id_atm));

    // FIX: fallback 0 bukan 100
    const blocked = selected.filter(d => {
      const pct = d.pct_saldo ?? 0;
      const sd  = d.status_done;
      return pct <= 25 && sd !== "SELESAI" && sd !== "BATAL";
    });

    if (blocked.length > 0) {
      alert(
        `⚠️ ${blocked.length} ATM tidak bisa dihapus (saldo ≤ 25%):\n\n` +
        `${blocked.map(d => `• ${d.id_atm} (${Number(d.pct_saldo ?? 0).toFixed(1)}%)`).join("\n")}\n\n` +
        `Selesaikan atau batalkan dulu sebelum menghapus.`
      );
      return;
    }

    if (!window.confirm(`Hapus ${selected.length} ATM dari antrian Cash Plan?`)) return;

    try {
      // Paralel — hanya yang sudah ada di DB
      const dbItems = selected.filter(atm => atm._in_db && atm._cp_id);
      await Promise.all(dbItems.map(atm => removeCashplanAPI(atm._cp_id)));

      setSelectedRows([]);
      // FIX: satu kali fetchData setelah semua selesai
      await fetchData();
    } catch (e) {
      alert("Gagal hapus: " + e.message);
    }
  };

  // ── Tambah manual ──────────────────────────────────────
  const handleAddManual = async () => {
    const id = addIdInput.trim().toUpperCase();
    if (!id) return;
    if (allData.some(d => d.id_atm === id)) {
      setAddError("ATM ini sudah ada dalam daftar."); return;
    }
    setAddLoading(true); setAddError("");
    try {
      const res = await apiFetch(`/api/predictions/${id}`);
      if (!res?.id_atm) throw new Error("ATM tidak ditemukan");
      await addCashplanAPI({
        id_atm: res.id_atm, lokasi: res.lokasi, wilayah: res.wilayah,
        tipe: res.tipe, saldo: res.saldo, limit: res.limit,
        pct_saldo: res.pct_saldo, status: res.status,
        tgl_isi: res.tgl_isi, jam_isi: res.jam_isi,
        est_jam: res.est_jam, skor_urgensi: res.skor_urgensi,
        denom: denomGlobal, added_by: "manual",
      });
      setAddIdInput(""); setShowAddModal(false);
      await fetchData();
    } catch (e) {
      setAddError(e.message || "ATM tidak ditemukan di sistem.");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Summary ────────────────────────────────────────────
  const totalBongkar   = allData.filter(d => (d.status || d.status_awal) === "BONGKAR").length;
  const totalAwas      = allData.filter(d => (d.status || d.status_awal) === "AWAS").length;
  const totalSelesai   = allData.filter(d => d.status_done === "SELESAI").length;
  const totalNominal   = filtered.reduce((s, d) => s + jumlahIsi(d.saldo, d.limit), 0);
  const doneBatalCount = allData.filter(d => d.status_done === "SELESAI" || d.status_done === "BATAL").length;

  // Data diperkaya untuk download CSV
  const enrichedForCsv = filtered.map(d => ({
    ...d,
    _denom:       getDenom(d.id_atm),
    _keterangan:  getKet(d.id_atm),
    _status_done: d.status_done || "PROSES",
  }));

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ color:"#e2e8f0", fontSize:24, fontWeight:700, margin:"0 0 4px", letterSpacing:"-0.02em" }}>
            Cash Plan — Penambahan Saldo ATM
          </h1>
          <p style={{ color:"#64748b", fontSize:13, margin:0 }}>
            {filterBulan} {nowTahun()} · ATM dengan saldo ≤30% limit ·{" "}
            {genAt ? `Prediksi: ${new Date(genAt).toLocaleString("id-ID")}` : "—"}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} style={selectStyle}>
            {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
          </select>
          <button onClick={() => setShowDlModal(true)} style={btnStyle("#a78bfa")}>↓ Download CSV</button>
          <button onClick={() => { setAddError(""); setShowAddModal(true); }} style={btnStyle("#00e5a0")}>+ Tambah Manual</button>
          <button onClick={fetchData} style={btnStyle("#3b82f6")}>↺ Refresh</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total ATM",      value:allData.length,      color:"#60a5fa", icon:"◈" },
          { label:"BONGKAR",        value:totalBongkar,        color:"#ff3b5c", icon:"⚠" },
          { label:"AWAS",           value:totalAwas,           color:"#f59e0b", icon:"⊕" },
          { label:"Selesai",        value:totalSelesai,        color:"#00e5a0", icon:"✓" },
          { label:"Est. Total Isi", value:fmtRp(totalNominal), color:"#a78bfa", icon:"◎", small:true },
        ].map(c => (
          <div key={c.label} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${c.color}28`, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:18, color:c.color, marginBottom:6 }}>{c.icon}</div>
            <div style={{ color:c.color, fontSize:c.small?14:26, fontWeight:700, lineHeight:1 }}>{c.value}</div>
            <div style={{ color:"#64748b", fontSize:10, marginTop:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Notif done/batal */}
      {doneBatalCount > 0 && (
        <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:10, padding:"12px 18px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:18, marginTop:1 }}>ℹ️</span>
          <div>
            <div style={{ color:"#93c5fd", fontWeight:700, fontSize:13, marginBottom:4 }}>
              {doneBatalCount} ATM sudah Selesai/Batal
            </div>
            <div style={{ color:"#94a3b8", fontSize:12 }}>
              Data akan <strong style={{ color:"#60a5fa" }}>otomatis hilang</strong> dari daftar ini setelah ada upload data baru dari Colab dan masuk ke <strong style={{ color:"#a78bfa" }}>Rekap Replacement</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input
          placeholder="Cari ID ATM / lokasi / wilayah..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
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
          <select
            value={denomGlobal}
            onChange={e => setDenomGlobal(Number(e.target.value))}
            style={{ ...selectStyle, border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa" }}>
            {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk action */}
      {selectedRows.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", marginBottom:10, background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:10, flexWrap:"wrap" }}>
          <span style={{ color:"#60a5fa", fontSize:13, fontWeight:600 }}>{selectedRows.length} ATM dipilih</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={handleBulkRemove} style={bulkBtn("#ff3b5c")}>✕ Hapus ({selectedRows.length})</button>
            <button onClick={() => setSelectedRows([])} style={bulkBtn("#64748b")}>Batal Pilih</button>
          </div>
        </div>
      )}

      {/* Table */}
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
                    { label:"No",             key:null },
                    { label:"Tgl Masuk",      key:"added_at" },
                    { label:"ID ATM",         key:"id_atm" },
                    { label:"Lokasi ATM",     key:"lokasi" },
                    { label:"Wilayah",        key:"wilayah" },
                    { label:"Tipe",           key:"tipe" },
                    { label:"Denom",          key:null },
                    { label:"Total Isi",      key:"saldo" },
                    { label:"Lembar",         key:null },
                    { label:"Saldo Terakhir", key:"saldo" },
                    { label:"Status",         key:"status" },
                    { label:"Keterangan",     key:null },
                    { label:"Aksi",           key:null },
                  ].map((col, ci) => (
                    <th
                      key={ci}
                      onClick={col.key ? () => toggleSort(col.key) : undefined}
                      style={{ padding:"11px 12px", textAlign:"left", color:col.key && sort.key===col.key ? "#60a5fa" : "#64748b", fontWeight:600, fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", cursor:col.key?"pointer":"default", whiteSpace:"nowrap", userSelect:"none" }}>
                      {col.label}
                      {col.key && sort.key===col.key && <span style={{ marginLeft:3, color:"#60a5fa" }}>{sort.dir>0?"↑":"↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((atm, i) => {
                  const rowNo     = page * PAGE_SIZE + i + 1;
                  const denom     = getDenom(atm.id_atm);
                  const totalIsiV = jumlahIsi(atm.saldo, atm.limit);
                  const ket       = getKet(atm.id_atm);
                  const statusDone = atm.status_done || null;
                  const isDone     = statusDone === "SELESAI" || statusDone === "BATAL";
                  const isSelected = selectedRows.includes(atm.id_atm);
                  const ss         = statusDone === "SELESAI" ? SELESAI_STYLE : statusDone === "BATAL" ? BATAL_STYLE : PROSES_STYLE;
                  const rowBg      = isSelected
                    ? "rgba(59,130,246,0.08)"
                    : isDone
                      ? "rgba(0,229,160,0.02)"
                      : (atm.status || atm.status_awal) === "BONGKAR"
                        ? "rgba(255,59,92,0.025)"
                        : "transparent";

                  return (
                    <tr
                      key={atm.id_atm}
                      style={{ background:rowBg, borderBottom:isSelected?"1px solid rgba(59,130,246,0.15)":"1px solid rgba(99,179,237,0.05)", transition:"all 0.1s" }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background="rgba(59,130,246,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background=rowBg; }}
                    >
                      <td style={{ padding:"8px 14px" }}>
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(atm.id_atm)} />
                      </td>
                      <td style={td("#64748b")}>{rowNo}</td>

                      {/* Tgl Masuk */}
                      <td style={{ padding:"8px 12px" }}>
                        {atm.added_at ? (
                          <div>
                            <div style={{ color:"#60a5fa", fontSize:11, fontWeight:600 }}>
                              {new Date(atm.added_at).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })}
                            </div>
                            <div style={{ color:"#475569", fontSize:10, marginTop:1 }}>
                              {new Date(atm.added_at).toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color:"#374151", fontSize:11 }}>—</span>
                        )}
                      </td>

                      {/* ID ATM */}
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span
                            style={{ color:"#e2e8f0", fontFamily:"monospace", fontWeight:700, cursor:"pointer", textDecoration:"underline dotted" }}
                            onClick={() => navigateTo?.("history", atm.id_atm)}>
                            {atm.id_atm}
                          </span>
                          {isDone && (
                            <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}>
                              {statusDone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ ...td("#94a3b8"), maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={atm.lokasi}>{atm.lokasi||"—"}</td>
                      <td style={td("#94a3b8")}>{atm.wilayah||"—"}</td>

                      {/* Tipe */}
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:atm.tipe==="CRM"?"rgba(167,139,250,0.15)":"rgba(96,165,250,0.12)", color:atm.tipe==="CRM"?"#a78bfa":"#60a5fa", border:atm.tipe==="CRM"?"1px solid rgba(167,139,250,0.3)":"1px solid rgba(96,165,250,0.25)" }}>
                          {atm.tipe||"—"}
                        </span>
                      </td>

                      {/* Denom */}
                      <td style={{ padding:"8px 10px" }}>
                        <select
                          value={denom}
                          onChange={e => setOverride(atm.id_atm, "denom", Number(e.target.value))}
                          style={{ background:"#0d1228", border:"1px solid rgba(167,139,250,0.25)", borderRadius:6, color:"#a78bfa", padding:"4px 6px", fontSize:11, cursor:"pointer", outline:"none" }}>
                          {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>

                      {/* Total Isi */}
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ color:"#f59e0b", fontWeight:600 }}>{fmtRp(totalIsiV)}</span>
                        <div style={{ color:"#64748b", fontSize:10, marginTop:1 }}>target: {fmtRp(atm.limit)}</div>
                      </td>

                      {/* Lembar */}
                      <td style={td("#94a3b8")}>{totalIsiV > 0 ? fmtLembar(totalIsiV, denom) : "—"}</td>

                      {/* Saldo */}
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ color:"#e2e8f0", fontWeight:600 }}>{fmtRp(atm.saldo)}</div>
                        <SaldoBar pct={atm.pct_saldo} />
                      </td>

                      {/* Status */}
                      <td style={{ padding:"8px 12px" }}>
                        {isDone ? (
                          <div style={{ fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:6, ...ss, textAlign:"center", border:`1px solid ${ss.border}`, display:"inline-block" }}>
                            {statusDone === "SELESAI" ? "✔ Selesai" : "✕ Batal"}
                          </div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                            <div style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:5, ...PROSES_STYLE, border:`1px solid ${PROSES_STYLE.border}`, textAlign:"center" }}>
                              ◎ Proses
                            </div>
                            <div style={{ display:"flex", gap:4 }}>
                              <button
                                onClick={() => handleUpdateStatus(atm, "SELESAI")}
                                style={{ flex:1, fontSize:10, fontWeight:700, padding:"3px 6px", borderRadius:5, background:"rgba(0,229,160,0.1)", color:"#00e5a0", border:"1px solid rgba(0,229,160,0.3)", cursor:"pointer" }}>✔</button>
                              <button
                                onClick={() => handleUpdateStatus(atm, "BATAL")}
                                style={{ flex:1, fontSize:10, fontWeight:700, padding:"3px 6px", borderRadius:5, background:"rgba(148,163,184,0.1)", color:"#94a3b8", border:"1px solid rgba(148,163,184,0.25)", cursor:"pointer" }}>✕</button>
                            </div>
                            <div style={{ color:"#374151", fontSize:9, textAlign:"center" }}>✔ selesai · ✕ batal</div>
                          </div>
                        )}
                      </td>

                      {/* Keterangan */}
                      <td style={{ padding:"8px 10px" }}>
                        <select
                          value={ket}
                          onChange={e => setOverride(atm.id_atm, "keterangan", e.target.value)}
                          style={{ background:"#0d1228", border:"1px solid rgba(99,179,237,0.15)", borderRadius:6, color:ket?"#e2e8f0":"#475569", padding:"5px 8px", fontSize:11, width:150, outline:"none", cursor:"pointer" }}>
                          <option value="">— pilih keterangan —</option>
                          {KET_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </td>

                      {/* Aksi */}
                      <td style={{ padding:"8px 10px" }}>
                        <button
                          onClick={() => handleRemove(atm)}
                          style={{ background:"rgba(255,59,92,0.08)", border:"1px solid rgba(255,59,92,0.25)", borderRadius:6, color:"#ff3b5c", padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {maxPage > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderTop:"1px solid rgba(99,179,237,0.08)" }}>
              <span style={{ color:"#64748b", fontSize:12 }}>Halaman {page+1} dari {maxPage} · {filtered.length} ATM</span>
              <div style={{ display:"flex", gap:6 }}>
                <PageBtn disabled={page===0}        onClick={() => setPage(p => p-1)}>← Prev</PageBtn>
                <PageBtn disabled={page>=maxPage-1} onClick={() => setPage(p => p+1)}>Next →</PageBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:20, marginTop:16, flexWrap:"wrap" }}>
        {[
          { label:"BONGKAR — saldo ≤ 20% limit",                  color:"#ff3b5c" },
          { label:"AWAS — saldo 20–30% limit",                    color:"#f59e0b" },
          { label:"Remove ATM ≤25% diblokir (wajib isi dulu)",    color:"#f59e0b" },
          { label:"Selesai/Batal → masuk Rekap saat upload baru", color:"#00e5a0" },
        ].map(l => (
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:l.color }} />
            <span style={{ color:"#64748b", fontSize:11 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Modal Download CSV */}
      {showDlModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#0d1228", border:"1px solid rgba(99,179,237,0.2)", borderRadius:16, padding:"28px 32px", width:440, boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ color:"#e2e8f0", fontSize:18, fontWeight:700, margin:0 }}>Download CSV Cash Plan</h2>
              <button onClick={() => setShowDlModal(false)} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>×</button>
            </div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>
              Pilih wilayah. File akan didownload ke browser, lalu pindahkan manual ke:
              <div style={{ marginTop:8, padding:"6px 12px", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:6, color:"#a78bfa", fontFamily:"monospace", fontSize:12 }}>
                {SAVE_PATH}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {["Semua","PEKANBARU","BATAM","DUMAI","Tanjung Pinang"].map(w => {
                const cnt = w === "Semua"
                  ? enrichedForCsv.length
                  : enrichedForCsv.filter(d => d.wilayah?.toUpperCase() === w.toUpperCase()).length;
                return (
                  <button
                    key={w}
                    onClick={() => downloadCSVPerWilayah(enrichedForCsv, w, filterBulan, nowTahun())}
                    disabled={cnt === 0}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderRadius:8, background:cnt===0?"rgba(255,255,255,0.02)":"rgba(167,139,250,0.08)", border:`1px solid ${cnt===0?"rgba(99,179,237,0.1)":"rgba(167,139,250,0.25)"}`, color:cnt===0?"#374151":"#a78bfa", cursor:cnt===0?"not-allowed":"pointer", fontSize:13, fontWeight:600 }}>
                    <span>📥 {w === "Semua" ? "Semua Wilayah" : w}</span>
                    <span style={{ fontSize:12, fontWeight:400, color:cnt===0?"#374151":"#64748b" }}>{cnt} ATM</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowDlModal(false)} style={{ marginTop:16, width:"100%", padding:"10px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.12)", color:"#64748b", cursor:"pointer", fontSize:13 }}>Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Tambah Manual */}
      {showAddModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#0d1228", border:"1px solid rgba(99,179,237,0.2)", borderRadius:16, padding:"28px 32px", width:420, boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ color:"#e2e8f0", fontSize:18, fontWeight:700, margin:0 }}>Tambah ATM Manual</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(""); setAddIdInput(""); }} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>×</button>
            </div>
            <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:6 }}>ID ATM</label>
            <input
              value={addIdInput}
              onChange={e => { setAddIdInput(e.target.value.toUpperCase()); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAddManual()}
              placeholder="Contoh: CRM10101 atau EMV82901"
              autoFocus
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(99,179,237,0.2)", borderRadius:8, color:"#e2e8f0", padding:"10px 14px", fontSize:14, width:"100%", outline:"none", boxSizing:"border-box", fontFamily:"monospace" }}
            />
            {addError && (
              <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(255,59,92,0.08)", border:"1px solid rgba(255,59,92,0.25)", borderRadius:8, color:"#ff3b5c", fontSize:12 }}>
                ⚠ {addError}
              </div>
            )}
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button
                onClick={handleAddManual}
                disabled={addLoading || !addIdInput.trim()}
                style={{ flex:1, background:addLoading||!addIdInput.trim()?"rgba(0,229,160,0.05)":"rgba(0,229,160,0.15)", border:"1px solid rgba(0,229,160,0.3)", borderRadius:8, color:"#00e5a0", padding:"10px 0", fontSize:13, fontWeight:700, cursor:addLoading||!addIdInput.trim()?"not-allowed":"pointer" }}>
                {addLoading ? "Menyimpan..." : "+ Tambahkan"}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); setAddIdInput(""); }}
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.12)", borderRadius:8, color:"#64748b", padding:"10px 18px", fontSize:13, cursor:"pointer" }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{ width:16, height:16, borderRadius:4, cursor:"pointer", border:checked||indeterminate?"2px solid #3b82f6":"2px solid rgba(99,179,237,0.3)", background:checked?"#3b82f6":indeterminate?"rgba(59,130,246,0.3)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {indeterminate && !checked && <div style={{ width:8, height:2, background:"#60a5fa", borderRadius:1 }} />}
    </div>
  );
}

function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#ff3b5c" : pct <= 30 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
      <div style={{ width:50, height:3, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
        <div style={{ height:"100%", width:`${Math.min(pct||0,100)}%`, background:color, borderRadius:2 }} />
      </div>
      <span style={{ color, fontSize:10, fontWeight:700 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:280, gap:12, background:"rgba(0,229,160,0.03)", border:"1px solid rgba(0,229,160,0.1)", borderRadius:12 }}>
      <span style={{ fontSize:36 }}>✓</span>
      <span style={{ color:"#00e5a0", fontWeight:600, fontSize:16 }}>Semua ATM Dalam Kondisi Aman</span>
      <span style={{ color:"#64748b", fontSize:13 }}>Tidak ada ATM dengan status AWAS atau BONGKAR</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:12, color:"#64748b" }}>
      <div style={{ width:32, height:32, border:"2px solid rgba(59,130,246,0.2)", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span>Memuat data Cash Plan...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background:disabled?"transparent":"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:6, color:disabled?"#374151":"#60a5fa", padding:"5px 12px", fontSize:12, cursor:disabled?"default":"pointer" }}>
      {children}
    </button>
  );
}

const selectStyle = { background:"#0d1228", border:"1px solid rgba(99,179,237,0.15)", borderRadius:8, color:"#94a3b8", padding:"8px 12px", fontSize:13, cursor:"pointer", outline:"none" };
const td          = color => ({ padding:"8px 12px", color, whiteSpace:"nowrap" });
const btnStyle    = accent => ({ background:`${accent}18`, border:`1px solid ${accent}44`, borderRadius:8, color:accent, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:600 });
const bulkBtn     = accent => ({ background:`${accent}15`, border:`1px solid ${accent}40`, borderRadius:7, color:accent, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" });