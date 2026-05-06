// src/pages/Register.jsx
import { useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WILAYAH_OPTIONS = ["Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"];

export default function Register({ onGoLogin }) {
  const [form, setForm] = useState({
    username:  "",
    email:     "",
    password:  "",
    confirmPw: "",
    full_name: "",
    role:      "viewer",
    wilayah:   "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.username.trim())  return "Username wajib diisi.";
    if (form.username.length < 3) return "Username minimal 3 karakter.";
    if (!form.email.includes("@")) return "Format email tidak valid.";
    if (!form.full_name.trim()) return "Nama lengkap wajib diisi.";
    if (form.password.length < 6)  return "Password minimal 6 karakter.";
    if (form.password !== form.confirmPw) return "Konfirmasi password tidak cocok.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");
    try {
      const payload = {
        username:  form.username.trim(),
        email:     form.email.trim(),
        password:  form.password,
        full_name: form.full_name.trim(),
        role:      form.role,
        wilayah:   form.wilayah || null,
      };
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registrasi gagal.");
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight:      "100vh",
        background:     "linear-gradient(135deg, #000000 0%, #0d1117 50%, #0a1628 100%)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     "'IBM Plex Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: 420, width: "100%",
          background:   "rgba(15,20,30,0.95)",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "48px 40px",
          textAlign:    "center",
          boxShadow:    "0 24px 80px rgba(0,0,0,0.6)",
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: "#22c55e", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
            Registrasi Berhasil!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 28px", lineHeight: 1.6 }}>
            Akun <strong style={{ color: "#e2e8f0" }}>{form.username}</strong> berhasil dibuat.
            Silakan login dengan akun Anda.
          </p>
          <button
            onClick={onGoLogin}
            style={{
              width: "100%", padding: "13px",
              background:   "linear-gradient(135deg, #3b82f6, #06b6d4)",
              border:       "none", borderRadius: 10,
              color:        "#fff", fontSize: 15, fontWeight: 700,
              cursor:       "pointer",
            }}
          >
            Pergi ke Login
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background:   "rgba(15, 20, 30, 0.95)",
    border:       "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#ffffff", fontSize: 14,
    outline:      "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const labelStyle = {
    color: "#94a3b8", fontSize: 12, fontWeight: 600,
    display: "block", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const focusIn  = e => e.target.style.borderColor = "rgba(59,130,246,0.5)";
  const focusOut = e => e.target.style.borderColor = "rgba(255,255,255,0.1)";

  return (
    <div style={{
      minHeight:      "100vh",
      background:     "linear-gradient(135deg, #000000 0%, #0d1117 50%, #0a1628 100%)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontFamily:     "'IBM Plex Sans', sans-serif",
      padding:        "24px",
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background:     "rgba(15,20,30,0.95)",
        border:         "1px solid rgba(255,255,255,0.08)",
        borderRadius:   20, padding: "36px 40px 32px",
        boxShadow:      "0 24px 80px rgba(0,0,0,0.6)",
        backdropFilter: "blur(20px)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60,
            background:     "linear-gradient(135deg, #3b82f6, #06b6d4)",
            borderRadius:   14, display: "flex",
            alignItems:     "center", justifyContent: "center",
            fontSize:       20, fontWeight: 800, color: "#fff",
            margin:         "0 auto 14px",
            boxShadow:      "0 0 30px rgba(59,130,246,0.3)",
          }}>
            BRK
          </div>
          <h1 style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
            Buat Akun SIPRAS
          </h1>
          <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
            Daftarkan diri untuk akses dashboard
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 18,
            color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>⚠</span>{error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Row: Username + Nama */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Username *</label>
              <input style={inputStyle} placeholder="username"
                value={form.username} onChange={e => set("username", e.target.value)}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={labelStyle}>Nama Lengkap *</label>
              <input style={inputStyle} placeholder="Nama Anda"
                value={form.full_name} onChange={e => set("full_name", e.target.value)}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" style={inputStyle} placeholder="email@brks.co.id"
              value={form.email} onChange={e => set("email", e.target.value)}
              onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Row: Password + Konfirmasi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} placeholder="Min. 6 karakter"
                  value={form.password} onChange={e => set("password", e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  style={{ ...inputStyle, paddingRight: 36 }} />
                <button onClick={() => setShowPw(v => !v)} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14,
                }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Konfirmasi *</label>
              <input type="password" style={inputStyle} placeholder="Ulangi password"
                value={form.confirmPw} onChange={e => set("confirmPw", e.target.value)}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Row: Role + Wilayah */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => set("role", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Wilayah</label>
              <select value={form.wilayah} onChange={e => set("wilayah", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Semua Wilayah</option>
                {WILAYAH_OPTIONS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Role info */}
          <div style={{
            background:   "rgba(59,130,246,0.06)",
            border:       "1px solid rgba(59,130,246,0.15)",
            borderRadius: 8, padding: "8px 12px",
          }}>
            <p style={{ color: "#93c5fd", fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              <strong>Viewer</strong> — Hanya bisa melihat data &nbsp;|&nbsp;
              <strong>Operator</strong> — Bisa upload & manage cashplan
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "13px", marginTop: 4,
              background:   loading ? "rgba(59,130,246,0.4)" : "linear-gradient(135deg, #3b82f6, #06b6d4)",
              border:       "none", borderRadius: 10,
              color:        "#fff", fontSize: 15, fontWeight: 700,
              cursor:       loading ? "not-allowed" : "pointer",
              boxShadow:    loading ? "none" : "0 4px 20px rgba(59,130,246,0.35)",
              transition:   "all 0.2s",
            }}
          >
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center" }}>
          <p style={{ color: "#ffffff", fontSize: 13, margin: 0 }}>
            Sudah punya akun?{" "}
            <button onClick={onGoLogin} style={{
              background: "none", border: "none",
              color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0,
            }}>
              Login di sini
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}