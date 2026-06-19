"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

function supportsPasskeys(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyReady, setPasskeyReady] = useState(false);

  useEffect(() => {
    setPasskeyReady(supportsPasskeys());
  }, []);

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberDevice }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Sign-in failed");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    setLoading(true);

    try {
      const optionsRes = await fetch("/api/auth/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error ?? "Passkey sign-in unavailable");
        return;
      }

      const authResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authResponse, rememberDevice }),
      });
      const verifyData = (await verifyRes.json()) as { error?: string };

      if (!verifyRes.ok) {
        setError(verifyData.error ?? "Passkey sign-in failed");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Passkey sign-in was cancelled");
      } else {
        setError("Passkey sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card">
      <div className="login-brand">
        <Image
          src="/brand/logo.jpg"
          alt="Chambellan"
          width={72}
          height={72}
          className="login-logo"
          priority
        />
        <p className="login-eyebrow">Private access</p>
        <h1 className="login-title">Chambellan Concierge</h1>
        <p className="login-subtitle">Luxury concierge operating system</p>
      </div>

      <form className="login-form" onSubmit={handlePasswordLogin}>
        <label className="login-field">
          <span className="login-label">Email</span>
          <input
            type="email"
            autoComplete="username"
            className="login-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@chambellan-conciergerie.fr"
            required
          />
        </label>

        <label className="login-field">
          <span className="login-label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            className="login-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        <label className="login-remember">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
          />
          <span>Remember this device for 30 days</span>
        </label>

        {error ? <p className="login-error">{error}</p> : null}

        <button type="submit" className="login-btn login-btn--primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {passkeyReady ? (
        <div className="login-passkey">
          <div className="login-divider">
            <span>or</span>
          </div>
          <button
            type="button"
            className="login-btn login-btn--passkey"
            onClick={handlePasskeyLogin}
            disabled={loading}
          >
            Continue with Face ID / Passkey
          </button>
          <p className="login-passkey-note">
            Use a registered passkey on this device for instant access.
          </p>
        </div>
      ) : null}

      <p className="login-foot">Authorized personnel only · Client data is private</p>
    </div>
  );
}

export async function registerPasskey(): Promise<{ ok: boolean; error?: string }> {
  if (!supportsPasskeys()) {
    return { ok: false, error: "Passkeys are not supported on this device" };
  }

  try {
    const optionsRes = await fetch("/api/auth/webauthn/register/options", {
      method: "POST",
    });
    const options = await optionsRes.json();
    if (!optionsRes.ok) {
      return { ok: false, error: options.error ?? "Could not start registration" };
    }

    const registration = await startRegistration({ optionsJSON: options });

    const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registration),
    });
    const verifyData = (await verifyRes.json()) as { error?: string };

    if (!verifyRes.ok) {
      return { ok: false, error: verifyData.error ?? "Registration failed" };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "NotAllowedError") {
      return { ok: false, error: "Passkey registration was cancelled" };
    }
    return { ok: false, error: "Passkey registration failed" };
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
