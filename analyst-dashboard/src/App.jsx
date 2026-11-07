import { useCallback, useMemo, useState } from "react";
import { initialExperts, initialQuestions, initialSubmissions, riskCatalogue } from "./data/mock.js";
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
import { VIEWS } from "./lib/views.js";

const MODALS = { profile: ExpertProfile, addExpert: AddExpert, invite: InviteResult, import: ImportCsv, reply: Reply };

export default function App() {
  const [view, setView] = useState("overview");
  const [riskCode, setRiskCode] = useState("R-1062");
  const [experts, setExperts] = useState(initialExperts);
  const [questions, setQuestions] = useState(initialQuestions);
  const [surveyStatus, setSurveyStatus] = useState("Draft");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [notifications, setNotifications] = useState([]);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const risk = riskCatalogue.find((item) => item.code === riskCode) || riskCatalogue[0];
  const currentExperts = useMemo(
    () => experts.filter((expert) => expert.riskCodes.includes(riskCode)),
    [experts, riskCode]
  );
  const unreviewedCount = submissions.filter((item) => item.status === "unreviewed" && item.riskCode === riskCode).length;

  const toast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  const goTo = (id) => {
    setView(id);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchRisk = (code) => {
    setRiskCode(code);
    toast(`Risk profile switched to ${code}`);
  };

  const addExperts = (newExperts) => setExperts((items) => [...newExperts, ...items]);
  const updateSubmission = (id, patch) =>
    setSubmissions((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const openModal = (type, props = {}) => setModal({ type, props });
  const closeModal = () => setModal(null);
  const ModalBody = modal && MODALS[modal.type];
  const activeView = VIEWS.find((item) => item.id === view);

  const shared = { risk, riskCode, currentExperts, toast, goTo, openModal };

  return (
    <>
      <div className="app-shell">
        <Sidebar view={view} goTo={goTo} unreviewedCount={unreviewedCount} mobileOpen={mobileNavOpen} />
        <main className="main-column">
          <Topbar
            section={activeView.title || activeView.label}
            risk={risk}
            onRiskChange={switchRisk}
            onToggleMenu={() => setMobileNavOpen((open) => !open)}
            toast={toast}
          />
          <div className="view-wrap">
            {view === "overview" && (
              <Overview {...shared} questions={questions} surveyStatus={surveyStatus} submissions={submissions} unreviewedCount={unreviewedCount} />
            )}
            {view === "experts" && <Experts {...shared} />}
            {view === "survey" && (
              <Survey
                {...shared}
                questions={questions}
                setQuestions={setQuestions}
                surveyStatus={surveyStatus}
                onPublish={() => {
                  setSurveyStatus("Published");
                  toast(`Survey published to ${currentExperts.length} experts`);
                }}
              />
            )}
            {view === "feedback" && (
              <Tips {...shared} submissions={submissions} updateSubmission={updateSubmission} unreviewedCount={unreviewedCount} />
            )}
            {view === "notifications" && (
              <Notifications {...shared} notifications={notifications} onQueue={(item) => setNotifications((items) => [item, ...items])} />
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
            submissions={submissions}
            addExperts={addExperts}
            updateSubmission={updateSubmission}
            onClose={closeModal}
          />
        )}
      </Modal>
      <Toasts items={toasts} />
    </>
  );
}
