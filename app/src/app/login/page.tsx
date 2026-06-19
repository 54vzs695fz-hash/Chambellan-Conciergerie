import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import "./login.css";

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-page-glow" aria-hidden />
      <Suspense fallback={<div className="login-card login-card--loading">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
