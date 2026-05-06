// src/pages/AuthPage.jsx
// Usage: tambahkan <AuthPage onLogin={() => setPage("dashboard")} /> di App.jsx
// Sebelum render sidebar/main, cek isAuthenticated state.

import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Strength checker ──────────────────────────────────────────────
function getStrength(val) {
  if (!val) return null;
  let score = 0;
  if (val.length >= 8)  score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { pct: 20, color: "#f87171", label: "Sangat lemah" },
    { pct: 35, color: "#fb923c", label: "Lemah" },
    { pct: 55, color: "#fbbf24", label: "Cukup" },
    { pct: 75, color: "#34d399", label: "Kuat" },
    { pct: 100, color: "#22c55e", label: "Sangat kuat" },
  ];
  return levels[Math.min(score - 1, 4)] || levels[0];
}

// ── Eye toggle ────────────────────────────────────────────────────
function PasswordInput({ id, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={S.inputWrap}>
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={S.input}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={S.eyeBtn}
        aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      >
        {show ? "◑" : "◎"}
      </button>
    </div>
  );
}

// ── Alert strip ───────────────────────────────────────────────────
function Alert({ msg, type }) {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{
      ...S.alert,
      background:   isErr ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)",
      border:       `1px solid ${isErr ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"}`,
      color:        isErr ? "#f87171" : "#34d399",
    }}>
      {isErr ? "⚠ " : "✓ "}{msg}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  LOGIN SECTION
