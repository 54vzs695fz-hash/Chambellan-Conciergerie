import { SettingsClient } from "@/components/auth/SettingsClient";
import "../dashboard.css";
import "./settings.css";

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="settings-header">
        <p className="settings-kicker">Account</p>
        <h1 className="settings-title">Settings</h1>
        <p className="settings-lead">Manage your private access to Chambellan Concierge.</p>
      </header>
      <SettingsClient />
    </div>
  );
}
