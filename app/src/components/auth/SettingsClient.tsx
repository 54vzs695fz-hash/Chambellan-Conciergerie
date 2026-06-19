"use client";

import { useEffect, useState } from "react";
import { logout, registerPasskey } from "@/components/auth/LoginForm";

interface SessionUser {
  email: string;
  name: string;
  role: string;
  passkeyCount: number;
}

export function SettingsClient() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    setPasskeySupported(
      typeof window !== "undefined" &&
        window.isSecureContext &&
        typeof window.PublicKeyCredential !== "undefined"
    );

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRegisterPasskey() {
    setMessage("");
    setPasskeyBusy(true);
    const result = await registerPasskey();
    setPasskeyBusy(false);

    if (result.ok) {
      setMessage("Passkey registered successfully.");
      setUser((current) =>
        current ? { ...current, passkeyCount: current.passkeyCount + 1 } : current
      );
    } else {
      setMessage(result.error ?? "Registration failed");
    }
  }

  if (loading) {
    return <p className="settings-muted">Loading account…</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="settings-panel">
      <section className="settings-section dash-card">
        <p className="settings-eyebrow">Signed in as</p>
        <h2 className="settings-name">{user.name}</h2>
        <p className="settings-email">{user.email}</p>
        <p className="settings-muted settings-role">{user.role}</p>
        {user.passkeyCount > 0 ? (
          <p className="settings-muted">
            {user.passkeyCount} passkey{user.passkeyCount === 1 ? "" : "s"} registered
          </p>
        ) : null}
      </section>

      {passkeySupported ? (
        <section className="settings-section dash-card">
          <h3 className="settings-section-title">Face ID / Passkey</h3>
          <p className="settings-muted">
            Register a passkey on this device for faster sign-in with Face ID or Touch ID.
          </p>
          <button
            type="button"
            className="btn-accent settings-btn"
            onClick={handleRegisterPasskey}
            disabled={passkeyBusy}
          >
            {passkeyBusy ? "Registering…" : "Register passkey"}
          </button>
        </section>
      ) : null}

      {message ? <p className="settings-message">{message}</p> : null}

      <section className="settings-section">
        <button type="button" className="settings-logout" onClick={() => logout()}>
          Sign out
        </button>
      </section>
    </div>
  );
}
