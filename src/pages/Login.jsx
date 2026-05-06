// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ROLE_LABEL = { admin: "Administrator", operator: "Operator", viewer: "Viewer" };
const ROLE_COLOR = { admin: "#ef4444", operator: "#3b82f6", viewer: "#22c55e" };

export default function Login({ onGoRegister }) {
  const { login } = useAuth();

  const [form,    setForm]    = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [showPw,  setShowPw]  = useState(false);

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login gagal.");
      login(data.access_token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{
      minHeight:       "100vh",
      background:      "linear-gradient(135deg, #000000 0%, #0d1117 50%, #0a1628 100%)",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      fontFamily:      "'IBM Plex Sans', sans-serif",
      padding:         "24px",
    }}>
      {/* Background decorative blobs */}
      <div style={{
        position: "fixed", top: "10%", left: "5%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "10%", right: "5%",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width:        "100%",
        maxWidth:     440,
        background:   "rgba(15,20,30,0.95)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding:      "40px 40px 36px",
        boxShadow:    "0 24px 80px rgba(0,0,0,0.6)",
        backdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
            SIPRAS
          </h1>
          <p style={{ color: "#ffffff", fontSize: 13, margin: 0 }}>
            Divisi Operational Echannel - BRK Syariah
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:   "rgba(239,68,68,0.1)",
            border:       "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10,
            padding:      "10px 14px",
            marginBottom: 20,
            color:        "#fca5a5",
            fontSize:     13,
            display:      "flex",
            alignItems:   "center",
            gap:          8,
          }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600,
              display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Masukkan username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={handleKey}
              autoFocus
              style={{
                width:        "100%",
                padding:      "12px 14px",
                background:   "rgba(255,255,255,0.04)",
                border:       "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color:        "#ffffff",
                fontSize:     14,
                outline:      "none",
                boxSizing:    "border-box",
                transition:   "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.5)"}
              onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600,
              display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Masukkan password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={handleKey}
                style={{
                  width:        "100%",
                  padding:      "12px 44px 12px 14px",
                  background:   "rgba(255,255,255,0.04)",
                  border:       "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color:        "#ffffff",
                  fontSize:     14,
                  outline:      "none",
                  boxSizing:    "border-box",
                  transition:   "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.5)"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <button
                onClick={() => setShowPw(v => !v)}
                style={{
                  position:   "absolute",
                  right:      12,
                  top:        "50%",
                  transform:  "translateY(-50%)",
                  background: "none",
                  border:     "none",
                  color:      "#64748b",
                  cursor:     "pointer",
                  fontSize:   16,
                  padding:    4,
                }}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width:        "100%",
              padding:      "13px",
              marginTop:    4,
              background:   loading
                ? "rgba(59,130,246,0.4)"
                : "linear-gradient(135deg, #3b82f6, #06b6d4)",
              border:       "none",
              borderRadius: 10,
              color:        "#ffffff",
              fontSize:     15,
              fontWeight:   700,
              cursor:       loading ? "not-allowed" : "pointer",
              transition:   "all 0.2s",
              boxShadow:    loading ? "none" : "0 4px 20px rgba(59,130,246,0.35)",
            }}
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center" }}>
          <p style={{ color: "#ffffff", fontSize: 13, margin: "0 0 12px" }}>
            Belum punya akun?{" "}
            <button
              onClick={onGoRegister}
              style={{
                background: "none", border: "none",
                color: "#3b82f6", cursor: "pointer",
                fontSize: 13, fontWeight: 600, padding: 0,
              }}
            >
              Daftar di sini
            </button>
          </p>
          <p style={{ color: "#ffffff", fontSize: 11, margin: 0 }}>
            Bank Riau Kepri Syariah · SIPRAS
          </p>
        </div>
      </div>
    </div>
  );
}