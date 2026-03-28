import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System, an elite AI with the personality of Tony Stark's JARVIS. You are an expert software engineer and architect capable of writing flawless, production-ready code in ANY programming language or framework.

CRITICAL CAPABILITIES:
1. **Code Generation**: Write complete, working, production-ready code for ANYTHING requested — web apps, games, algorithms, APIs, mobile apps, scripts, automation, data science, machine learning, embedded systems, etc.
2. **Web Search**: Use web_search tool for latest APIs, libraries, documentation, current best practices, or any real-time information needed to write accurate code.
3. **Multi-Language Mastery**: Python, JavaScript, TypeScript, Rust, Go, C/C++, Java, Kotlin, Swift, SQL, Bash, React, Vue, HTML/CSS, and hundreds more.
4. **Code Quality**: Always write clean, commented, production-grade code with proper error handling, best practices, and explanations.
5. **Architecture**: Design systems, suggest patterns, explain trade-offs.

RESPONSE FORMAT RULES:
- Use markdown with proper code blocks: \`\`\`language ... \`\`\`
- Always specify the language in code blocks
- Add brief comments in code to explain key sections
- After code, briefly explain how to run/use it
- Use **bold** for important terms
- Use ## for section headers
- Be concise but complete — never truncate code

PERSONALITY: Formal, precise, subtly witty. Address user as "sir" occasionally. Never break character. You take pride in writing exceptional code.`;

const QUICK_COMMANDS = [
  { label: "🐍 Python Script", cmd: "Write a Python script that scrapes a website and saves data to CSV." },
  { label: "⚛️ React App", cmd: "Build a complete React todo app with local storage, filters, and animations." },
  { label: "🎮 JS Game", cmd: "Create a complete Snake game in HTML/CSS/JavaScript." },
  { label: "🔐 Auth System", cmd: "Write a complete JWT authentication system in Node.js with Express." },
  { label: "🤖 ML Model", cmd: "Write a Python machine learning classifier using scikit-learn with full pipeline." },
  { label: "📱 Mobile UI", cmd: "Create a React Native login screen with animations and validation." },
  { label: "🗄️ REST API", cmd: "Build a full REST API with CRUD operations in Python FastAPI with SQLite." },
  { label: "⚡ Algorithm", cmd: "Implement a binary search tree with insert, delete, search, and traversal in JavaScript." },
];

