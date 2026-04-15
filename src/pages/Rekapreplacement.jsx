// src/pages/RekapReplacement.jsx
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { getRekapReplacementAPI, updateRekapAPI } from "../utils/api";

const BULAN_ID      = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const WILAYAH_LIST  = ["Semua", "Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"];
const DENOM_OPTIONS = [{ label:"Rp 50.000", value:50_000 }, { label:"Rp 100.000", value:100_000 }];

const fmtRp    = v => v == null || isNaN(v) ? "—" : "Rp " + Number(v).toLocaleString("id-ID");
const nowBulan = () => BULAN_ID[new Date().getMonth()];
const nowTahun = () => new Date().getFullYear();
const hitungJumlahIsi = (limit) => limit || 0;
const hitungLembar    = (jumlah, denom) => (!jumlah || !denom) ? 0 : Math.ceil(jumlah / denom);

// ── Export XLSX ─────────────────────────────────────────────
function exportToXLSX(data, overrides, bulan, tahun, wilayah) {
  const rows = wilayah === "Semua"
    ? data
    : data.filter(d => d.wilayah?.toLowerCase() === wilayah.toLowerCase());

  const sheetData = rows.map((item, i) => {
    const ov        = overrides[item.id] || {};
    const denom     = item.is_saved ? (item.denom || 100_000) : (ov.denom ?? 100_000);
    const jumlahIsi = hitungJumlahIsi(item.limit);
    const lembar    = hitungLembar(jumlahIsi, denom);
    const tglIsi    = item.is_saved ? (item.tgl_isi || "-")      : (ov.tgl_isi      || item.tgl_isi      || "-");
    const cashIn    = item.is_saved ? (item.jam_cash_in || "-")  : (ov.jam_cash_in  || item.jam_cash_in  || "-");
    const cashOut   = item.is_saved ? (item.jam_cash_out || "-") : (ov.jam_cash_out || item.jam_cash_out || "-");
    return {
      "No":                i + 1,
      "Done At":           item.done_at ? new Date(item.done_at).toLocaleString("id-ID", { dateStyle:"medium", timeStyle:"short" }) : "-",
      "Bulan":             item.bulan || bulan,
      "Tahun":             item.tahun || tahun,
      "ID ATM":            item.id_atm || "-",
      "Lokasi":            item.lokasi || "-",
      "Wilayah":           item.wilayah || "-",
      "Tipe":              item.tipe || "-",
      "Saldo Akhir (Rp)":  item.saldo_awal || 0,
      "Jumlah Isi (Rp)":   jumlahIsi,
      "Denominasi":        `Rp ${Number(denom).toLocaleString("id-ID")}`,
      "Lembar":            lembar,
      "Tanggal Isi":       tglIsi,
      "Jam Cash In":       cashIn,
      "Jam Cash Out":      cashOut,
      "Status Cash Plan":  item.status_done || "-",
      "Keterangan":        item.keterangan || "-",
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);

  // Lebar kolom
  ws["!cols"] = [
    {wch:5}, {wch:20}, {wch:12}, {wch:8},
    {wch:14}, {wch:30}, {wch:16}, {wch:8},
    {wch:18}, {wch:18}, {wch:14}, {wch:8},
    {wch:14}, {wch:14}, {wch:14},
    {wch:18}, {wch:22},
  ];

  const sheetName = `Rekap_${wilayah === "Semua" ? "Semua" : wilayah}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const now   = new Date();
  const tglDl = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const fn    = `RekapReplacement_${wilayah === "Semua" ? "Semua_Wilayah" : wilayah}_${bulan}_${tahun}_dl${tglDl}.xlsx`;
  XLSX.writeFile(wb, fn);
}

// ════════════════════════════════════════════════════════════
export default function RekapReplacement({ navigateTo }) {
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterWilayah, setFilterWilayah] = useState("Semua");
  const [filterBulan,   setFilterBulan]   = useState(nowBulan());
  const [filterTipe,    setFilterTipe]    = useState("Semua");
  const [filterStatus,  setFilterStatus]  = useState("Semua");
  const [search,        setSearch]        = useState("");
  const [sort,          setSort]          = useState({ key:"done_at", dir:-1 });
  const [page,          setPage]          = useState(0);
  const [savingId,      setSavingId]      = useState(null);
  const [showDlModal,   setShowDlModal]   = useState(false);

  const [overrides, setOverrides] = useState({});
  const setOv = (id, field, val) =>
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const PAGE_SIZE = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await getRekapReplacementAPI({
        bulan:   filterBulan,
        tahun:   nowTahun(),
        wilayah: filterWilayah !== "Semua" ? filterWilayah : undefined,
      });
      setItems(resp.data || []);
    } catch (e) {
      console.error("Rekap fetch error:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterBulan, filterWilayah]);

  // ── Simpan ke DB ───────────────────────────────────────
  const handleSave = async (item) => {
    setSavingId(item.id);
    const ov = overrides[item.id] || {};
    try {
      await updateRekapAPI(item.id, {
        tgl_isi:      ov.tgl_isi      ?? item.tgl_isi      ?? null,
        jam_cash_in:  ov.jam_cash_in  ?? item.jam_cash_in  ?? null,
        jam_cash_out: ov.jam_cash_out ?? item.jam_cash_out ?? null,
        denom:        ov.denom        ?? item.denom        ?? 100_000,
      });
      setItems(prev => prev.map(d => d.id === item.id
        ? { ...d, is_saved:true, tgl_isi:ov.tgl_isi??d.tgl_isi, jam_cash_in:ov.jam_cash_in??d.jam_cash_in, jam_cash_out:ov.jam_cash_out??d.jam_cash_out, denom:ov.denom??d.denom }
        : d
      ));
    } catch (e) {
      alert("Gagal menyimpan: " + e.message);
    } finally {
      setSavingId(null);
    }
  };

  // ── Filter + sort ──────────────────────────────────────
  const filtered = useMemo(() => {
    let d = items;
    if (filterTipe   !== "Semua") d = d.filter(r => r.tipe === filterTipe);
    if (filterStatus !== "Semua") d = d.filter(r => (r.status_done||"").toUpperCase() === filterStatus.toUpperCase());
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r => r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q) || r.wilayah?.toLowerCase().includes(q));
    }
    return [...d].sort((a, b) => {
      const va = a[sort.key] ?? "", vb = b[sort.key] ?? "";
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [items, filterTipe, filterStatus, search, sort]);

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE);
  const toggleSort = key => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(0); };

  // ── Summary ────────────────────────────────────────────
  const totalNominal = filtered.reduce((s, d) => s + hitungJumlahIsi(d.limit), 0);
  const totalLembar  = filtered.reduce((s, d) => {
    const denom = overrides[d.id]?.denom ?? d.denom ?? 100_000;
    return s + hitungLembar(hitungJumlahIsi(d.limit), denom);
  }, 0);
  const totalSelesai = filtered.filter(d => (d.status_done||"").toUpperCase() === "SELESAI").length;
  const totalBatal   = filtered.filter(d => (d.status_done||"").toUpperCase() === "BATAL").length;
  const totalSaved   = filtered.filter(d => d.is_saved).length;

  const byWilayah = WILAYAH_LIST.slice(1).map(w => ({
    wilayah: w,
    count:   items.filter(d => d.wilayah?.toLowerCase() === w.toLowerCase()).length,
    nominal: items.filter(d => d.wilayah?.toLowerCase() === w.toLowerCase()).reduce((s,d) => s+hitungJumlahIsi(d.limit), 0),
  })).filter(w => w.count > 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ color:"#e2e8f0", fontSize:24, fontWeight:700, margin:"0 0 4px", letterSpacing:"-0.02em" }}>
            Rekap Replacement ATM
          </h1>
          <p style={{ color:"#64748b", fontSize:13, margin:0 }}>
            ATM yang sudah diubah status di Cash Plan ·{" "}
            <span style={{ color:"#00e5a0" }}>{items.length} rekap</span> bulan ini ·{" "}
            <span style={{ color:"#60a5fa" }}>{totalSaved} sudah disimpan</span>
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} style={selectStyle}>
            {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
          </select>
          <button
            onClick={() => setShowDlModal(true)}
            disabled={filtered.length === 0}
            style={{ background:filtered.length===0?"rgba(167,139,250,0.04)":"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.35)", borderRadius:8, color:"#a78bfa", padding:"8px 16px", fontSize:13, cursor:filtered.length===0?"not-allowed":"pointer", fontWeight:600, opacity:filtered.length===0?0.5:1 }}>
            ↓ Download Excel
          </button>
          <button onClick={fetchData} style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:8, color:"#60a5fa", padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:600 }}>↺ Refresh</button>
          <button onClick={() => navigateTo?.("cashplan")} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(99,179,237,0.15)", borderRadius:8, color:"#64748b", padding:"8px 16px", fontSize:13, cursor:"pointer" }}>← Cash Plan</button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:10, padding:"12px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:18 }}>ℹ</span>
        <div style={{ color:"#94a3b8", fontSize:12 }}>
          Isi <strong style={{ color:"#60a5fa" }}>Tanggal Isi</strong>, <strong style={{ color:"#a78bfa" }}>Jam Cash In</strong>, dan <strong style={{ color:"#f59e0b" }}>Jam Cash Out</strong> lalu klik <strong style={{ color:"#00e5a0" }}>Simpan</strong>.
          Setelah disimpan, baris tidak bisa diedit lagi. Jumlah Isi = <strong style={{ color:"#a78bfa" }}>Limit ATM (100%)</strong>.
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Rekap",    value:filtered.length,                             color:"#00e5a0", icon:"✓" },
          { label:"Selesai",        value:totalSelesai,                                color:"#00e5a0", icon:"✔" },
          { label:"Batal",          value:totalBatal,                                  color:"#94a3b8", icon:"✕" },
          { label:"Sudah Disimpan", value:totalSaved,                                  color:"#60a5fa", icon:"💾" },
          { label:"Total Nominal",  value:fmtRp(totalNominal),                         color:"#a78bfa", icon:"◎", small:true },
          { label:"Total Lembar",   value:`${totalLembar.toLocaleString("id-ID")} lbr`, color:"#f59e0b", icon:"◈", small:true },
        ].map(c => (
          <div key={c.label} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${c.color}28`, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:18, color:c.color, marginBottom:6 }}>{c.icon}</div>
            <div style={{ color:c.color, fontSize:c.small?12:22, fontWeight:700, lineHeight:1 }}>{c.value}</div>
            <div style={{ color:"#64748b", fontSize:10, marginTop:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Per Wilayah */}
      {byWilayah.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          {byWilayah.map(w => (
            <div key={w.wilayah} style={{ background:"rgba(0,229,160,0.04)", border:"1px solid rgba(0,229,160,0.15)", borderRadius:8, padding:"10px 16px", minWidth:150 }}>
              <div style={{ color:"#94a3b8", fontSize:11, fontWeight:600 }}>{w.wilayah}</div>
              <div style={{ color:"#00e5a0", fontSize:18, fontWeight:700, marginTop:4 }}>{w.count} ATM</div>
              <div style={{ color:"#64748b", fontSize:11, marginTop:2 }}>{fmtRp(w.nominal)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="Cari ID ATM / lokasi..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(99,179,237,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:13, width:220, outline:"none" }} />
        <select value={filterWilayah} onChange={e => setFilterWilayah(e.target.value)} style={selectStyle}>
          {WILAYAH_LIST.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={filterTipe} onChange={e => setFilterTipe(e.target.value)} style={selectStyle}>
          {["Semua","EMV","CRM"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          {["Semua","SELESAI","BATAL"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color:"#475569", fontSize:12, marginLeft:"auto" }}>{filtered.length} data</span>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState filterBulan={filterBulan} /> : (
        <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(99,179,237,0.08)", borderRadius:12, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(99,179,237,0.12)", background:"rgba(255,255,255,0.02)" }}>
                  {[
                    {label:"No",key:null},{label:"Done At",key:"done_at"},{label:"Bulan",key:"bulan"},
                    {label:"ID ATM",key:"id_atm"},{label:"Lokasi",key:"lokasi"},{label:"Wilayah",key:"wilayah"},
                    {label:"Tipe",key:"tipe"},{label:"Saldo Akhir",key:"saldo_awal"},{label:"Jumlah Isi",key:"limit"},
                    {label:"Denom",key:null},{label:"Lembar",key:null},{label:"Tanggal Isi",key:"tgl_isi"},
                    {label:"Jam Cash In",key:null},{label:"Jam Cash Out",key:null},
                    {label:"Status",key:"status_done"},{label:"Keterangan",key:null},{label:"Aksi",key:null},
                  ].map((col, ci) => (
                    <th key={ci} onClick={col.key ? () => toggleSort(col.key) : undefined}
                      style={{ padding:"11px 12px", textAlign:"left", color:col.key&&sort.key===col.key?"#60a5fa":"#64748b", fontWeight:600, fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", cursor:col.key?"pointer":"default", whiteSpace:"nowrap", userSelect:"none" }}>
                      {col.label}
                      {col.key && sort.key===col.key && <span style={{ marginLeft:3 }}>{sort.dir>0?"↑":"↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((item, i) => {
                  const ov       = overrides[item.id] || {};
                  const saved    = item.is_saved;
                  const isSaving = savingId === item.id;
                  const denom    = saved ? (item.denom||100_000)          : (ov.denom      ?? item.denom      ?? 100_000);
                  const jumlahIsi = hitungJumlahIsi(item.limit);
                  const lembar   = hitungLembar(jumlahIsi, denom);
                  const tglIsi   = saved ? (item.tgl_isi||"")             : (ov.tgl_isi      ?? item.tgl_isi      ?? "");
                  const cashIn   = saved ? (item.jam_cash_in||"")         : (ov.jam_cash_in  ?? item.jam_cash_in  ?? "");
                  const cashOut  = saved ? (item.jam_cash_out||"")        : (ov.jam_cash_out ?? item.jam_cash_out ?? "");
                  const statusCP = (item.status_done||"PROSES").toUpperCase();
                  const ssColor  = statusCP==="SELESAI"?"#00e5a0":statusCP==="BATAL"?"#94a3b8":"#f59e0b";
                  const ssBg     = statusCP==="SELESAI"?"rgba(0,229,160,0.1)":statusCP==="BATAL"?"rgba(148,163,184,0.08)":"rgba(245,158,11,0.1)";
                  const rowBg    = saved?"rgba(0,229,160,0.02)":i%2===0?"transparent":"rgba(255,255,255,0.01)";

                  const inputSt = (hasVal) => ({
                    background: saved?"rgba(255,255,255,0.02)":"#0d1228",
                    border:`1px solid ${saved?"rgba(99,179,237,0.06)":hasVal?"rgba(96,165,250,0.35)":"rgba(96,165,250,0.2)"}`,
                    borderRadius:6, color:saved?"#475569":hasVal?"#60a5fa":"#475569",
                    padding:"4px 8px", fontSize:11, outline:"none",
                    cursor:saved?"not-allowed":"pointer",
                    pointerEvents:saved?"none":"auto",
                  });

                  return (
                    <tr key={item.id}
                      style={{ background:rowBg, borderBottom:"1px solid rgba(99,179,237,0.05)", transition:"background 0.1s" }}
                      onMouseEnter={e => !saved && (e.currentTarget.style.background="rgba(0,229,160,0.04)")}
                      onMouseLeave={e => e.currentTarget.style.background=rowBg}>

                      <td style={tdS("#64748b")}>{page*PAGE_SIZE+i+1}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ color:"#00e5a0", fontSize:11, fontWeight:600 }}>
                          {item.done_at ? new Date(item.done_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}) : "—"}
                        </div>
                      </td>
                      <td style={tdS("#94a3b8")}>{item.bulan||filterBulan}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ color:"#e2e8f0", fontFamily:"monospace", fontWeight:700, cursor:"pointer", textDecoration:"underline dotted" }}
                          onClick={() => navigateTo?.("history", item.id_atm)}>{item.id_atm}</span>
                        {saved && <span style={{ marginLeft:6, fontSize:9, padding:"1px 5px", borderRadius:3, background:"rgba(0,229,160,0.1)", color:"#00e5a0", border:"1px solid rgba(0,229,160,0.2)" }}>SAVED</span>}
                      </td>
                      <td style={{ ...tdS("#94a3b8"), maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={item.lokasi}>{item.lokasi||"—"}</td>
                      <td style={tdS("#94a3b8")}>{item.wilayah||"—"}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:item.tipe==="CRM"?"rgba(167,139,250,0.15)":"rgba(96,165,250,0.12)", color:item.tipe==="CRM"?"#a78bfa":"#60a5fa" }}>
                          {item.tipe||"—"}
                        </span>
                      </td>
                      <td style={tdS("#e2e8f0")}>{fmtRp(item.saldo_awal)}</td>
                      <td style={{ padding:"8px 12px" }}><span style={{ color:"#f59e0b", fontWeight:700 }}>{fmtRp(jumlahIsi)}</span></td>
                      <td style={{ padding:"8px 10px" }}>
                        <select value={denom} onChange={e => !saved && setOv(item.id,"denom",Number(e.target.value))} disabled={saved}
                          style={{ background:saved?"rgba(255,255,255,0.02)":"#0d1228", border:`1px solid ${saved?"rgba(99,179,237,0.06)":"rgba(167,139,250,0.25)"}`, borderRadius:6, color:saved?"#475569":"#a78bfa", padding:"4px 6px", fontSize:11, cursor:saved?"not-allowed":"pointer", outline:"none" }}>
                          {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:"8px 12px" }}><span style={{ color:"#60a5fa", fontWeight:600 }}>{lembar ? `${lembar.toLocaleString()} lbr` : "—"}</span></td>
                      <td style={{ padding:"8px 10px" }}>
                        <input type="date" value={tglIsi} onChange={e => !saved && setOv(item.id,"tgl_isi",e.target.value)} style={inputSt(!!tglIsi)} />
                      </td>
                      <td style={{ padding:"8px 10px" }}>
                        <input type="time" value={cashIn} onChange={e => !saved && setOv(item.id,"jam_cash_in",e.target.value)} style={{ ...inputSt(!!cashIn), width:90 }} />
                      </td>
                      <td style={{ padding:"8px 10px" }}>
                        <input type="time" value={cashOut} onChange={e => !saved && setOv(item.id,"jam_cash_out",e.target.value)} style={{ ...inputSt(!!cashOut), width:90 }} />
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:5, background:ssBg, color:ssColor, border:`1px solid ${ssColor}33` }}>
                          {statusCP==="SELESAI"?"✔ Selesai":statusCP==="BATAL"?"✕ Batal":"◎ Proses"}
                        </span>
                      </td>
                      <td style={{ ...tdS("#64748b"), maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>
                        {item.keterangan || <span style={{ color:"#374151" }}>—</span>}
                      </td>
                      <td style={{ padding:"8px 10px" }}>
                        {saved ? (
                          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:"#00e5a0" }}>
                            <span>✓</span><span>Tersimpan</span>
                          </div>
                        ) : (
                          <button onClick={() => handleSave(item)} disabled={isSaving}
                            style={{ background:isSaving?"rgba(0,229,160,0.05)":"rgba(0,229,160,0.12)", border:"1px solid rgba(0,229,160,0.35)", borderRadius:6, color:"#00e5a0", padding:"5px 12px", fontSize:11, fontWeight:700, cursor:isSaving?"not-allowed":"pointer", whiteSpace:"nowrap" }}>
                            {isSaving ? "Menyimpan..." : "💾 Simpan"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {maxPage > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderTop:"1px solid rgba(99,179,237,0.08)" }}>
              <span style={{ color:"#64748b", fontSize:12 }}>Halaman {page+1} dari {maxPage} · {filtered.length} rekap</span>
              <div style={{ display:"flex", gap:6 }}>
                <PageBtn disabled={page===0}        onClick={() => setPage(p => p-1)}>← Prev</PageBtn>
                <PageBtn disabled={page>=maxPage-1} onClick={() => setPage(p => p+1)}>Next →</PageBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer legend */}
      <div style={{ marginTop:16, display:"flex", gap:20, flexWrap:"wrap" }}>
        {[
          {label:"★ Jumlah Isi = Limit ATM (target 100%)",         color:"#f59e0b"},
          {label:"Jam Cash In/Out diisi manual lalu klik Simpan",  color:"#a78bfa"},
          {label:"Setelah disimpan, baris tidak bisa diedit lagi", color:"#00e5a0"},
          {label:"Export Excel tersedia per wilayah",               color:"#60a5fa"},
        ].map(l => (
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:l.color }} />
            <span style={{ color:"#64748b", fontSize:11 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ══ MODAL DOWNLOAD EXCEL ══════════════════════════════════════════ */}
      {showDlModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#0d1228", border:"1px solid rgba(167,139,250,0.25)", borderRadius:16, padding:"28px 32px", width:440, boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ color:"#e2e8f0", fontSize:18, fontWeight:700, margin:0 }}>📊 Download Excel Rekap</h2>
              <button onClick={() => setShowDlModal(false)} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>×</button>
            </div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>
              Pilih wilayah untuk di-export ke file <strong style={{ color:"#a78bfa" }}>.xlsx</strong>.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {["Semua", "Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"].map(w => {
                const cnt = w === "Semua"
                  ? filtered.length
                  : filtered.filter(d => d.wilayah?.toLowerCase() === w.toLowerCase()).length;
                return (
                  <button key={w}
                    onClick={() => { exportToXLSX(filtered, overrides, filterBulan, nowTahun(), w); setShowDlModal(false); }}
                    disabled={cnt === 0}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderRadius:8, background:cnt===0?"rgba(255,255,255,0.02)":"rgba(167,139,250,0.08)", border:`1px solid ${cnt===0?"rgba(99,179,237,0.1)":"rgba(167,139,250,0.25)"}`, color:cnt===0?"#374151":"#a78bfa", cursor:cnt===0?"not-allowed":"pointer", fontSize:13, fontWeight:600 }}>
                    <span>📥 {w === "Semua" ? "Semua Wilayah" : w}</span>
                    <span style={{ fontSize:12, fontWeight:400, color:cnt===0?"#374151":"#64748b" }}>{cnt} rekap · .xlsx</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowDlModal(false)} style={{ marginTop:16, width:"100%", padding:"10px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.12)", color:"#64748b", cursor:"pointer", fontSize:13 }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────
function EmptyState({ filterBulan }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:280, gap:12, background:"rgba(59,130,246,0.03)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:12 }}>
      <span style={{ fontSize:36 }}>📋</span>
      <span style={{ color:"#94a3b8", fontWeight:600, fontSize:16 }}>Belum Ada Rekap — {filterBulan}</span>
      <span style={{ color:"#64748b", fontSize:13, textAlign:"center", maxWidth:400 }}>
        ATM yang sudah ditandai <strong style={{ color:"#00e5a0" }}>Selesai</strong> atau <strong style={{ color:"#94a3b8" }}>Batal</strong> di Cash Plan akan muncul di sini.
      </span>
    </div>
  );
}
function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, flexDirection:"column", gap:12, color:"#64748b" }}>
      <div style={{ width:28, height:28, border:"2px solid rgba(59,130,246,0.2)", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span>Memuat rekap...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:disabled?"transparent":"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:6, color:disabled?"#374151":"#60a5fa", padding:"5px 12px", fontSize:12, cursor:disabled?"default":"pointer" }}>
      {children}
    </button>
  );
}
const selectStyle = { background:"#0d1228", border:"1px solid rgba(99,179,237,0.15)", borderRadius:8, color:"#94a3b8", padding:"8px 12px", fontSize:13, cursor:"pointer", outline:"none" };
const tdS = color => ({ padding:"8px 12px", color, whiteSpace:"nowrap" });