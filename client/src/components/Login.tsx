import React, { useState } from "react";
import { loginApi, createAdminApi } from "../api/api";

interface LoginProps {
  onLogin: (token: string, user: { username: string; role?: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isCreate, setIsCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('username');
    const role = params.get('role');
    
    if (token && user) {
      onLogin(token, { username: user, role: role || undefined });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onLogin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = isCreate 
        ? await createAdminApi({ email, username: username || undefined, password }) 
        : await loginApi({ email: email || undefined, username: username || undefined, password });
      console.log("Login response:", res);
      
      if (isCreate) {
        alert("Admin created. Now login.");
        setIsCreate(false);
        setEmail("");
        setUsername("");
        setPassword("");
      } else {
        if (!res || !res.token) {
          throw new Error("Login failed: no token received");
        }
        onLogin(res.token, { username: res.username || username, role: res.role });
        try {
          sessionStorage.setItem("username", res.username || username);
          if (res.role) sessionStorage.setItem("role", res.role);
        } catch {}
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    const backendUrl = import.meta.env.VITE_BACKEND_BASE || "http://localhost:5001";
    window.location.href = `${backendUrl}/api/auth/google`;
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", padding: 20, borderRadius: 8, width: 320 }}>
        <h3>{isCreate ? "Create Admin Account" : "Login"}</h3>
        <form onSubmit={handleSubmit}>
          {isCreate && (
            <div style={{ marginBottom: 10 }}>
              <input
                type="email"
                placeholder="Email (required)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
              />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <input
              type={isCreate ? "text" : "email"}
              placeholder={isCreate ? "Username (optional)" : "Email or Username"}
              value={isCreate ? username : email || username}
              onChange={(e) => isCreate ? setUsername(e.target.value) : setEmail(e.target.value)}
              required={!isCreate}
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            />
          </div>
          {error && <div style={{ color: "red", marginBottom: 10, fontSize: 14 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: 10, marginBottom: 10 }}>
            {loading ? "..." : isCreate ? "Create Admin" : "Login"}
          </button>
        </form>
        
        <div style={{ borderTop: "1px solid #ddd", paddingTop: 10, marginTop: 10 }}>
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            style={{ 
              width: "100%", 
              padding: 10, 
              background: "#4285f4", 
              color: "white", 
              border: "none", 
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            Continue with Google
          </button>
        </div>

        <div style={{ marginTop: 15, textAlign: "center" }}>
          <button onClick={() => setIsCreate(!isCreate)} style={{ background: "none", border: "none", color: "#4285f4", cursor: "pointer", fontSize: 14 }}>
            {isCreate ? "Back to Login" : "Create Admin Account"}
          </button>
        </div>
      </div>
    </div>
  );
}