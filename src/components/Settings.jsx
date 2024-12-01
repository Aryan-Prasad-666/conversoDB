import React, { useState } from "react";
import "./Settings.css";
import Navbar from "./Navbar";

const Settings = () => {
  const [settings, setSettings] = useState({
    theme: "Light",
    notifications: true,
    language: "English",
  });

  const handleToggle = (e) => {
    const { name, checked } = e.target;
    setSettings({ ...settings, [name]: checked });
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  return (
    <div className="settings-page">
      <Navbar />
      <div className="settings-wrapper">
        <div className="settings-card">
          <h2 className="settings-title">Settings</h2>
          <div className="settings-field">
            <label>Theme</label>
            <select
              name="theme"
              value={settings.theme}
              onChange={handleSelectChange}
              className="settings-select"
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Notifications</label>
            <input
              type="checkbox"
              name="notifications"
              checked={settings.notifications}
              onChange={handleToggle}
            />
          </div>
          <div className="settings-field">
            <label>Language</label>
            <select
              name="language"
              value={settings.language}
              onChange={handleSelectChange}
              className="settings-select"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>
          <button className="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
