import { useState } from "react";
import {
  BrainCircuit,
  LayoutDashboard,
  Files,
  MessageCircle,
  Settings,
  Search,
  Bell,
  Upload,
  FileText,
  Sparkles,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  Plus,
  Menu,
  X,
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [active, setActive] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const filteredDocuments = documents.filter((doc) =>
    (doc.name || "").toLowerCase().includes(question.trim().toLowerCase())
  );

  async function uploadPdf() {
    if (!file) {
      setNotice("Please select a PDF first.");
      return;
    }

    setUploading(true);
    setNotice("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API}/pdf/upload`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setDocuments((previous) => [
        {
          id: data.stored_name,
          name: data.filename,
          pages: data.pages,
          characters: data.text_characters,
        },
        ...previous,
      ]);
      setFile(null);

setNotice(
  data.text_characters > 0
    ? `Uploaded ${data.filename}. Extracted ${data.text_characters} characters.`
    : `Uploaded ${data.filename}, but no selectable text was found. It may be image-based.`
);

await loadDocuments();
    } catch (error) {
      setNotice(
        error.message.includes("Failed to fetch")
          ? "Cannot connect. Check that your backend is running and CORS is enabled."
          : error.message
      );
    } finally {
      setUploading(false);
    }
  }

  
async function loadDocuments() {
  setActive("My Documents");

  try {
    const response = await fetch(`${API}/pdf/`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load documents.");
    }

    setDocuments(
      data.files.map((item) => ({
        id: item.stored_name,
        name: item.original_name || item.stored_name,
        pages: item.pages,
        characters: item.text_characters,
        size: item.size_bytes,
      }))
    );
  } catch (error) {
    setNotice(`Could not load documents: ${error.message}`);
  }
}

