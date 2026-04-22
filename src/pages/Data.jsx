// src/pages/Wilayah.jsx  →  Master ATM (CRUD)
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env?.VITE_API_URL || "";

async function masterFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    // detail bisa string atau object (dari _raise500)
    const msg = typeof err.detail === "object"
      ? `[${err.detail.type}] ${err.detail.error}`
      : (err.detail || `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json();
}

// ── Column definitions — nama key HARUS sama dengan kolom DB ─
const MASTER_COLS = [
  { key: "id_atm",            label: "ID ATM",                type: "text",     required: true,  group: "Identitas" },
  { key: "kode_cabang",       label: "Kode Cabang",           type: "number",   required: false, group: "Identitas" },
  { key: "merk_atm",          label: "Merk ATM",              type: "text",     required: false, group: "Identitas" },
  { key: "lokasi_atm",        label: "Lokasi ATM",            type: "text",     required: false, group: "Identitas" },
  { key: "sn",                label: "Serial Number",         type: "text",     required: false, group: "Identitas" },
  { key: "denom_options",     label: "Denom",                 type: "text",     required: false, group: "Identitas", placeholder: "50000,100000" },
  { key: "join",              label: "Join Date",             type: "number",   required: false, group: "Identitas" },  // ← "join" bukan "join_date"
  { key: "limit",             label: "Limit (Rp)",            type: "number",   required: false, group: "Keuangan" },
  { key: "pct_saldo",         label: "Persentase (%)",        type: "number",   required: false, group: "Keuangan" },
  { key: "wilayah",           label: "Wilayah",               type: "text",     required: false, group: "Lokasi" },
  { key: "alamat_atm",        label: "Alamat ATM",            type: "textarea", required: false, group: "Lokasi" },
  { key: "tipe_mesin",        label: "Tipe Mesin",            type: "text",     required: false, group: "Mesin" },
  { key: "off_on_bank",       label: "Off/On Bank",           type: "text",     required: false, group: "Mesin" },
  { key: "status_pemilik",    label: "Status Pemilik",        type: "text",     required: false, group: "Mesin" },
  { key: "nama_vendor",       label: "Nama Vendor",           type: "text",     required: false, group: "Vendor" },
  { key: "maintenance",       label: "Maintenance",           type: "text",     required: false, group: "Vendor" },
  { key: "vendor_maintenance",label: "Vendor Maintenance",    type: "text",     required: false, group: "Vendor" },
  { key: "last_maintenance",  label: "Jadwal Terakhir",       type: "text",     required: false, group: "Jadwal & CIT" },  // ← "last_maintenance" bukan "jadwal_terakhir"
  { key: "cit_mulai",         label: "Periode CIT/CIS Mulai", type: "text",     required: false, group: "Jadwal & CIT" },
  { key: "cit_akhir",         label: "Periode CIT/CIS Akhir", type: "text",     required: false, group: "Jadwal & CIT" },
  { key: "sisa_hari",         label: "Sisa Waktu (Hari)",     type: "text",     required: false, group: "Jadwal & CIT" },  // text di DB
  { key: "nama_asuransi",     label: "Nama Asuransi",         type: "text",     required: false, group: "Jaringan & Asuransi" },
  { key: "link_komunikasi",   label: "Link Komunikasi",       type: "text",     required: false, group: "Jaringan & Asuransi" },
  { key: "bw",                label: "BW",                    type: "text",     required: false, group: "Jaringan & Asuransi" },
  { key: "media",             label: "Media",                 type: "text",     required: false, group: "Jaringan & Asuransi" },
  { key: "isp",               label: "ISP",                   type: "text",     required: false, group: "Jaringan & Asuransi" },
  { key: "no_inventaris",     label: "No. Inventaris",        type: "text",     required: false, group: "Inventaris" },
  { key: "nilai_inventaris",  label: "Nilai Inventaris (Rp)", type: "text",     required: false, group: "Inventaris" },  // text di DB
  { key: "unit_pengisian",    label: "Unit Pengisian",        type: "text",     required: false, group: "Inventaris" },
  { key: "is_vendor",         label: "Is Vendor",             type: "number",   required: false, group: "Inventaris", placeholder: "0 atau 1" },
  { key: "lembar",            label: "Lembar",                type: "text",     required: false, group: "Inventaris" },
  { key: "is_tms",            label: "Is TMS",                type: "text",     required: false, group: "Inventaris" },
  { key: "no",                label: "No",                    type: "number",   required: false, group: "Inventaris" },
  { key: "nomor",             label: "Nomor",                 type: "number",   required: false, group: "Inventaris" },
];

const TABLE_COLS = [
  { key: "id_atm",        label: "ID ATM" },
  { key: "kode_cabang",     label: "Kode Cabang" },
  { key: "merk_atm",      label: "Merk" },
  { key: "lokasi_atm",    label: "Lokasi" },
  { key: "wilayah",       label: "Wilayah" },
  { key: "tipe_mesin",    label: "Tipe" },
  { key: "denom_options", label: "Denom" },
  { key: "limit",         label: "Limit" },
  { key: "off_on_bank",   label: "OFF ON BANK" },
  { key: "unit_pengisian",   label: "Unit Pengisian" },
  
];

const EMPTY_FORM = Object.fromEntries(MASTER_COLS.map(c => [c.key, ""]));

// ── Styles ────────────────────────────────────────────────────
const S = {
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(99,179,237,0.18)",
    borderRadius: 7, color: "#e2e8f0",
    padding: "7px 11px", fontSize: 12, outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  },
  label: {
    color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4,
    display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
  },
  btn: (color = "#3b82f6") => ({
    background: `${color}22`, border: `1px solid ${color}55`,
    color, borderRadius: 7, padding: "7px 14px",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    transition: "all 0.15s", fontFamily: "inherit",
  }),
};

const thSt = {
  padding: "10px 12px", color: "#64748b", fontWeight: 600,
  textAlign: "left", whiteSpace: "nowrap",
  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
};
const tdSt = (color = "#94a3b8") => ({ padding: "9px 12px", color });

// ════════════════════════════════════════════════════════════
export default function Wilayah() {
  const [rows,        setRows]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterWil,   setFilterWil]   = useState("");
  const [page,        setPage]        = useState(1);
  const [wilayahOpts, setWilayahOpts] = useState([]);
  const [modal,       setModal]       = useState(null);
  const [editData,    setEditData]    = useState(null);
  const [toast,       setToast]       = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
      if (search)    p.set("search",  search);
      if (filterWil) p.set("wilayah", filterWil);
      const r = await masterFetch(`/api/atm-masters?${p}`);
      setRows(r.data || []);
      setTotal(r.total || 0);
      if (r.wilayah_options) setWilayahOpts(r.wilayah_options);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterWil]);

  useEffect(() => { load(); }, [load]);

  const timer = useRef(null);
  const onSearchInput = v => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 380);
  };

  const openAdd  = ()  => { setEditData({ ...EMPTY_FORM }); setModal("add"); };
  const openEdit = row => { setEditData({ ...row });         setModal("edit"); };
  const openView = row => { setEditData({ ...row });         setModal("view"); };
  const openDel  = row => { setEditData({ ...row });         setModal("delete"); };

  const handleSave = async (formData, mode) => {
    try {
      if (mode === "add") {
        await masterFetch("/api/atm-masters", { method: "POST", body: JSON.stringify(formData) });
        showToast(`ATM ${formData.id_atm} berhasil ditambahkan`);
      } else {
        await masterFetch(`/api/atm-masters/${formData.id_atm}`, { method: "PUT", body: JSON.stringify(formData) });
        showToast(`ATM ${formData.id_atm} berhasil diperbarui`);
      }
      setModal(null); load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleDelete = async () => {
    try {
      await masterFetch(`/api/atm-masters/${editData.id_atm}`, { method: "DELETE" });
      showToast(`ATM ${editData.id_atm} dihapus`);
      setModal(null); load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "error" ? "#E24B4A" : "#1D9E75",
          color: "#fff", borderRadius: 10, padding: "12px 20px",
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.type === "error" ? "✕ " : "✓ "}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Master ATM
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          Data master seluruh ATM BRK Syariah
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Cari ID ATM, lokasi, vendor..."
          onChange={e => onSearchInput(e.target.value)}
          style={{ ...S.input, width: 260, flex: "0 0 260px" }}
        />
        <select
          value={filterWil}
          onChange={e => { setFilterWil(e.target.value); setPage(1); }}
          style={{ ...S.input, width: 160, flex: "0 0 160px" , background: "#0d1228", border: "1px solid rgba(99,179,237,0.15)",}}
        >
          <option value="">Semua Wilayah</option>
          {wilayahOpts.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        {(search || filterWil) && (
          <button
            onClick={() => { setSearch(""); setFilterWil(""); setPage(1); }}
            style={{ ...S.btn("#EF9F27"), padding: "6px 12px" }}
          >
            ✕ Reset
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button onClick={() => setModal("import")} style={S.btn("#7F77DD")}>
          ↑ Import Excel/CSV
        </button>
        <button onClick={openAdd} style={S.btn("#1D9E75")}>
          + Tambah ATM
        </button>
      </div>

      {/* Count bar */}
      <div style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>
        Menampilkan{" "}
        <strong style={{ color: "#94a3b8" }}>{rows.length}</strong> dari{" "}
        <strong style={{ color: "#94a3b8" }}>{total}</strong> ATM
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(99,179,237,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(59,130,246,0.06)", borderBottom: "1px solid rgba(99,179,237,0.12)" }}>
              <th style={thSt}>#</th>
              {TABLE_COLS.map(c => <th key={c.key} style={thSt}>{c.label}</th>)}
              <th style={{ ...thSt, textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 2} style={{ padding: "44px 0", textAlign: "center", color: "#64748b" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(59,130,246,0.25)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Memuat data...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 2} style={{ padding: "44px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>
                  Tidak ada data. Klik <strong style={{ color: "#1D9E75" }}>+ Tambah ATM</strong> atau import file.
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr
                key={row.id_atm || i}
                style={{ borderBottom: "1px solid rgba(99,179,237,0.05)", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={tdSt("#475569")}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                {TABLE_COLS.map(c => (
                  <td key={c.key} style={{
                    ...tdSt(c.key === "id_atm" ? "#60a5fa" : "#94a3b8"),
                    fontFamily: c.key === "id_atm" ? "monospace" : "inherit",
                    fontWeight: c.key === "id_atm" ? 700 : 400,
                    maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {c.key === "limit" && row[c.key]
                      ? `Rp ${Number(row[c.key]).toLocaleString("id-ID")}`
                      : c.key === "pct_saldo" && row[c.key] != null
                      ? <PctBadge val={row[c.key]} />
                      : c.key === "sisa_hari"
                      ? <SisaHariBadge val={row[c.key]} />
                      : row[c.key] != null && row[c.key] !== ""
                      ? row[c.key]
                      : <span style={{ color: "#2d3f55" }}>—</span>
                    }
                  </td>
                ))}
                <td style={{ ...tdSt(), textAlign: "center", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                    <Btn color="#60a5fa" title="Detail" onClick={() => openView(row)}>👁</Btn>
                    <Btn color="#1D9E75" title="Edit"   onClick={() => openEdit(row)}>✎</Btn>
                    <Btn color="#E24B4A" title="Hapus"  onClick={() => openDel(row)}>✕</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 16 }}>
        <PBtn onClick={() => setPage(1)}             disabled={page <= 1}>«</PBtn>
        <PBtn onClick={() => setPage(p => p - 1)}    disabled={page <= 1}>‹</PBtn>
        {Array.from({ length: Math.min(5, totalPages) }, (_, ii) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          const p = start + ii;
          return p <= totalPages
            ? <PBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PBtn>
            : null;
        })}
        <PBtn onClick={() => setPage(p => p + 1)}    disabled={page >= totalPages}>›</PBtn>
        <PBtn onClick={() => setPage(totalPages)}     disabled={page >= totalPages}>»</PBtn>
        <span style={{ color: "#475569", fontSize: 11, marginLeft: 6 }}>Hal {page} / {totalPages}</span>
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <FormModal mode={modal} data={editData} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal === "view" && (
        <DetailModal data={editData} onClose={() => setModal(null)} onEdit={() => setModal("edit")} />
      )}
      {modal === "delete" && (
        <DeleteModal data={editData} onClose={() => setModal(null)} onConfirm={handleDelete} />
      )}
      {modal === "import" && (
        <ImportModal
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load(); showToast("Import berhasil"); }}
        />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}

// ── Micro components ──────────────────────────────────────────
function PBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: active ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.03)",
      border: "1px solid rgba(99,179,237,0.12)",
      color: active ? "#60a5fa" : disabled ? "#2d3f55" : "#94a3b8",
      fontWeight: active ? 700 : 400, borderRadius: 6,
      padding: "5px 10px", fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
    }}>{children}</button>
  );
}

function Btn({ color, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: `${color}18`, border: `1px solid ${color}33`,
      color, borderRadius: 5, width: 28, height: 28,
      fontSize: 13, cursor: "pointer", transition: "all 0.12s",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}30`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; }}
    >{children}</button>
  );
}