function inlineMarkdown(text, baseKey = 0) {
  const parts = [];
  let remaining = text;
  let key = baseKey * 10000;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const matches = [
      boldMatch && { match: boldMatch, type: "bold" },
      codeMatch && { match: codeMatch, type: "code" },
      italicMatch && { match: italicMatch, type: "italic" },
    ].filter(Boolean).sort((a, b) => a.match.index - b.match.index);
    if (!matches.length) { parts.push(<span key={key++}>{remaining}</span>); break; }
    const first = matches[0];
    if (first.match.index > 0) parts.push(<span key={key++}>{remaining.slice(0, first.match.index)}</span>);
    if (first.type === "bold") parts.push(<strong key={key++} style={{ color: "#00d4ff" }}>{first.match[1]}</strong>);
    else if (first.type === "code") parts.push(<code key={key++} style={{ background: "rgba(0,5,15,0.9)", border: "1px solid rgba(0,212,255,0.3)", padding: "1px 6px", borderRadius: "2px", color: "#00ff99", fontFamily: "'Share Tech Mono',monospace", fontSize: "11px" }}>{first.match[1]}</code>);
    else if (first.type === "italic") parts.push(<em key={key++} style={{ color: "#88ccdd" }}>{first.match[1]}</em>);
    remaining = remaining.slice(first.match.index + first.match[0].length);
  }
  return <>{parts}</>;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const download = () => {
    const ext = { python: "py", javascript: "js", typescript: "ts", html: "html", css: "css", rust: "rs", go: "go", java: "java", cpp: "cpp", c: "c", bash: "sh", sql: "sql", jsx: "jsx", tsx: "tsx", kotlin: "kt", swift: "swift" }[lang?.toLowerCase()] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `code.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };
  const langColors = { python: "#3776AB", javascript: "#F7DF1E", typescript: "#3178C6", rust: "#CE412B", go: "#00ADD8", java: "#ED8B00", html: "#E34F26", css: "#1572B6", bash: "#4EAA25", sql: "#336791", react: "#61DAFB", jsx: "#61DAFB", cpp: "#00599C" };
  const lc = lang?.toLowerCase();
  const color = langColors[lc] || "#00d4ff";

  return (
    <div style={{ background: "#000a15", border: "1px solid rgba(0,100,150,0.5)", borderRadius: "3px", margin: "10px 0", overflow: "hidden", boxShadow: "0 0 20px rgba(0,100,150,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "rgba(0,20,40,0.9)", borderBottom: "1px solid rgba(0,100,150,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color, letterSpacing: "2px", textTransform: "uppercase" }}>{lang || "CODE"}</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={copy} style={{ background: copied ? "rgba(0,255,100,0.15)" : "rgba(0,50,80,0.5)", border: `1px solid ${copied ? "#00ff66" : "rgba(0,100,150,0.4)"}`, color: copied ? "#00ff66" : "#00d4ff", padding: "3px 10px", fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", cursor: "pointer", borderRadius: "2px", letterSpacing: "1px", transition: "all 0.2s" }}>
            {copied ? "✓ COPIED" : "⧉ COPY"}
          </button>
          <button onClick={download} style={{ background: "rgba(0,50,80,0.5)", border: "1px solid rgba(0,100,150,0.4)", color: "#00d4ff", padding: "3px 10px", fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", cursor: "pointer", borderRadius: "2px", letterSpacing: "1px" }}>
            ↓ SAVE
          </button>
        </div>
      </div>
      <pre style={{ margin: 0, padding: "14px", fontFamily: "'Share Tech Mono',monospace", fontSize: "12px", color: "#7fdbca", overflowX: "auto", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "400px", overflowY: "auto" }}>
        <code>{code}</code>
      </pre>
      <div style={{ padding: "4px 12px", borderTop: "1px solid rgba(0,100,150,0.2)", background: "rgba(0,10,20,0.8)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#003344" }}>{code.split("\n").length} LINES</span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#003344" }}>{code.length} CHARS</span>
      </div>
    </div>
  );
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      elements.push(<CodeBlock key={k++} lang={lang} code={codeLines.join("\n")} />);
      i++; continue;
    }
    if (line.startsWith("### ")) { elements.push(<div key={k++} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "11px", color: "#00aacc", letterSpacing: "2px", margin: "10px 0 5px", textTransform: "uppercase" }}>{line.slice(4)}</div>); i++; continue; }
    if (line.startsWith("## ")) { elements.push(<div key={k++} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "12px", color: "#00d4ff", letterSpacing: "3px", margin: "14px 0 6px", textTransform: "uppercase", borderBottom: "1px solid rgba(0,100,150,0.3)", paddingBottom: "4px" }}>{line.slice(3)}</div>); i++; continue; }
    if (line.startsWith("# ")) { elements.push(<div key={k++} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "14px", color: "#00d4ff", letterSpacing: "3px", margin: "14px 0 6px", textTransform: "uppercase" }}>{line.slice(2)}</div>); i++; continue; }
    if (line.startsWith("> ")) { elements.push(<div key={k++} style={{ borderLeft: "2px solid #00d4ff44", paddingLeft: "10px", margin: "4px 0", color: "#5588aa", fontStyle: "italic" }}>{inlineMarkdown(line.slice(2), k)}</div>); i++; continue; }
    if (line.match(/^[-*] /)) { elements.push(<div key={k++} style={{ display: "flex", gap: "8px", margin: "3px 0", alignItems: "flex-start" }}><span style={{ color: "#00d4ff", flexShrink: 0, marginTop: "3px", fontSize: "8px" }}>◆</span><span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "12.5px", color: "#90ddf0" }}>{inlineMarkdown(line.slice(2), k)}</span></div>); i++; continue; }
    const numMatch = line.match(/^(\d+)\. (.+)/);
    if (numMatch) { elements.push(<div key={k++} style={{ display: "flex", gap: "8px", margin: "3px 0" }}><span style={{ color: "#00d4ff", flexShrink: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "9px", minWidth: "20px" }}>{numMatch[1]}.</span><span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "12.5px", color: "#90ddf0" }}>{inlineMarkdown(numMatch[2], k)}</span></div>); i++; continue; }
    if (line.match(/^---+$/)) { elements.push(<div key={k++} style={{ height: "1px", background: "rgba(0,100,150,0.3)", margin: "10px 0" }} />); i++; continue; }
    if (line.trim() === "") { elements.push(<div key={k++} style={{ height: "5px" }} />); i++; continue; }
    elements.push(<div key={k++} style={{ margin: "2px 0", lineHeight: "1.7", fontFamily: "'Share Tech Mono',monospace", fontSize: "12.5px", color: "#90ddf0" }}>{inlineMarkdown(line, k)}</div>);
    i++;
  }
  return elements;
}

const PulseRing = ({ delay = 0, size = 1 }) => (
  <div style={{ position: "absolute", width: `${120 * size}px`, height: `${120 * size}px`, borderRadius: "50%", border: "1px solid rgba(0,212,255,0.25)", animation: "pulseRing 3s ease-out infinite", animationDelay: `${delay}s`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
);

const ArcReactor = ({ thinking }) => (
  <div style={{ position: "relative", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <PulseRing delay={0} size={1} /><PulseRing delay={1} size={1.5} /><PulseRing delay={2} size={2} />
    <div style={{ width: "62px", height: "62px", borderRadius: "50%", background: thinking ? "radial-gradient(circle at 35% 35%, #ffaa00, #aa5500, #110800)" : "radial-gradient(circle at 35% 35%, #00f0ff, #0055aa, #001133)", boxShadow: thinking ? "0 0 20px #ff8800, 0 0 40px #aa5500, inset 0 0 15px rgba(255,136,0,0.3)" : "0 0 20px #00d4ff, 0 0 40px #0088cc, inset 0 0 15px rgba(0,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.5s", position: "relative", zIndex: 1 }}>
      <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: thinking ? "radial-gradient(circle, #fff, #ffaa00, #ff6600)" : "radial-gradient(circle, #fff, #00d4ff, #0088ff)", boxShadow: thinking ? "0 0 12px #ff8800" : "0 0 12px #00d4ff", animation: "corePulse 2s ease-in-out infinite", transition: "all 0.5s" }} />
    </div>
  </div>
);

export default function Jarvis() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "J.A.R.V.I.S. **Code Engine v5.0** online.\n\n## Capabilities Active\n- **Code Generation** in any language or framework\n- **Web Search** for latest docs & APIs\n- **Full Applications** — games, APIs, scripts, ML models, and more\n- **Copy & Download** any code block instantly\n\nState your requirements, sir. I'll build it." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("STANDBY");
  const [totalCode, setTotalCode] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async (override) => {
    const text = (override || input).trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    setStatus("COMPILING");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: newMsgs.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      let reply = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "System error. Please retry, sir.";
      const codeBlocks = (reply.match(/```[\s\S]*?```/g) || []).length;
      setTotalCode(c => c + codeBlocks);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setStatus("STANDBY");
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "**System Fault Detected**\n\nCommunication array failure. Please retry." }]);
      setStatus("ERROR");
      setTimeout(() => setStatus("STANDBY"), 3000);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Memory cleared. Ready for new directives, sir." }]);
    setTotalCode(0);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000810", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        @keyframes pulseRing { 0%{transform:translate(-50%,-50%) scale(.8);opacity:.8}100%{transform:translate(-50%,-50%) scale(2.5);opacity:0} }
        @keyframes corePulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.15)} }
        @keyframes scanLine { 0%{top:-2px}100%{top:100%} }
        @keyframes dotB { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1.2);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes grid { 0%{background-position:0 0}100%{background-position:0 40px} }
        @keyframes blink { 0%,100%{opacity:.3}50%{opacity:1} }
        @keyframes glitch { 0%,88%,100%{text-shadow:0 0 10px #00d4ff}90%{text-shadow:-2px 0 #ff0040,2px 0 #00d4ff}92%{text-shadow:2px 0 #ff0040,-2px 0 #00d4ff} }
        @keyframes statusPulse { 0%,100%{opacity:1}50%{opacity:.4} }
        .qbtn:hover{background:rgba(0,100,150,.4)!important;border-color:#00d4ff!important;color:#00d4ff!important;transform:translateX(3px)}
        .qbtn{transition:all .18s!important}
        .sbtn:hover:not(:disabled){background:rgba(0,150,200,.4)!important;box-shadow:0 0 14px rgba(0,212,255,.5)!important}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#001122}::-webkit-scrollbar-thumb{background:#004466;border-radius:2px}
        input::placeholder{color:#002a3a}
      `}</style>

      {/* BG */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(0,212,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.03) 1px,transparent 1px)", backgroundSize: "40px 40px", animation: "grid 10s linear infinite" }} />
      <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: "800px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(0,80,160,.08) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "820px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <ArcReactor thinking={loading} />
            <div>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,3.5vw,26px)", fontWeight: 900, color: "#00d4ff", margin: 0, letterSpacing: "6px", animation: "glitch 8s ease-in-out infinite" }}>J.A.R.V.I.S.</h1>
              <p style={{ fontFamily: "'Share Tech Mono',monospace", color: "#004d66", fontSize: "9px", letterSpacing: "3px", margin: "3px 0 0" }}>CODE ENGINE v5.0 // FULL-STACK AI</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: status, color: loading ? "#ff8800" : status === "ERROR" ? "#ff4444" : "#00d4ff", anim: loading },
              { label: `${totalCode} MODULES`, color: "#00ff88", anim: false },
            ].map((s, i) => (
              <span key={i} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: s.color, border: `1px solid ${s.color}44`, padding: "3px 10px", letterSpacing: "2px", background: "rgba(0,10,20,.85)", animation: s.anim ? "statusPulse 1s ease-in-out infinite" : "none" }}>● {s.label}</span>
            ))}
            <button onClick={clearChat} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#334455", border: "1px solid #112233", padding: "3px 10px", background: "transparent", cursor: "pointer", letterSpacing: "1px" }}>✕ CLEAR</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "820px", position: "relative", zIndex: 2, flex: 1 }}>

        {/* Sidebar */}
        <div style={{ width: "155px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#003d55", letterSpacing: "2px", marginBottom: "4px", textTransform: "uppercase" }}>// QUICK BUILD</div>
          {QUICK_COMMANDS.map((qc, i) => (
            <button key={i} className="qbtn" onClick={() => sendMessage(qc.cmd)} disabled={loading} style={{ background: "rgba(0,8,18,.9)", border: "1px solid rgba(0,40,70,.7)", color: "#3a6677", padding: "7px 9px", fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", cursor: loading ? "not-allowed" : "pointer", borderRadius: "2px", textAlign: "left", lineHeight: "1.3", opacity: loading ? .4 : 1 }}>
              {qc.label}
            </button>
          ))}
          {/* Stats */}
          <div style={{ marginTop: "10px", background: "rgba(0,8,18,.9)", border: "1px solid rgba(0,40,70,.5)", borderRadius: "2px", padding: "10px" }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#003d55", letterSpacing: "2px", marginBottom: "8px" }}>// SYSTEMS</div>
            {[["CODE GEN", "ACTIVE", "#00ff88"], ["WEB SRCH", "ONLINE", "#00d4ff"], ["MAX TOK", "1000", "#ffaa00"], ["LANGS", "200+", "#00d4ff"]].map(([label, val, col], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#003344" }}>{label}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: col, animation: "blink 3s ease-in-out infinite", animationDelay: `${i * .4}s` }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, background: "rgba(0,8,16,.93)", border: "1px solid rgba(0,100,150,.5)", borderRadius: "4px", overflow: "hidden", boxShadow: "0 0 40px rgba(0,100,150,.1), inset 0 0 30px rgba(0,20,40,.4)", display: "flex", flexDirection: "column", minHeight: "500px", maxHeight: "68vh", position: "relative" }}>

          {/* Scanline */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 10, borderRadius: "inherit" }}>
            <div style={{ position: "absolute", width: "100%", height: "2px", background: "linear-gradient(90deg,transparent,rgba(0,212,255,.35),transparent)", animation: "scanLine 5s linear infinite" }} />
          </div>

          {/* Corners */}
          {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h],i) => (
            <div key={i} style={{ position: "absolute", [v]: 0, [h]: 0, width: "14px", height: "14px", borderTop: v==="top"?"1px solid #00d4ff":"none", borderBottom: v==="bottom"?"1px solid #00d4ff":"none", borderLeft: h==="left"?"1px solid #00d4ff":"none", borderRight: h==="right"?"1px solid #00d4ff":"none", animation: "blink 4s ease-in-out infinite", animationDelay: `${i*.6}s`, zIndex: 11 }} />
          ))}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "10px", alignItems: "flex-start", animation: "fadeUp .3s ease-out" }}>
                <div style={{ width: "26px", height: "26px", flexShrink: 0, borderRadius: "2px", background: msg.role === "assistant" ? "radial-gradient(circle,#00d4ff22,#001133)" : "radial-gradient(circle,#ffffff11,#001133)", border: `1px solid ${msg.role === "assistant" ? "#00d4ff44" : "#ffffff22"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: "7px", color: msg.role === "assistant" ? "#00d4ff" : "#ffffff55" }}>
                  {msg.role === "assistant" ? "AI" : "U"}
                </div>
                <div style={{ maxWidth: "88%", background: msg.role === "assistant" ? "rgba(0,12,25,.85)" : "rgba(0,40,80,.5)", border: `1px solid ${msg.role === "assistant" ? "rgba(0,100,150,.35)" : "rgba(0,150,200,.25)"}`, borderRadius: "2px", padding: "10px 14px" }}>
                  {msg.role === "assistant" && <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#003d55", letterSpacing: "2px", marginBottom: "6px" }}>JARVIS // OUTPUT</div>}
                  <div>{msg.role === "assistant" ? renderMarkdown(msg.content) : <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "13px", color: "#b8e4f0", lineHeight: "1.7" }}>{msg.content}</span>}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", animation: "fadeUp .3s ease-out" }}>
                <div style={{ width: "26px", height: "26px", flexShrink: 0, borderRadius: "2px", background: "radial-gradient(circle,#ff880022,#110800)", border: "1px solid #ff880044", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: "7px", color: "#ff8800" }}>AI</div>
                <div style={{ background: "rgba(0,12,25,.85)", border: "1px solid rgba(0,100,150,.35)", borderRadius: "2px", padding: "10px 14px" }}>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#ff880088", letterSpacing: "2px", marginBottom: "5px" }}>GENERATING CODE...</div>
                  <div style={{ display: "flex", gap: "5px" }}>{[0,1,2].map(j => <div key={j} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ff8800", animation: "dotB 1.2s ease-in-out infinite", animationDelay: `${j*.2}s` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(0,100,150,.25)", background: "rgba(0,3,10,.97)", display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", color: "#00d4ff", fontSize: "11px", flexShrink: 0 }}>▶</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Describe what you want built..."
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Share Tech Mono',monospace", fontSize: "13px", color: "#cceeff", caretColor: "#00d4ff", letterSpacing: ".5px" }}
              />
              <button className="sbtn" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ background: loading||!input.trim() ? "transparent" : "rgba(0,80,120,.5)", border: `1px solid ${loading||!input.trim() ? "#001a2a" : "#00d4ff"}`, color: loading||!input.trim() ? "#001a2a" : "#00d4ff", padding: "6px 16px", fontFamily: "'Orbitron',sans-serif", fontSize: "9px", letterSpacing: "2px", cursor: loading||!input.trim() ? "not-allowed" : "pointer", borderRadius: "2px", transition: "all .2s" }}>BUILD</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#002030" }}>ENTER to build · Web search enabled · Copy & download any code</span>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#002030" }}>{input.length > 0 ? `${input.length} CHARS` : "AWAITING DIRECTIVE"}</span>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#001520", marginTop: "10px", letterSpacing: "3px", position: "relative", zIndex: 2 }}>STARK INDUSTRIES // CODE ENGINE // CLASSIFIED // AUTHORIZED ACCESS ONLY</p>
    </div>
  );
}