// ═════════════════════════════════════════════════════════════════
function LoginForm({ onSuccess }) {
  const [email,    setEmail]    = useState("");
  const [pass,     setPass]     = useState("");
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    if (!email) return "Email tidak boleh kosong.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Format email tidak valid.";
    if (!pass) return "Kata sandi tidak boleh kosong.";
    return null;
  };

  const handleLogin = async () => {
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      // ── Ganti endpoint ini sesuai backend autentikasi ──
      // const res = await fetch(`${API}/api/auth/login`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, password: pass, remember }),
      // });
      // if (!res.ok) { const j = await res.json(); throw new Error(j.detail || "Login gagal"); }
      // const { token } = await res.json();
      // localStorage.setItem("sipras_token", token);

      // ── Simulasi (hapus saat integrate dengan backend) ──
      await new Promise(r => setTimeout(r, 1200));
      setSuccess("Login berhasil! Mengalihkan ke dashboard...");
      setTimeout(() => onSuccess?.(), 800);
    } catch (e) {
      setError(e.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    setError(""); setSuccess("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Masukkan email terlebih dahulu untuk reset kata sandi.");
      return;
    }
    setSuccess(`Link reset kata sandi dikirim ke ${email}`);
  };

  return (
    <div style={S.section}>
      <div>
        <div style={S.title}>Selamat Datang</div>
        <div style={S.sub}>Masuk ke dashboard monitoring ATM</div>
      </div>

      <Alert msg={error}   type="error" />
      <Alert msg={success} type="success" />

      <Field label="Email">
        <div style={S.inputWrap}>
          <input
            type="email"
            placeholder="nama@brksyariah.co.id"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={S.input}
            autoComplete="email"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>
      </Field>

      <Field label="Kata Sandi">
        <div style={S.inputWrap}>
          <input
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={pass}
            onChange={e => setPass(e.target.value)}
            style={S.input}
            autoComplete="current-password"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          <button type="button" onClick={() => setShowPass(v => !v)} style={S.eyeBtn}>
            {showPass ? "◑" : "◎"}
          </button>
        </div>
      </Field>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            style={{ accentColor: "#3b82f6" }}
          />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Ingat saya</span>
        </label>
        <button type="button" onClick={handleForgot} style={S.linkBtn}>
          Lupa kata sandi?
        </button>
      </div>

      <button onClick={handleLogin} disabled={loading} style={loading ? { ...S.btn, opacity: 0.6 } : S.btn}>
        {loading ? "Memverifikasi..." : "Masuk ke SIPRAS"}
      </button>

      <div style={S.divider}>
        <div style={S.divLine} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>atau</span>
        <div style={S.divLine} />
      </div>

      <button style={S.ssoBtn}>
        🏦 Masuk dengan Akun Korporat BRK
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  REGISTER SECTION
// ═════════════════════════════════════════════════════════════════
const DIVISI_OPTIONS = [
  { value: "operasional",  label: "Operasional ATM" },
  { value: "teknologi",    label: "Teknologi Informasi" },
  { value: "keuangan",     label: "Keuangan & Akuntansi" },
  { value: "manajemen",    label: "Manajemen Risiko" },
  { value: "cabang",       label: "Kepala Cabang" },
  { value: "lainnya",      label: "Lainnya" },
];

function RegisterForm({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    fname: "", lname: "", email: "", divisi: "", pass: "", pass2: "",
  });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const strength = getStrength(form.pass);

  const validate = () => {
    if (!form.fname || !form.lname) return "Nama depan dan belakang wajib diisi.";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email korporat tidak valid.";
    if (!form.divisi) return "Silakan pilih divisi/unit kerja.";
    if (form.pass.length < 8) return "Kata sandi minimal 8 karakter.";
    if (form.pass !== form.pass2) return "Konfirmasi kata sandi tidak cocok.";
    return null;
  };

  const handleRegister = async () => {
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      // ── Ganti endpoint ini sesuai backend ──
      // const res = await fetch(`${API}/api/auth/register`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     name: `${form.fname} ${form.lname}`,
      //     email: form.email,
      //     divisi: form.divisi,
      //     password: form.pass,
      //   }),
      // });
      // if (!res.ok) { const j = await res.json(); throw new Error(j.detail || "Registrasi gagal"); }

      await new Promise(r => setTimeout(r, 1200));
      setSuccess("Permintaan dikirim! Menunggu persetujuan admin.");
      setTimeout(() => onSwitchToLogin?.(), 2200);
    } catch (e) {
      setError(e.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.section}>
      <div>
        <div style={S.title}>Buat Akun Baru</div>
        <div style={S.sub}>Isi data untuk meminta akses SIPRAS</div>
      </div>

      <Alert msg={error}   type="error" />
      <Alert msg={success} type="success" />

      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Nama Depan">
          <input type="text" placeholder="Ahmad" value={form.fname} onChange={set("fname")} style={S.input} />
        </Field>
        <Field label="Nama Belakang">
          <input type="text" placeholder="Fauzi" value={form.lname} onChange={set("lname")} style={S.input} />
        </Field>
      </div>

      <Field label="Email Korporat">
        <div style={S.inputWrap}>
          <input
            type="email"
            placeholder="nama@brksyariah.co.id"
            value={form.email}
            onChange={set("email")}
            style={S.input}
            autoComplete="email"
          />
        </div>
      </Field>

      <Field label="Divisi / Unit Kerja">
        <div style={S.inputWrap}>
          <select value={form.divisi} onChange={set("divisi")} style={{ ...S.input, cursor: "pointer" }}>
            <option value="">Pilih divisi...</option>
            {DIVISI_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="Kata Sandi">
        <PasswordInput
          placeholder="Min. 8 karakter"
          value={form.pass}
          onChange={set("pass")}
        />
        {strength && (
          <div style={{ marginTop: 4 }}>
            <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${strength.pct}%`, height: "100%", background: strength.color, transition: "all 0.3s", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 10, color: strength.color, marginTop: 3 }}>{strength.label}</div>
          </div>
        )}
      </Field>

      <Field label="Konfirmasi Kata Sandi">
        <PasswordInput
          placeholder="Ulangi kata sandi"
          value={form.pass2}
          onChange={set("pass2")}
        />
        {form.pass2 && form.pass !== form.pass2 && (
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>Kata sandi tidak cocok</div>
        )}
      </Field>

      <button onClick={handleRegister} disabled={loading} style={loading ? { ...S.btn, opacity: 0.6 } : S.btn}>
        {loading ? "Mengirim..." : "Kirim Permintaan Akses"}
      </button>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        Akun aktif setelah diverifikasi oleh Administrator SIPRAS
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MAIN AUTH PAGE
// ═════════════════════════════════════════════════════════════════
export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");

  return (
    <div style={S.root}>
      {/* Grid background */}
      <div style={S.gridBg} />
      <div style={S.glow} />

      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={S.logoBox}>BRK</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>SIPRAS</div>
              <div style={{ color: "#60a5fa", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>BRK Syariah</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={S.tabs}>
            {[
              { id: "login",    label: "Masuk" },
              { id: "register", label: "Daftar Akun" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={tab === t.id ? { ...S.tab, ...S.tabActive } : S.tab}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 28px 28px" }}>
          {tab === "login"
            ? <LoginForm    onSuccess={onLogin} />
            : <RegisterForm onSwitchToLogin={() => setTab("login")} />
          }
        </div>

        {/* Footer */}
        <div style={S.footer}>
          SIPRAS v7.0 · Smart ATM Monitoring System · BRK Syariah 2026
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  STYLES
// ═════════════════════════════════════════════════════════════════
const S = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#000000 0%,#111111 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "'IBM Plex Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  gridBg: {
    position: "absolute", inset: 0,
    backgroundImage: `
      linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  glow: {
    position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
    width: 400, height: 200,
    background: "radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative", zIndex: 2,
    width: "100%", maxWidth: 420,
    background: "rgba(18,18,18,0.97)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    padding: "28px 28px 0",
  },
  logoBox: {
    width: 40, height: 40,
    background: "linear-gradient(135deg,#3b82f6,#06b6d4)",
    borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, color: "#fff",
    boxShadow: "0 0 20px rgba(59,130,246,0.4)",
    letterSpacing: "0.5px",
  },
  tabs: {
    display: "flex",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 8, padding: 3, marginBottom: 0,
  },
  tab: {
    flex: 1, padding: "7px 0", textAlign: "center",
    fontSize: 12, fontWeight: 500,
    border: "1px solid transparent",
    background: "transparent",
    color: "rgba(255,255,255,0.4)",
    borderRadius: 6, cursor: "pointer",
    transition: "all 0.2s", letterSpacing: "0.3px",
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  tabActive: {
    background: "rgba(59,130,246,0.2)",
    color: "#93c5fd",
    border: "1px solid rgba(59,130,246,0.3)",
  },
  section: {
    display: "flex", flexDirection: "column", gap: 14,
  },
  title: {
    fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 2,
  },
  sub: {
    fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 4,
  },
  field: {
    display: "flex", flexDirection: "column", gap: 5, flex: 1,
  },
  label: {
    fontSize: 11, fontWeight: 500,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.8px", textTransform: "uppercase",
  },
  inputWrap: { position: "relative" },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "10px 38px 10px 12px",
    fontSize: 13, color: "#e2e8f0",
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
    color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer",
    background: "none", border: "none", padding: 0,
  },
  btn: {
    width: "100%", padding: "11px 0",
    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
    border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: "#fff",
    fontFamily: "'IBM Plex Sans', sans-serif",
    cursor: "pointer", letterSpacing: "0.5px",
    transition: "all 0.2s",
    marginTop: 4,
  },
  linkBtn: {
    fontSize: 12, color: "#60a5fa", cursor: "pointer",
    background: "none", border: "none",
    fontFamily: "'IBM Plex Sans', sans-serif",
    padding: 0,
  },
  divider: {
    display: "flex", alignItems: "center", gap: 10,
  },
  divLine: {
    flex: 1, height: 1, background: "rgba(255,255,255,0.07)",
  },
  ssoBtn: {
    width: "100%", padding: "10px 0",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)",
    fontFamily: "'IBM Plex Sans', sans-serif",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "all 0.2s",
  },
  alert: {
    fontSize: 11, borderRadius: 6, padding: "8px 10px",
    display: "flex", alignItems: "center", gap: 6,
  },
  footer: {
    padding: "14px 28px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    fontSize: 11, color: "rgba(255,255,255,0.2)",
    textAlign: "center", letterSpacing: "0.5px",
  },
};