function PctBadge({ val }) {
  const v = parseFloat(val) || 0;
  const color = v <= 20 ? "#E24B4A" : v <= 30 ? "#EF9F27" : v <= 35 ? "#d4b800" : "#1D9E75";
  return <span style={{ color, fontWeight: 700 }}>{v}%</span>;
}

function SisaHariBadge({ val }) {
  if (val == null || val === "") return <span style={{ color: "#2d3f55" }}>—</span>;
  const v = parseInt(val);
  if (isNaN(v)) return <span style={{ color: "#94a3b8" }}>{val}</span>;
  const color = v <= 7 ? "#E24B4A" : v <= 30 ? "#EF9F27" : "#1D9E75";
  return <span style={{ color, fontWeight: 600 }}>{v} hr</span>;
}

// ════════════════════════════════════════════════════════════
//  Shared Modal Wrapper
// ════════════════════════════════════════════════════════════
function ModalWrap({ children, onClose, title, width = 640 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#0f172a", border: "1px solid rgba(99,179,237,0.14)", borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", animation: "slideIn 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: "1px solid rgba(99,179,237,0.08)", flexShrink: 0 }}>
          <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#64748b", borderRadius: 6, width: 28, height: 28, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function GroupDivider({ label }) {
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "18px 0 6px" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(99,179,237,0.1)" }} />
      <span style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(99,179,237,0.1)" }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MODAL — Add / Edit
// ════════════════════════════════════════════════════════════
function FormModal({ mode, data, onClose, onSave }) {
  const [form,   setForm]   = useState({ ...data });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const groups = [...new Set(MASTER_COLS.map(c => c.group))];
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const validate = () => {
    const errs = {};
    MASTER_COLS.filter(c => c.required).forEach(c => {
      if (!form[c.key] || String(form[c.key]).trim() === "") errs[c.key] = "Wajib diisi";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(form, mode);
    setSaving(false);
  };

  return (
    <ModalWrap onClose={onClose} title={mode === "add" ? "➕ Tambah ATM Baru" : `✎ Edit ATM — ${form.id_atm}`} width={780}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {groups.map(grp => (
          <div key={grp} style={{ display: "contents" }}>
            <GroupDivider label={grp} />
            {MASTER_COLS.filter(c => c.group === grp).map(col => (
              <div key={col.key} style={{ gridColumn: col.type === "textarea" ? "1 / -1" : "auto", marginBottom: 10 }}>
                <label style={S.label}>
                  {col.label}{col.required && <span style={{ color: "#E24B4A" }}> *</span>}
                </label>
                {col.type === "textarea" ? (
                  <textarea rows={2} value={form[col.key] ?? ""} onChange={e => set(col.key, e.target.value)}
                    placeholder={col.placeholder || ""} style={{ ...S.input, resize: "vertical", minHeight: 56 }} />
                ) : (
                  <input
                    type={col.type === "number" ? "number" : "text"}
                    value={form[col.key] ?? ""}
                    onChange={e => set(col.key, e.target.value)}
                    placeholder={col.placeholder || ""}
                    disabled={mode === "edit" && col.key === "id_atm"}
                    style={{ ...S.input, borderColor: errors[col.key] ? "#E24B4A" : undefined, opacity: mode === "edit" && col.key === "id_atm" ? 0.45 : 1 }}
                  />
                )}
                {errors[col.key] && <span style={{ color: "#E24B4A", fontSize: 10, marginTop: 2, display: "block" }}>{errors[col.key]}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(99,179,237,0.08)" }}>
        <button onClick={onClose} style={S.btn("#64748b")}>Batal</button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn("#1D9E75"), opacity: saving ? 0.55 : 1, minWidth: 110 }}>
          {saving ? "Menyimpan..." : mode === "add" ? "➕ Simpan" : "💾 Update"}
        </button>
      </div>
    </ModalWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  MODAL — Detail View
// ════════════════════════════════════════════════════════════
function DetailModal({ data, onClose, onEdit }) {
  const groups = [...new Set(MASTER_COLS.map(c => c.group))];
  return (
    <ModalWrap onClose={onClose} title={`👁 Detail ATM — ${data.id_atm}`} width={720}>
      {groups.map(grp => (
        <div key={grp}>
          <GroupDivider label={grp} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px", marginBottom: 4 }}>
            {MASTER_COLS.filter(c => c.group === grp).map(col => (
              <div key={col.key}>
                <div style={S.label}>{col.label}</div>
                <div style={{ color: data[col.key] != null && data[col.key] !== "" ? "#e2e8f0" : "#2d3f55", fontSize: 13, fontFamily: col.key === "id_atm" ? "monospace" : "inherit", fontWeight: col.key === "id_atm" ? 700 : 400, wordBreak: "break-word" }}>
                  {col.key === "limit" && data[col.key]
                    ? `Rp ${Number(data[col.key]).toLocaleString("id-ID")}`
                    : data[col.key] != null && data[col.key] !== ""
                    ? String(data[col.key])
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(99,179,237,0.08)" }}>
        <button onClick={onClose} style={S.btn("#64748b")}>Tutup</button>
        <button onClick={onEdit}  style={S.btn("#1D9E75")}>✎ Edit ATM Ini</button>
      </div>
    </ModalWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  MODAL — Delete Confirm
// ════════════════════════════════════════════════════════════
function DeleteModal({ data, onClose, onConfirm }) {
  const [confirm, setConfirm] = useState("");
  const ready = confirm === data.id_atm;
  return (
    <ModalWrap onClose={onClose} title="🗑  Hapus ATM" width={440}>
      <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.75, marginBottom: 16 }}>
        Anda akan menghapus ATM <strong style={{ color: "#e2e8f0" }}>{data.id_atm}</strong>
        {data.lokasi_atm && <> — <span style={{ color: "#64748b" }}>{data.lokasi_atm}</span></>}.
        <br />Tindakan ini <strong style={{ color: "#E24B4A" }}>tidak dapat dibatalkan</strong>.
      </div>
      <div style={{ background: "rgba(226,75,74,0.05)", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
        <label style={{ ...S.label, color: "#EF9F27" }}>Ketik <strong>{data.id_atm}</strong> untuk konfirmasi:</label>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={data.id_atm}
          style={{ ...S.input, borderColor: ready ? "#1D9E75" : "rgba(226,75,74,0.3)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onClose}   style={S.btn("#64748b")}>Batal</button>
        <button onClick={onConfirm} disabled={!ready} style={{ ...S.btn("#E24B4A"), opacity: ready ? 1 : 0.35 }}>🗑 Ya, Hapus</button>
      </div>
    </ModalWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  MODAL — Import
// ════════════════════════════════════════════════════════════
function ImportModal({ onClose, onSuccess }) {
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const ref = useRef();

  const upload = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r    = await fetch(`${API_BASE}/api/atm-masters/import`, { method: "POST", body: fd });
      const json = await r.json();
      if (!r.ok) {
        const msg = typeof json.detail === "object"
          ? `[${json.detail.type}] ${json.detail.error}`
          : (json.detail || `HTTP ${r.status}`);
        throw new Error(msg);
      }
      setResult(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ModalWrap onClose={onClose} title="↑ Import Data ATM Master" width={520}>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.75, marginBottom: 14 }}>
        Upload file <strong style={{ color: "#94a3b8" }}>Excel (.xlsx)</strong> atau <strong style={{ color: "#94a3b8" }}>CSV</strong>.
        Header kolom akan di-mapping otomatis. Data di-upsert berdasarkan <strong style={{ color: "#60a5fa" }}>ID ATM</strong>.
      </div>

      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${file ? "rgba(29,158,117,0.4)" : "rgba(99,179,237,0.2)"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: file ? "rgba(29,158,117,0.05)" : "rgba(255,255,255,0.01)", marginBottom: 14, transition: "all 0.2s" }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
        <div style={{ color: file ? "#1D9E75" : "#64748b", fontSize: 13 }}>
          {file ? file.name : "Klik atau drag & drop file di sini"}
        </div>
        {file && <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>{(file.size / 1024).toFixed(1)} KB</div>}
        <input ref={ref} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => setFile(e.target.files[0])} />
      </div>

      {error  && (
        <div style={{ color: "#E24B4A", background: "rgba(226,75,74,0.07)", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 7, padding: "10px 14px", fontSize: 12, marginBottom: 12, wordBreak: "break-word" }}>
          ✕ {error}
        </div>
      )}
      {result && (
        <div style={{ color: "#1D9E75", background: "rgba(29,158,117,0.07)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 7, padding: "10px 14px", fontSize: 12, marginBottom: 12 }}>
          ✓ Import selesai — <strong>{result.inserted}</strong> ditambahkan, <strong>{result.updated}</strong> diperbarui
          {result.errors?.length > 0 && (
            <div style={{ color: "#EF9F27", marginTop: 6 }}>
              ⚠ {result.errors.length} baris gagal:
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  • {e.id_atm} (row {e.row}): {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onClose} style={S.btn("#64748b")}>Tutup</button>
        {result
          ? <button onClick={onSuccess} style={S.btn("#1D9E75")}>✓ Selesai & Refresh</button>
          : <button onClick={upload} disabled={!file || loading} style={{ ...S.btn("#7F77DD"), opacity: !file || loading ? 0.45 : 1 }}>
              {loading ? "Mengupload..." : "↑ Upload"}
            </button>
        }
      </div>
    </ModalWrap>
  );
}