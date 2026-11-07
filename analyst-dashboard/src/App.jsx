import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api.js";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Modal from "./components/Modal.jsx";
import Toasts from "./components/Toasts.jsx";
import Overview from "./views/Overview.jsx";
import Experts from "./views/Experts.jsx";
import Survey from "./views/Survey.jsx";
import Tips from "./views/Tips.jsx";
import Notifications from "./views/Notifications.jsx";
import ExpertProfile from "./modals/ExpertProfile.jsx";
import AddExpert from "./modals/AddExpert.jsx";
import InviteResult from "./modals/InviteResult.jsx";
import ImportCsv from "./modals/ImportCsv.jsx";
import Reply from "./modals/Reply.jsx";
import { VIEWS, pathForView, viewFromPath } from "./lib/views.js";

const MODALS = { profile: ExpertProfile, addExpert: AddExpert, invite: InviteResult, import: ImportCsv, reply: Reply };
const RISK_KEY = "analyst-dashboard.risk";

function readStoredRisk() {
  try {
    return localStorage.getItem(RISK_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState(() => viewFromPath());
  const [risks, setRisks] = useState(null);
  const [riskCode, setRiskCode] = useState(readStoredRisk);
  const [experts, setExperts] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [tips, setTips] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  // Runs an API call and shows its error as a toast. Returns undefined on failure.
  const attempt = useCallback(async (call) => {
    try {
      return await call();
    } catch (error) {
      toast(error.message);
      return undefined;
    }
  }, [toast]);

  const loadRisks = useCallback(async () => {
    setLoadError(null);
    try {
      const [riskList, tipList] = await Promise.all([api.risks(), api.tips()]);
      setRisks(riskList);
      setTips(tipList);
      setRiskCode((code) => (riskList.some((r) => r.code === code) ? code : riskList[0]?.code ?? null));
    } catch (error) {
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => { loadRisks(); }, [loadRisks]);

  const loadExperts = useCallback(async () => {
    if (riskCode) setExperts(await api.experts(riskCode));
  }, [riskCode]);

  // Everything scoped to the selected Risk Code.
  useEffect(() => {
    if (!riskCode) return undefined;
    let current = true;
    try { localStorage.setItem(RISK_KEY, riskCode); } catch { /* storage unavailable */ }
    Promise.all([api.experts(riskCode), api.survey(riskCode), api.notifications(riskCode)])
      .then(([expertList, draft, sent]) => {
        if (!current) return;
        setExperts(expertList);
        setSurvey(draft);
        setNotifications(sent);
      })
      .catch((error) => current && toast(error.message));
    return () => { current = false; };
  }, [riskCode, toast]);

  const risk = risks?.find((item) => item.code === riskCode);
  const unreviewedCount = tips.filter((item) => item.status === "unreviewed" && item.riskCode === riskCode).length;

  // Keep the view in sync with the back/forward buttons.
  useEffect(() => {
    const onPopState = () => setView(viewFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goTo = (id) => {
    const path = pathForView(id);
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    setView(id);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchRisk = (code) => {
    setExperts([]);
    setSurvey(null);
    setNotifications([]);
    setRiskCode(code);
    toast(`Risk profile switched to ${code}`);
  };

  const replaceTip = (tip) => setTips((items) => items.map((item) => (item.id === tip.id ? tip : item)));
  const updateTip = async (id, patch) => {
    const tip = await attempt(() => api.updateTip(id, patch));
    if (tip) replaceTip(tip);
    return tip;
  };
  const replyTip = async (id, notes) => {
    const tip = await attempt(() => api.replyTip(id, notes));
    if (tip) replaceTip(tip);
    return tip;
  };

  const saveSurvey = async (questions) => {
    const saved = await attempt(() => api.saveSurvey(riskCode, questions));
    if (saved) setSurvey(saved);
    return saved;
  };
  const publishSurvey = async () => {
    const published = await attempt(() => api.publishSurvey(riskCode));
    if (published) {
      setSurvey(published);
      await attempt(loadExperts);
      toast(`Survey published to ${experts.filter((e) => e.used).length} experts`);
    }
  };

  const sendNotification = async (item) => {
    const sent = await attempt(() => api.sendNotification(riskCode, item));
    if (sent) {
      setNotifications((items) => [sent, ...items]);
      toast(`Notification queued for ${sent.count} experts`);
    }
    return sent;
  };

  const openModal = (type, props = {}) => setModal({ type, props });
  const closeModal = () => setModal(null);
  const ModalBody = modal && MODALS[modal.type];
  const activeView = VIEWS.find((item) => item.id === view);

  if (loadError) {
    return (
      <div className="load-screen">
        <strong>Could not load the dashboard</strong>
        <small>{loadError}</small>
        <button className="btn primary-action" onClick={loadRisks}>Try again</button>
      </div>
    );
  }
  if (!risks) return <div className="load-screen"><small>Loading risks…</small></div>;
  if (!risk) {
    return (
      <div className="load-screen">
        <strong>No risks are tracked yet</strong>
        <small>Run the daily job or <code>python seed_demo.py</code> in the backend, then reload.</small>
        <button className="btn primary-action" onClick={loadRisks}>Reload</button>
      </div>
    );
  }

  const shared = { risk, risks, riskCode, currentExperts: experts, toast, goTo, openModal, attempt };

  return (
    <>
      <div className="app-shell">
        <Sidebar view={view} goTo={goTo} unreviewedCount={unreviewedCount} mobileOpen={mobileNavOpen} />
        <main className="main-column">
          <Topbar
            section={activeView.title || activeView.label}
            risk={risk}
            risks={risks}
            onRiskChange={switchRisk}
            onToggleMenu={() => setMobileNavOpen((open) => !open)}
            toast={toast}
          />
          <div className="view-wrap">
            {view === "overview" && (
              <Overview {...shared} survey={survey} submissions={tips} unreviewedCount={unreviewedCount} />
            )}
            {view === "experts" && <Experts {...shared} />}
            {view === "survey" && (
              <Survey {...shared} survey={survey} onSave={saveSurvey} onPublish={publishSurvey} />
            )}
            {view === "feedback" && (
              <Tips {...shared} submissions={tips} updateSubmission={updateTip} unreviewedCount={unreviewedCount} />
            )}
            {view === "notifications" && (
              <Notifications {...shared} notifications={notifications} onQueue={sendNotification} />
            )}
          </div>
        </main>
      </div>

      <Modal open={Boolean(modal)} onClose={closeModal}>
        {ModalBody && (
          <ModalBody
            {...modal.props}
            {...shared}
            experts={experts}
            submissions={tips}
            reloadExperts={() => attempt(loadExperts)}
            replyTip={replyTip}
            onClose={closeModal}
          />
        )}
      </Modal>
      <Toasts items={toasts} />
    </>
  );
}
