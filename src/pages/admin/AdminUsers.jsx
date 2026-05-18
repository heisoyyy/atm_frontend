// src/pages/admin/AdminUsers.jsx
import { useState, useEffect, useCallback, useMemo } from "react";

const API_BASE    = import.meta.env?.VITE_API_URL || "http://localhost:8000";
const ROLE_OPTS   = ["viewer","operator","admin"];
const WILAYAH_OPTS = ["","Pekanbaru","Batam","Dumai","Tanjung Pinang"];
const ROLE_COLOR  = { admin:"#f87171", operator:"#60a5fa", viewer:"#4ade80" };
const ROLE_BG     = { admin:"rgba(248,113,113,0.12)", operator:"rgba(96,165,250,0.12)", viewer:"rgba(74,222,128,0.1)" };

function authHeader() {
  const token = localStorage.getItem("sipras_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminUsers({ showToast }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [confirm,    setConfirm]    = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [newPw,      setNewPw]      = useState("");
  const [addForm,    setAddForm]    = useState({
    username:"", email:"", full_name:"", password:"", role:"viewer", wilayah:"",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, { headers: authHeader() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Gagal memuat user"); }
      const data = await res.json();
      setUsers(data.data || []);
    } catch(e) { showToast(e.message, "err"); }
    finally { setLoading(false); }
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

  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    pending:  users.filter(u => !u.is_approved).length,
    admin:    users.filter(u => u.role === "admin").length,
    operator: users.filter(u => u.role === "operator").length,
    viewer:   users.filter(u => u.role === "viewer").length,
  }), [users]);

  const doAdd = async () => {
    if (!addForm.username.trim())    return showToast("Username wajib diisi", "err");
    if (!addForm.email.trim())       return showToast("Email wajib diisi", "err");
    if (!addForm.full_name.trim())   return showToast("Nama lengkap wajib diisi", "err");
    if (addForm.password.length < 6) return showToast("Password minimal 6 karakter", "err");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-by-admin`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", ...authHeader() },
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
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); }
  };

  const doToggle = async (user) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${user.id}/toggle`, {
        method:"PATCH", headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal update status");
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: data.is_active } : u));
      showToast(`User '${user.username}' ${data.is_active ? "diaktifkan" : "dinonaktifkan"}`);
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); setConfirm(null); }
  };

  const doApprove = async (user) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${user.id}/approve`, {
        method:"PATCH", headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal approve user");
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_approved: true } : u));
      showToast(`User '${user.username}' berhasil diverifikasi`);
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); setConfirm(null); }
  };

  const doResetPw = async () => {
    if (!newPw || newPw.length < 6) return showToast("Password minimal 6 karakter","err");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${resetModal.id}/reset-password`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json", ...authHeader() },
        body: JSON.stringify({ new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal reset password");
      showToast(`Password '${resetModal.username}' berhasil direset`);
      setResetModal(null); setNewPw("");
    } catch(e) { showToast(e.message,"err"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {/* Stats cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Total",    value:stats.total,    color:"#38bdf8" },
          { label:"Aktif",    value:stats.active,   color:"#4ade80" },
          { label:"Pending",  value:stats.pending,  color:"#fbbf24" },
          { label:"Admin",    value:stats.admin,    color:"#f87171" },
          { label:"Operator", value:stats.operator, color:"#60a5fa" },
          { label:"Viewer",   value:stats.viewer,   color:"#94a3b8" },
        ].map(c => (
          <div key={c.label} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${c.color}22`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:800, color:c.color, fontFamily:"'IBM Plex Mono',monospace" }}>{c.value}</div>
            <div style={{ fontSize:9, color:"#64748b", marginTop:2, textTransform:"uppercase", letterSpacing:"0.07em" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="⌕  Cari username / nama / email..." style={{ ...s.searchInput, width:280 }} />
        <span style={{ color:"#94a3b8", fontSize:12, fontFamily:"monospace" }}>{filtered.length} user</span>
        <button onClick={() => setShowAdd(true)} style={s.addBtn}>+ Tambah User</button>
        <button onClick={load} style={s.refreshBtn} disabled={loading}>↺</button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton /> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["ID","Username","Nama Lengkap","Email","Role","Wilayah","Status","Verifikasi","Terdaftar","Last Login","Aksi"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={s.empty}>Tidak ada user ditemukan</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} style={{
                  background: !u.is_approved ? "rgba(251,191,36,0.03)" : !u.is_active ? "rgba(248,113,113,0.03)" : i%2===0 ? "transparent" : "rgba(255,255,255,0.012)",
                  opacity: u.is_active ? 1 : 0.6,
                }}>
                  <Td mono dim>{u.id}</Td>
                  <Td mono bold accent="#38bdf8">{u.username}</Td>
                  <Td>{u.full_name || "—"}</Td>
                  <Td dim small>{u.email}</Td>
                  <Td>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:5, background:ROLE_BG[u.role]||"rgba(100,116,139,0.1)", color:ROLE_COLOR[u.role]||"#94a3b8", border:`1px solid ${ROLE_COLOR[u.role]||"#94a3b8"}33`, textTransform:"uppercase" }}>
                      {u.role}
                    </span>
                  </Td>
                  <Td dim small>{u.wilayah || "Semua"}</Td>
                  <Td>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5, background:u.is_active?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)", color:u.is_active?"#4ade80":"#f87171", border:`1px solid ${u.is_active?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}` }}>
                      {u.is_active ? "✓ AKTIF" : "✕ NONAKTIF"}
                    </span>
                  </Td>
                  <Td>
                    {u.is_approved
                      ? <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5, background:"rgba(74,222,128,0.1)", color:"#4ade80", border:"1px solid rgba(74,222,128,0.3)" }}>✓ VERIFIED</span>
                      : <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5, background:"rgba(251,191,36,0.1)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.3)" }}>⏳ PENDING</span>
                    }
                  </Td>
                  <Td dim small>{u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID",{dateStyle:"short"}) : "—"}</Td>
                  <Td dim small>{u.last_login ? new Date(u.last_login).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}) : <span style={{ color:"#374151" }}>Belum login</span>}</Td>
                  <Td>
                    <div style={{ display:"flex", gap:4 }}>
                      {!u.is_approved && <ActionBtn color="#4ade80" title="Verifikasi" onClick={() => setConfirm({ type:"approve", user:u })}>✓</ActionBtn>}
                      <ActionBtn color={u.is_active?"#f87171":"#4ade80"} title={u.is_active?"Nonaktifkan":"Aktifkan"} onClick={() => setConfirm({ type:"toggle", user:u })}>
                        {u.is_active ? "⏸" : "▶"}
                      </ActionBtn>
                      <ActionBtn color="#f59e0b" title="Reset Password" onClick={() => { setResetModal(u); setNewPw(""); }}>🔑</ActionBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tambah user */}
      {showAdd && (
        <Modal title="+ Tambah User Baru" onClose={() => setShowAdd(false)}>
          <div style={s.formGrid}>
            <div style={s.formField}><label style={s.formLabel}>Username *</label><input style={{ ...s.formInput, fontFamily:"monospace" }} placeholder="min. 3 karakter" value={addForm.username} onChange={e => setAddForm(p=>({...p,username:e.target.value}))} /></div>
            <div style={s.formField}><label style={s.formLabel}>Nama Lengkap *</label><input style={s.formInput} value={addForm.full_name} onChange={e => setAddForm(p=>({...p,full_name:e.target.value}))} /></div>
            <div style={s.formField}><label style={s.formLabel}>Email *</label><input type="email" style={s.formInput} placeholder="email@brks.co.id" value={addForm.email} onChange={e => setAddForm(p=>({...p,email:e.target.value}))} /></div>
            <div style={s.formField}><label style={s.formLabel}>Password * (min. 6)</label><input type="password" style={s.formInput} placeholder="••••••••" value={addForm.password} onChange={e => setAddForm(p=>({...p,password:e.target.value}))} /></div>
            <div style={s.formField}><label style={s.formLabel}>Role</label><select style={s.formSelect} value={addForm.role} onChange={e => setAddForm(p=>({...p,role:e.target.value}))}>{ROLE_OPTS.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}</select></div>
            <div style={s.formField}><label style={s.formLabel}>Wilayah</label><select style={s.formSelect} value={addForm.wilayah} onChange={e => setAddForm(p=>({...p,wilayah:e.target.value}))}>{WILAYAH_OPTS.map(w=><option key={w} value={w}>{w||"— Semua —"}</option>)}</select></div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={doAdd} disabled={busy} style={s.okBtn}>{busy?"Menyimpan...":"✓ Tambah User"}</button>
            <button onClick={() => setShowAdd(false)} style={s.cancelBtn}>Batal</button>
          </div>
        </Modal>
      )}

      {/* Modal reset password */}
      {resetModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth:380 }}>
            <div style={{ fontSize:32, textAlign:"center", marginBottom:12 }}>🔑</div>
            <h3 style={{ color:"#f59e0b", fontSize:15, fontWeight:700, textAlign:"center", margin:"0 0 6px" }}>Reset Password</h3>
            <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>
              User: <strong style={{ color:"#38bdf8" }}>{resetModal.username}</strong> · {resetModal.full_name}
            </p>
            <div style={s.formField}>
              <label style={s.formLabel}>Password Baru *</label>
              <input type="password" style={{ ...s.formInput, textAlign:"center" }} placeholder="min. 6 karakter" value={newPw} onChange={e => setNewPw(e.target.value)} autoFocus />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={doResetPw} disabled={busy} style={{ ...s.okBtn, background:"rgba(245,158,11,0.15)", borderColor:"rgba(245,158,11,0.4)", color:"#f59e0b" }}>{busy?"Menyimpan...":"✓ Simpan Password"}</button>
              <button onClick={() => { setResetModal(null); setNewPw(""); }} style={s.cancelBtn}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modals */}
      {confirm?.type === "toggle" && (
        <ConfirmModal
          title={confirm.user.is_active ? `Nonaktifkan '${confirm.user.username}'?` : `Aktifkan '${confirm.user.username}'?`}
          desc={confirm.user.is_active ? "User tidak bisa login sampai diaktifkan kembali." : "User akan bisa login kembali."}
          danger={confirm.user.is_active}
          onOk={() => doToggle(confirm.user)} onCancel={() => setConfirm(null)} loading={busy}
        />
      )}
      {confirm?.type === "approve" && (
        <ConfirmModal
          title={`Verifikasi user '${confirm.user.username}'?`}
          desc="User akan bisa login ke sistem setelah diverifikasi."
          danger={false}
          onOk={() => doApprove(confirm.user)} onCancel={() => setConfirm(null)} loading={busy}
        />
      )}
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function Td({ children, mono, bold, dim, accent, small }) {
  return <td style={{ padding:"8px 12px", color:accent||"#e2e8f0", fontSize:small?10:12, fontWeight:bold?700:400, fontFamily:mono?"'IBM Plex Mono',monospace":"inherit", whiteSpace:"nowrap", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{children}</td>;
}
function ActionBtn({ children, color, onClick, title }) {
  return <button onClick={onClick} title={title} style={{ background:`${color}15`, border:`1px solid ${color}35`, borderRadius:5, color, padding:"3px 8px", fontSize:12, cursor:"pointer", fontWeight:700 }}>{children}</button>;
}
function TableSkeleton() {
  return <div style={{ padding:"20px 0" }}>{[...Array(5)].map((_,i)=><div key={i} style={{ height:36, background:`rgba(74,222,128,${0.02+i*0.005})`, borderRadius:4, marginBottom:4 }} />)}</div>;
}
function Modal({ title, children, onClose }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#4ade80", fontSize:16, fontWeight:700, margin:0, fontFamily:"monospace" }}>{title}</h2>
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
        <div style={{ fontSize:28, marginBottom:12, textAlign:"center" }}>{danger?"⚠️":"❓"}</div>
        <h3 style={{ color:danger?"#f87171":"#e2e8f0", fontSize:15, fontWeight:700, margin:"0 0 8px", textAlign:"center" }}>{title}</h3>
        <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", margin:"0 0 20px" }}>{desc}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onOk} disabled={loading} style={{ flex:1, padding:"10px", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", background:danger?"rgba(248,113,113,0.15)":"rgba(74,222,128,0.15)", border:danger?"1px solid rgba(248,113,113,0.4)":"1px solid rgba(74,222,128,0.4)", color:danger?"#f87171":"#4ade80" }}>
            {loading?"Proses...":danger?"⌫ Nonaktifkan":"✓ Konfirmasi"}
          </button>
          <button onClick={onCancel} style={{ padding:"10px 20px", borderRadius:8, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8" }}>Batal</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  toolbar:    { display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" },
  searchInput:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(74,222,128,0.15)", borderRadius:8, color:"#e2e8f0", padding:"8px 14px", fontSize:12, outline:"none" },
  addBtn:     { background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, color:"#4ade80", padding:"8px 16px", fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"monospace" },
  refreshBtn: { background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.15)", borderRadius:8, color:"#4ade80", padding:"8px 12px", fontSize:14, cursor:"pointer" },
  tableWrap:  { overflowX:"auto", borderRadius:10, border:"1px solid rgba(74,222,128,0.08)", background:"rgba(5,11,24,0.6)" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th:         { padding:"10px 12px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap", borderBottom:"1px solid rgba(74,222,128,0.1)", fontFamily:"'IBM Plex Mono',monospace", background:"rgba(0,0,0,0.2)" },
  empty:      { padding:"60px 20px", textAlign:"center", color:"#475569", fontSize:13 },
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:      { background:"#080e1d", border:"1px solid rgba(74,222,128,0.2)", borderRadius:16, padding:"28px 32px", width:600, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" },
  formGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  formField:  { display:"flex", flexDirection:"column", gap:5 },
  formLabel:  { color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" },
  formInput:  { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none" },
  formSelect: { background:"#0a0f1e", border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, outline:"none", cursor:"pointer" },
  okBtn:      { flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)", color:"#4ade80", fontFamily:"monospace" },
  cancelBtn:  { padding:"11px 20px", borderRadius:9, fontSize:13, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8" },
};