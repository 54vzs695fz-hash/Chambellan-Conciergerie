"use client";

import { FormEvent, useEffect, useState } from "react";
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
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setPasswordError(data.error ?? "Could not change password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch {
      setPasswordError("Could not reach the server");
    } finally {
      setPasswordBusy(false);
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

      <section className="settings-section dash-card">
        <h3 className="settings-section-title">Change password</h3>
        <p className="settings-muted">
          Update your private login password. Use at least 12 characters.
        </p>
        <form className="settings-password-form" onSubmit={handleChangePassword}>
          <label className="settings-field">
            <span className="settings-field-label">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label className="settings-field">
            <span className="settings-field-label">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={12}
              required
            />
          </label>
          <label className="settings-field">
            <span className="settings-field-label">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={12}
              required
            />
          </label>
          {passwordError ? <p className="settings-error">{passwordError}</p> : null}
          <button
            type="submit"
            className="btn-primary settings-btn"
            disabled={passwordBusy}
          >
            {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </form>
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
