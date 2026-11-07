import { useEffect, useState } from "react";
import { riskCatalogue } from "../data/mock.js";

const countries = [...new Set(riskCatalogue.flatMap((risk) => risk.countries))].sort((a, b) => a.localeCompare(b));

export default function Topbar({ section, risk, onRiskChange, onToggleMenu, toast }) {
  const [country, setCountry] = useCountry(risk);
  const countryRisks = riskCatalogue.filter((item) => item.countries.includes(country));

  const changeCountry = (value) => {
    setCountry(value);
    const first = riskCatalogue.find((item) => item.countries.includes(value));
    if (first && first.code !== risk.code) onRiskChange(first.code);
  };

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onToggleMenu} aria-label="Open navigation">☰</button>
      <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{section}</strong></div>
      <div className="topbar-tools">
        <div className="profile-picker">
          <label className="risk-picker-label" htmlFor="country-select">COUNTRY</label>
          <select className="country-picker" id="country-select" value={country} onChange={(event) => changeCountry(event.target.value)}>
            {countries.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
        <div className="profile-picker">
          <label className="risk-picker-label" htmlFor="risk-code-select">RISK PROFILE</label>
          <select className="risk-picker" id="risk-code-select" value={risk.code} onChange={(event) => onRiskChange(event.target.value)}>
            {countryRisks.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
          </select>
        </div>
        <div className="risk-title-preview" title={risk.title} aria-live="polite">{risk.title}</div>
        <span className="topbar-divider" />
        <button className="help-button" title="About this workspace" aria-label="About this workspace" onClick={() => toast("Analyst workspace · internal mockup · delivery is simulated")}>?</button>
      </div>
    </header>
  );
}

// Keep the selected country in sync with the active risk, while letting the analyst pick freely.
function useCountry(risk) {
  const [country, setCountry] = useState(risk.countries[0]);
  useEffect(() => {
    if (!risk.countries.includes(country)) setCountry(risk.countries[0]);
  }, [risk, country]);
  return [country, setCountry];
}
