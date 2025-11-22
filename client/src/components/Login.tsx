import React, { useState } from "react";
import { loginApi, createAdminApi } from "../api/api";

interface LoginProps {
  onLogin: (token: string, user: { username: string; role?: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isCreate, setIsCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = isCreate ? await createAdminApi({ username, password }) : await loginApi({ username, password });
      if (isCreate) {
        alert("Admin created. Now login.");
        setIsCreate(false);
      } else {
        onLogin(res.token, { username: res.username || username, role: res.role });
        try {
          sessionStorage.setItem("username", res.username || username);
          if (res.role) sessionStorage.setItem("role", res.role);
        } catch {}
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", padding: 20, borderRadius: 8, width: 300 }}>
        <h3>{isCreate ? "Create Admin" : "Login"}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
            {loading ? "..." : isCreate ? "Create" : "Login"}
          </button>
        </form>
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <button onClick={() => setIsCreate(!isCreate)} style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }}>
            {isCreate ? "Back to Login" : "Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}