async function askAssistant(prompt) {
  const questionText = prompt.trim();
  if (!questionText || thinking) return;

  setChatMessages((prev) => [...prev, { role: "user", text: questionText }]);
  setQuestion("");
  setThinking(true);
  setNotice("");

  try {
    let docs = documents;
    if (!docs.length) {
      const listRes = await fetch(`${API}/pdf/`);
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.detail || "Could not load PDFs.");
      docs = (listData.files || []).map((f) => ({
        id: f.stored_name,
        name: f.original_name || f.stored_name,
      }));
      setDocuments(docs);
    }
    if (!docs.length) throw new Error("Upload a PDF about your topic first.");

    // Read uploaded PDFs so the AI can use the document that contains the topic.
    const chunks = [];
    for (const doc of docs) {
      if (chunks.join("\n\n").length >= 18000) break;
      const pdfRes = await fetch(`${API}/pdf/${encodeURIComponent(doc.id)}/text`);
      const pdfData = await pdfRes.json();
      if (!pdfRes.ok) continue;
      const text = (typeof pdfData === "string"
        ? pdfData
        : pdfData.text || pdfData.extracted_text || pdfData.content || pdfData.extracted_text_content || "").trim();
      if (text) chunks.push(`DOCUMENT: ${doc.name || "Study notes"}\n${text}`);
    }

    const context = chunks.join("\n\n").slice(0, 20000);
    if (!context) throw new Error("No readable text found in your PDFs. Upload a text-based PDF.");

    const aiRes = await fetch(`${API}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: questionText,
        context,
        document_name: docs.map((d) => d.name).join(", ").slice(0, 255) || "Study notes",
      }),
    });
    const result = await aiRes.json();
    if (!aiRes.ok) throw new Error(result.detail || "AI request failed.");

    setChatMessages((prev) => [...prev, { role: "assistant", text: result.answer }]);
  } catch (err) {
    setChatMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
  } finally {
    setThinking(false);
  }
}

function navigate(section) {
  setActive(section);
  setMobileMenu(false);
  setNotice("");
  if (section === "My Documents") loadDocuments();
}

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><BrainCircuit size={25} /></div>
          <div>
            <div className="brand-name">EduAI</div>
            <div className="brand-caption">YOUR STUDY SPACE</div>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="navigation">
          {[
            { label: "Dashboard", icon: LayoutDashboard },
            { label: "My Documents", icon: Files },
            { label: "AI Study Assistant", icon: MessageCircle },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${active === label ? "nav-active" : ""}`}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={19} /></div>
            <strong>Your learning journey</strong>
            <p>Small steps every day lead to big results.</p>
          </div>
          <button
            className={`nav-item ${active === "Settings" ? "nav-active" : ""}`}
            onClick={() => navigate("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
          <div className="profile">
            <div className="avatar">E</div>
            <div className="profile-text">
              <strong>Student Workspace</strong>
              <span>Personal study space</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{active}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label="Search documents"
                placeholder="Search your workspace..."
                onChange={(event) => {
                  setQuestion(event.target.value);
                }}
              />
            </div>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotice("You're all caught up!")}
            >
              <Bell size={19} /><span />
            </button>
          </div>
        </header>

        <div className="page-content">
          {active === "Dashboard" && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <Sparkles size={14} /> YOUR PERSONAL LEARNING SPACE
                  </div>
                  <h1>Make learning <span>effortless.</span></h1>
                  <p className="welcome-subtitle">
                    Your notes, your ideas, your next breakthrough.
                  </p>
                </div>
                <div className="date-chip">
                  <Clock3 size={16} /> Your study workspace
                </div>
              </section>

              <section className="hero-card">
                <div className="hero-content">
                  <div className="hero-pill">
                    <Sparkles size={14} /> STUDY SMARTER
                  </div>
                  <h2>Turn your notes into<br />your next big idea.</h2>
                  <p>
                    Upload your study material and get ready to learn in a
                    whole new way.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => document.getElementById("pdf-file")?.click()}
                  >
                    <Plus size={18} /> Upload study material
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-glow" />
                  <div className="floating-note note-one"><FileText size={20} /></div>
                  <div className="floating-note note-two"><Sparkles size={20} /></div>
                  <div className="brain-orb"><BrainCircuit size={78} strokeWidth={1.15} /></div>
                </div>
              </section>

              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Study materials</span>
                    <div className="stat-icon purple"><Files size={19} /></div>
                  </div>
                  <div className="stat-number">{documents.length}</div>
                  <div className="stat-caption">Documents in this session</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Pages processed</span>
                    <div className="stat-icon blue"><FileText size={19} /></div>
                  </div>
                  <div className="stat-number">
                    {documents.reduce((sum, doc) => sum + (doc.pages || 0), 0)}
                  </div>
                  <div className="stat-caption">Across loaded documents</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Study tools</span>
                    <div className="stat-icon orange"><BrainCircuit size={19} /></div>
                  </div>
                  <div className="stat-number">3</div>
                  <div className="stat-caption">Upload, summarize, ask</div>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="panel upload-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Upload your material</h3>
                      <p>Start with a PDF from your computer.</p>
                    </div>
                    <div className="heading-icon"><Upload size={20} /></div>
                  </div>

                  <label className="dropzone" htmlFor="pdf-file">
                    <div className="upload-illustration"><Upload size={24} /></div>
                    <strong>{file ? file.name : "Choose a PDF to get started"}</strong>
                    <span>{file ? "Ready to upload" : "Click here to browse your files"}</span>
                    <span className="file-limit">PDF format Â· Maximum 10 MB</span>
                  </label>

                  <input
                    id="pdf-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    hidden
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      setNotice("");
                    }}
                  />

                  <button
                    className="primary-button full-button"
                    disabled={uploading}
                    onClick={uploadPdf}
                  >
                    <Upload size={17} />
                    {uploading ? "Uploading..." : "Upload PDF"}
                  </button>
                  {notice && <div className="notice">{notice}</div>}
                </div>

                <div className="panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent materials</h3>
                      <p>Your latest study documents.</p>
                    </div>
                    <button className="text-button" onClick={loadDocuments}>
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>

                  {documents.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Files size={25} /></div>
                      <strong>No documents yet</strong>
                      <p>Your uploaded PDFs will appear here.</p>
                    </div>
                  ) : (
                    <div className="document-list">
                      {filteredDocuments.slice(0, 4).map((doc) => (
                        <div className="document-row" key={doc.id}>
                          <div className="pdf-icon"><FileText size={20} /></div>
                          <div className="document-info">
                            <strong>{doc.name}</strong>
                            <span>{doc.pages ?? "â€”"} pages Â· PDF document</span>
                          </div>
                          <CheckCircle2 className="document-check" size={18} />
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="secondary-button full-button"
                    onClick={() => navigate("AI Study Assistant")}
                  >
                    <Sparkles size={17} /> Study with AI
                  </button>
                </div>
              </section>
            </>
          )}

          {active === "My Documents" && (
            <section className="inner-page">
              <div className="inner-heading">
                <div>
                  <div className="eyebrow">YOUR LIBRARY</div>
                  <h1>My documents<span>.</span></h1>
                  <p>All the study material you've uploaded.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setActive("Dashboard");
                    setTimeout(() => document.getElementById("pdf-file")?.click(), 0);
                  }}
                >
                  <Upload size={17} /> Choose PDF
                </button>
              </div>
              <div className="panel library-panel">
                {notice && <div className="notice">{notice}</div>}
                {documents.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Files size={28} /></div>
                    <strong>Your library is waiting</strong>
                    <p>Upload a PDF from the dashboard to get started.</p>
                    <button className="secondary-button" onClick={() => navigate("Dashboard")}>
                      Back to dashboard
                    </button>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Search size={28} /></div>
                    <strong>No matching documents</strong>
                    <p>Try another search term or clear the search box.</p>
                  </div>
                ) : (
                  <div className="document-list">
                    {filteredDocuments.map((doc) => (
                      <div className="document-row" key={doc.id}>
                        <div className="pdf-icon"><FileText size={20} /></div>
                        <div className="document-info">
                          <strong>{doc.name}</strong>
                          <span>{doc.pages ?? "Unknown"} pages Â· {doc.characters ?? "Text not loaded"} characters</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {active === "AI Study Assistant" && (
            <section className="inner-page">
              <div className="eyebrow"><Sparkles size={14} /> YOUR LEARNING COMPANION</div>
              <h1>AI Study Assistant<span>.</span></h1>
              <p className="welcome-subtitle">Ask questions about your uploaded study documents.</p>

              <div className="panel assistant-panel">
                <div className="assistant-header">
                  <div className="assistant-avatar"><BrainCircuit size={24} /></div>
                  <div>
                    <strong>EduAI Assistant</strong>
                    <span>PDF study workspace</span>
                  </div>
                  <span className="settings-status">OLLAMA AI</span>
                </div>

                <div className="chat-message">
                  <div className="assistant-avatar small"><Sparkles size={17} /></div>
                  <div className="message-bubble">
                    <strong>Let's study smarter.</strong>
                    <p>
                      I can answer questions using the text in your uploaded PDFs, powered by your local Qwen model through Ollama.
                    </p>
                  </div>
                </div>

                <div className="chat-history" aria-live="polite">
                  {chatMessages.map((message, index) => (
                    <div className="chat-message" key={`${message.role}-${index}`}>
                      <div className="message-bubble">
                        <strong>{message.role === "user" ? "You" : "EduAI Assistant"}</strong>
                        <p style={{ whiteSpace: "pre-wrap" }}>{message.text}</p>
                      </div>
                    </div>
                  ))}
                  {thinking && <p className="assistant-disclaimer">Reading your document...</p>}
                </div>

                <div className="prompt-chips">
                  {["Summarize my notes", "Explain key concepts", "Make revision questions"].map((prompt) => (
                    <button key={prompt} type="button" disabled={thinking} onClick={() => askAssistant(prompt)}>
                      <Sparkles size={14} /> {prompt}
                    </button>
                  ))}
                </div>

                <form
                  className="chat-input-row"
                  onSubmit={(event) => {
                 event.preventDefault();
                 askAssistant(question);
                  }}
                >
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about your study material..."
                    disabled={thinking}
                  />
                  <button className="send-button" type="submit" aria-label="Send question" disabled={thinking || !question.trim()}>
                    <ArrowUpRight size={20} />
                  </button>
                </form>
                {notice && <div className="notice">{notice}</div>}
                <p className="assistant-disclaimer">
                  Powered by local Qwen AI through Ollama. Upload a PDF containing the topic you want to discuss.
                </p>
              </div>
            </section>
          )}

          {active === "Settings" && (
            <section className="inner-page">
              <div className="eyebrow">PREFERENCES</div>
              <h1>Settings<span>.</span></h1>
              <p className="welcome-subtitle">Your EduAI workspace configuration.</p>
              <div className="panel settings-panel">
                <div className="settings-row">
                  <div><strong>Backend connection</strong><p>FastAPI at {API}</p></div>
                  <span className="settings-status">Local development</span>
                </div>
                <div className="settings-row">
                  <div><strong>AI provider</strong><p>Ollama running locally with Qwen 2.5 3B.</p></div>
                  <span className="settings-status">CONNECTED</span>
                </div>
                <div className="settings-row">
                  <div><strong>PDF uploads</strong><p>PDF files up to 10 MB.</p></div>
                  <CheckCircle2 className="document-check" size={20} />
                </div>
              </div>
            </section>
          )}

          <footer className="footer">
            <span>EduAI <span className="footer-dot">âœ¦</span> Learn with purpose.</span>
            <span>Built for your next breakthrough.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
