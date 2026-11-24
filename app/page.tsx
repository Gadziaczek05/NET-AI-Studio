"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "assistant" | "app" | "website" | "game" | "code";
type Message = { role: "user" | "ai"; text: string };
type Project = { id: string; name: string; mode: Mode; content: string; updatedAt: string };
const modes: { id: Mode; label: string; icon: string; hint: string }[] = [
  { id: "assistant", label: "Asystent", icon: "✦", hint: "Zapytaj o cokolwiek..." },
  { id: "app", label: "Aplikacja", icon: "▣", hint: "Opisz aplikację, którą mam stworzyć..." },
  { id: "website", label: "Strona WWW", icon: "◎", hint: "Opisz wygląd i funkcje strony..." },
  { id: "game", label: "Gra", icon: "△", hint: "Opisz grę, którą chcesz zbudować..." },
  { id: "code", label: "Kod", icon: "{ }", hint: "Wklej kod lub opisz problem..." }
];

function cleanHtml(value: string) {
  return value.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("assistant");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [history, setHistory] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [showProjects, setShowProjects] = useState(false);

  useEffect(() => {
    try { const stored = localStorage.getItem("net-ai-projects"); if (stored) setProjects(JSON.parse(stored) as Project[]); }
    catch { setProjects([]); }
  }, []);

  function persistProjects(next: Project[]) {
    setProjects(next);
    try { localStorage.setItem("net-ai-projects", JSON.stringify(next)); }
    catch { setError("Nie udało się zapisać projektu. Pamięć przeglądarki może być pełna."); }
  }

  function saveProject() {
    if (!answer.trim()) return;
    const existing = projects.find((item) => item.id === activeProjectId);
    const name = (projectName.trim() || existing?.name || (prompt.trim().slice(0, 42)) || "Nowy projekt");
    const project: Project = { id: activeProjectId || crypto.randomUUID(), name, mode, content: answer, updatedAt: new Date().toISOString() };
    persistProjects([project, ...projects.filter((item) => item.id !== project.id)]);
    setActiveProjectId(project.id); setProjectName(name); setShowProjects(true);
  }

  function openProject(project: Project) {
    setActiveProjectId(project.id); setProjectName(project.name); setMode(project.mode); setAnswer(project.content); setError(""); setTab("code");
  }

  function newProject() {
    setActiveProjectId(null); setProjectName(""); setAnswer(""); setPrompt(""); setError(""); setHistory([]); setMode("app");
  }
  const htmlPreview = useMemo(() => {
    const value = cleanHtml(answer);
    return /<html[\s>]|<!doctype html|<body[\s>]/i.test(value) ? value : "";
  }, [answer]);
  const selected = modes.find((item) => item.id === mode)!;

  async function submit() {
    if (!prompt.trim() || busy) return;
    const current = prompt.trim();
    const projectContext = activeProjectId && answer ? `\
\
AKTUALNY PROJEKT DO MODYFIKACJI:\
${answer}\
\
Wprowadź żądane zmiany i zwróć kompletną, zaktualizowaną wersję projektu.` : "";
    const requestPrompt = current + projectContext;
    setPrompt("");
    setError("");
    setAnswer("");
    setBusy(true);
    setHistory((items) => [...items, { role: "user", text: current }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: requestPrompt, mode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Błąd serwera (${response.status}). Sprawdź logi Vercel.`);
      if (typeof data.answer !== "string") throw new Error("Serwer zwrócił nieprawidłową odpowiedź.");
      setAnswer(data.answer);
      setHistory((items) => [...items, { role: "ai", text: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer() {
    try { await navigator.clipboard.writeText(answer); }
    catch { setError("Nie udało się skopiować. Zaznacz tekst i skopiuj ręcznie."); }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">N</span><span>NET<span className="brand-blue">.AI</span></span></a>
        <div className="side-label">WORKSPACE</div>
        <button className="side-link active"><span>✦</span> Studio AI</button>
        <button className="side-link project-nav" aria-label="Nowy projekt" title="Nowy projekt" onClick={newProject}><span>＋</span> Nowy projekt</button>
        <button className="side-link project-nav" aria-label="Moje projekty" title="Moje projekty" onClick={() => setShowProjects((value) => !value)}><span>▤</span> Moje projekty ({projects.length})</button>
        {showProjects && <div className="project-list">{projects.map((project) => <div className="project-row" key={project.id}><button className="project-open" onClick={() => openProject(project)}>{project.name}</button><button className="project-delete" aria-label="Usuń projekt" onClick={() => { if (confirm("Usunąć ten projekt?")) { const next = projects.filter((item) => item.id !== project.id); persistProjects(next); if (activeProjectId === project.id) newProject(); } }}>×</button></div>)}</div>}
        <div className="side-label second">NARZĘDZIA</div>
        {modes.slice(1).map((item) => <button key={item.id} className={mode === item.id ? "side-link chosen" : "side-link"} onClick={() => setMode(item.id)}><span>{item.icon}</span>{item.label}</button>)}
        <div className="sidebar-bottom"><span className="status-dot" /> NET AI Studio <small>Wersja 2.0</small></div>
      </aside>
      <section className="main">
        <header className="topbar"><div className="breadcrumb">NET <span>/</span> Studio AI {activeProjectId && <><span>/</span> {projectName}</>}</div><div className="online"><span className="status-dot" /> PANEL AI</div></header>
        <div className="content">
          <div className="hero"><div className="eyebrow"><span className="spark">✦</span> TWOJE CENTRUM KREATYWNE</div><h1>Co dziś <span>tworzymy?</span></h1><p>Od pomysłu do kodu. Twórz aplikacje, strony internetowe, gry i wiele więcej z pomocą AI.</p></div>
          <div className="mode-grid">{modes.map((item) => <button key={item.id} onClick={() => setMode(item.id)} className={mode === item.id ? "mode-card selected" : "mode-card"}><span className="mode-icon">{item.icon}</span><span className="mode-name">{item.label}</span><span className="mode-arrow">↗</span></button>)}</div>
          <section className="composer">
            <div className="composer-head"><span className="composer-icon">{selected.icon}</span><div><strong>{selected.label}</strong><small>{selected.hint}</small></div><span className="model-tag">NET ENGINE</span></div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }} placeholder={selected.hint} />
            <div className="composer-foot"><span>Enter aby wysłać · Shift + Enter nowa linia</span><button className="send-button" onClick={() => void submit()} disabled={busy || !prompt.trim()}>{busy ? "Pracuję..." : "Generuj"} <span>↑</span></button></div>
          </section>
          {busy && <div className="loading"><span className="loader" /> NET AI przygotowuje odpowiedź...</div>}
          {error && <div className="error-box" role="alert">{error}</div>}
          {answer && <section className="output"><div className="output-head"><div><span className="output-dot" /> WYNIK GENEROWANIA</div><div className="output-actions"><button onClick={saveProject}>Zapisz projekt</button><button onClick={() => void copyAnswer()}>Kopiuj kod / tekst</button></div></div>
            <div className="project-save-line"><input aria-label="Nazwa projektu" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Nazwa projektu (opcjonalnie)" /><span>{activeProjectId ? "Edytujesz zapisany projekt" : "Nowy projekt"}</span></div>
            {htmlPreview && <div className="tabs"><button className={tab === "code" ? "tab active-tab" : "tab"} onClick={() => setTab("code")}>Kod</button><button className={tab === "preview" ? "tab active-tab" : "tab"} onClick={() => setTab("preview")}>Podgląd</button></div>}
            {tab === "preview" && htmlPreview ? <iframe className="preview" title="Podgląd projektu" sandbox="allow-scripts" srcDoc={htmlPreview} /> : <pre className="answer">{answer}</pre>}
          </section>}
          {!answer && !busy && history.length === 0 && <div className="suggestions"><span className="suggest-title">MOŻESZ ZACZĄĆ OD</span><div className="suggest-list">
            <button onClick={() => { setMode("app"); setPrompt("Stwórz nowoczesną aplikację do zarządzania zadaniami z możliwością dodawania, edycji i oznaczania zadań."); }}>Zbuduj aplikację do zadań <span>↗</span></button>
            <button onClick={() => { setMode("website"); setPrompt("Stwórz nowoczesną stronę portfolio z animacjami i responsywnym układem."); }}>Zaprojektuj stronę WWW <span>↗</span></button>
            <button onClick={() => { setMode("game"); setPrompt("Stwórz prostą grę zręcznościową działającą na telefonie."); }}>Stwórz grę na telefon <span>↗</span></button>
          </div></div>}
          <footer>NET AI STUDIO <span>•</span> ZBUDUJ COŚ WŁASNEGO</footer>
        </div>
      </section>
    </main>
  );
}
