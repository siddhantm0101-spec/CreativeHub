import { useState, useEffect, useRef, useCallback } from "react";

// ── Load pdf-lib from CDN ──────────────────────────────────────────────────
function usePdfLib() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.PDFLib) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

function usePdfJs() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setReady(true);
    };
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const downloadBlob = (bytes, name) => {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: name,
  });
  a.click(); URL.revokeObjectURL(a.href);
};
const readFile = (f) => new Promise((res) => {
  const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsArrayBuffer(f);
});
const readDataURL = (f) => new Promise((res) => {
  const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(f);
});

// ── Tool definitions ──────────────────────────────────────────────────────
const TOOLS = [
  { id: "camera",    icon: "📸",  label: "Camera → PDF",   desc: "Camera se seedha photo kheencho aur PDF banao", color: "#E040FB" },
  { id: "img2pdf",   icon: "🖼️",  label: "Image → PDF",    desc: "JPG/PNG images ko PDF mein convert karo",  color: "#FF6B35" },
  { id: "merge",     icon: "🔗",  label: "Merge PDFs",     desc: "Multiple PDFs ko ek mein jodo",            color: "#4ECDC4" },
  { id: "split",     icon: "✂️",  label: "Split PDF",      desc: "PDF ko alag pages mein baanto",            color: "#A8E6CF" },
  { id: "rotate",    icon: "🔄",  label: "Rotate PDF",     desc: "Pages ko rotate karo",                     color: "#FFD93D" },
  { id: "lock",      icon: "🔒",  label: "Lock PDF",       desc: "PDF par password lagao",                   color: "#FF8B94" },
  { id: "unlock",    icon: "🔓",  label: "Unlock PDF",     desc: "Password-protected PDF kholao",            color: "#C7B8EA" },
  { id: "compress",  icon: "📦",  label: "Compress PDF",   desc: "PDF size kam karo",                        color: "#F7DC6F" },
  { id: "pdf2img",   icon: "📄",  label: "PDF → Images",   desc: "PDF pages ko PNG images mein badlo",      color: "#85C1E9" },
  { id: "reorder",   icon: "📋",  label: "Reorder Pages",  desc: "Pages ka order badlo",                     color: "#F0B27A" },
  { id: "info",      icon: "ℹ️",  label: "PDF Info",       desc: "PDF ki details dekho",                     color: "#82E0AA" },
  { id: "extract",   icon: "📑",  label: "Extract Pages",  desc: "Specific pages nikalo",                    color: "#F1948A" },
  { id: "watermark", icon: "💧",  label: "Watermark",      desc: "PDF par watermark lagao",                  color: "#AED6F1" },
];

// ── Drop zone ─────────────────────────────────────────────────────────────
function DropZone({ onFiles, accept = ".pdf", multiple = false, label = "PDF file yahan drop karo" }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) onFiles(files);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? "#FF6B35" : "#333"}`,
        borderRadius: 16, padding: "40px 20px", textAlign: "center",
        cursor: "pointer", background: drag ? "#1a1008" : "#111",
        transition: "all 0.2s",
      }}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
        onChange={(e) => onFiles([...e.target.files])} />
      <div style={{ fontSize: 40 }}>📂</div>
      <p style={{ color: "#aaa", margin: "8px 0 0", fontFamily: "serif" }}>{label}</p>
      <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>ya click karke select karo</p>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────
function Status({ msg, type = "info" }) {
  const colors = { info: "#4ECDC4", error: "#FF6B6B", success: "#82E0AA" };
  return (
    <div style={{
      background: "#111", border: `1px solid ${colors[type]}`,
      borderRadius: 10, padding: "10px 16px", color: colors[type],
      fontSize: 14, marginTop: 12, fontFamily: "monospace"
    }}>{msg}</div>
  );
}

// ── TOOL: Camera → PDF ───────────────────────────────────────────────────
function Camera2Pdf({ pdfLibReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]); // array of dataURL
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // back camera default
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [flash, setFlash] = useState(false);

  const startCamera = async () => {
    try {
      if (stream) { stream.getTracks().forEach(t => t.stop()); }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCameraOn(true);
      setStatus(null);
    } catch (e) {
      setStatus({ msg: "❌ Camera access nahi mila: " + e.message, type: "error" });
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null); setCameraOn(false);
  };

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    if (cameraOn) {
      if (stream) stream.getTracks().forEach(t => t.stop());
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) { setStatus({ msg: "❌ " + e.message, type: "error" }); }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataURL = canvas.toDataURL("image/jpeg", 0.92);
    setPhotos(prev => [...prev, dataURL]);
    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
  };

  const removePhoto = (i) => setPhotos(prev => prev.filter((_, j) => j !== i));

  const makePdf = async () => {
    if (!photos.length || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "PDF ban rahi hai...", type: "info" });
    try {
      const { PDFDocument } = window.PDFLib;
      const pdf = await PDFDocument.create();
      for (const dataURL of photos) {
        const base64 = dataURL.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const img = await pdf.embedJpg(imgBytes);
        // A4 size mein fit karo
        const A4W = 595, A4H = 842;
        const ratio = Math.min(A4W / img.width, A4H / img.height);
        const w = img.width * ratio, h = img.height * ratio;
        const x = (A4W - w) / 2, y = (A4H - h) / 2;
        const page = pdf.addPage([A4W, A4H]);
        page.drawImage(img, { x, y, width: w, height: h });
      }
      const bytes = await pdf.save();
      downloadBlob(bytes, `camera-scan-${Date.now()}.pdf`);
      setStatus({ msg: `✅ ${photos.length} photo ki PDF download ho gayi!`, type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  // Cleanup on unmount
  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  return (
    <div>
      {/* Camera Viewfinder */}
      <div style={{
        position: "relative", borderRadius: 16, overflow: "hidden",
        background: "#000", aspectRatio: "4/3", marginBottom: 16,
        border: "2px solid #1a1a1a",
      }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraOn ? "block" : "none" }} />

        {/* Flash overlay */}
        {flash && (
          <div style={{
            position: "absolute", inset: 0, background: "#fff",
            opacity: 0.8, borderRadius: 14, pointerEvents: "none",
            animation: "none",
          }} />
        )}

        {/* Camera off placeholder */}
        {!cameraOn && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "#333",
          }}>
            <div style={{ fontSize: 64 }}>📷</div>
            <p style={{ color: "#444", fontSize: 14, marginTop: 8 }}>Camera band hai</p>
          </div>
        )}

        {/* Viewfinder corners */}
        {cameraOn && (
          <>
            {[["0","0","borderTop","borderLeft"],["0","auto","borderTop","borderRight"],
              ["auto","0","borderBottom","borderLeft"],["auto","auto","borderBottom","borderRight"]].map(([t,r,bv,bh], i) => (
              <div key={i} style={{
                position: "absolute", top: t === "0" ? 12 : "auto", bottom: t === "auto" ? 12 : "auto",
                left: r === "0" ? 12 : "auto", right: r === "auto" ? 12 : "auto",
                width: 24, height: 24,
                borderTop: bv === "borderTop" ? "3px solid #E040FB" : "none",
                borderBottom: bv === "borderBottom" ? "3px solid #E040FB" : "none",
                borderLeft: bh === "borderLeft" ? "3px solid #E040FB" : "none",
                borderRight: bh === "borderRight" ? "3px solid #E040FB" : "none",
                borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0",
              }} />
            ))}
          </>
        )}

        {/* Photo count badge */}
        {photos.length > 0 && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            background: "#E040FB", borderRadius: 20,
            padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#fff",
          }}>📸 {photos.length}</div>
        )}

        {/* Flip button */}
        {cameraOn && (
          <button onClick={flipCamera}
            style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
              width: 40, height: 40, cursor: "pointer", fontSize: 18, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>🔄</button>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {!cameraOn ? (
          <button onClick={startCamera}
            style={{
              flex: 1, padding: "14px", borderRadius: 12,
              border: "2px solid #E040FB", background: "#1a001f",
              color: "#E040FB", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>📷 Camera Kholo</button>
        ) : (
          <>
            {/* Shutter button */}
            <button onClick={capturePhoto}
              style={{
                flex: 2, padding: "14px", borderRadius: 12,
                border: "3px solid #E040FB", background: "#E040FB",
                color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer",
                boxShadow: "0 0 20px #E040FB60",
              }}>📸 Click!</button>
            <button onClick={stopCamera}
              style={{
                flex: 1, padding: "14px", borderRadius: 12,
                border: "2px solid #333", background: "#111",
                color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>⏹ Band Karo</button>
          </>
        )}
      </div>

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 8 }}>
            📸 {photos.length} photo ली — PDF mein sabhi pages honge:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
            {photos.map((src, i) => (
              <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "2px solid #333" }}>
                <img src={src} alt={`Photo ${i+1}`} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  background: "linear-gradient(#000a, transparent)",
                  padding: "4px 6px", fontSize: 11, color: "#fff", fontWeight: 700,
                }}>#{i+1}</div>
                <button onClick={() => removePhoto(i)}
                  style={{
                    position: "absolute", bottom: 4, right: 4,
                    background: "#FF4444cc", border: "none", borderRadius: "50%",
                    width: 22, height: 22, cursor: "pointer", color: "#fff",
                    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {status && <Status {...status} />}

      <button onClick={makePdf} disabled={!photos.length || processing || !pdfLibReady}
        style={{
          width: "100%", padding: "14px", borderRadius: 12,
          border: "2px solid #E040FB",
          background: !photos.length || processing ? "#111" : "linear-gradient(135deg, #1a001f, #0d0015)",
          color: !photos.length || processing ? "#444" : "#E040FB",
          fontSize: 15, fontWeight: 700, cursor: !photos.length || processing ? "not-allowed" : "pointer",
          boxShadow: photos.length && !processing ? "0 0 16px #E040FB30" : "none",
        }}>
        {processing ? "⏳ PDF Ban Rahi Hai..." : `📄 ${photos.length} Photos → PDF Banao`}
      </button>
    </div>
  );
}

// ── TOOL: Image → PDF ────────────────────────────────────────────────────
function Img2Pdf({ pdfLibReady }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const convert = async () => {
    if (!files.length || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Converting...", type: "info" });
    try {
      const { PDFDocument } = window.PDFLib;
      const pdf = await PDFDocument.create();
      for (const f of files) {
        const data = await readDataURL(f);
        const base64 = data.split(",")[1];
        const mimeType = f.type;
        let img;
        if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
          img = await pdf.embedJpg(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
        } else {
          img = await pdf.embedPng(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
        }
        const page = pdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const bytes = await pdf.save();
      downloadBlob(bytes, "images-converted.pdf");
      setStatus({ msg: "✅ PDF download ho gayi!", type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ Error: " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={setFiles} accept="image/*" multiple label="Images yahan drop karo (JPG, PNG)" />
      {files.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ background: "#1a1a1a", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#aaa" }}>
              🖼️ {f.name}
            </div>
          ))}
        </div>
      )}
      {status && <Status {...status} />}
      <Btn disabled={!files.length || processing} onClick={convert}>
        {processing ? "⏳ Converting..." : "🚀 PDF Banao"}
      </Btn>
    </div>
  );
}

// ── TOOL: Merge PDFs ─────────────────────────────────────────────────────
function MergePdf({ pdfLibReady }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const merge = async () => {
    if (files.length < 2 || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Merging...", type: "info" });
    try {
      const { PDFDocument } = window.PDFLib;
      const merged = await PDFDocument.create();
      for (const f of files) {
        const ab = await readFile(f);
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(bytes, "merged.pdf");
      setStatus({ msg: `✅ ${files.length} PDFs merge ho gayi!`, type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={(f) => setFiles(prev => [...prev, ...f])} multiple label="Multiple PDFs drop karo" />
      {files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1a1a", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
              <span style={{ color: "#aaa", fontSize: 13 }}>📄 {f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {status && <Status {...status} />}
      <Btn disabled={files.length < 2 || processing} onClick={merge}>
        {processing ? "⏳ Merging..." : "🔗 Merge Karo"}
      </Btn>
    </div>
  );
}

// ── TOOL: Split PDF ──────────────────────────────────────────────────────
function SplitPdf({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("");
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadFile = async (files) => {
    const f = files[0]; setFile(f);
    const { PDFDocument } = window.PDFLib;
    const ab = await readFile(f);
    const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
    setPageCount(doc.getPageCount());
    setStatus({ msg: `📄 ${doc.getPageCount()} pages mili`, type: "info" });
  };

  const split = async () => {
    if (!file || !range || !pdfLibReady) return;
    setProcessing(true);
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(file);
      const src = await PDFDocument.load(ab, { ignoreEncryption: true });
      const parts = range.split(",").map(s => s.trim());
      for (const part of parts) {
        const newDoc = await PDFDocument.create();
        let indices = [];
        if (part.includes("-")) {
          const [a, b] = part.split("-").map(Number);
          for (let i = a; i <= b; i++) indices.push(i - 1);
        } else {
          indices = [parseInt(part) - 1];
        }
        indices = indices.filter(i => i >= 0 && i < src.getPageCount());
        const pages = await newDoc.copyPages(src, indices);
        pages.forEach(p => newDoc.addPage(p));
        const bytes = await newDoc.save();
        downloadBlob(bytes, `split-pages-${part}.pdf`);
      }
      setStatus({ msg: "✅ Split ho gayi!", type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={loadFile} label="PDF drop karo" />
      {pageCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <label style={{ color: "#aaa", fontSize: 14, display: "block", marginBottom: 6 }}>
            Page range (jaise: 1-3, 5, 7-9) — Total: {pageCount} pages
          </label>
          <input value={range} onChange={e => setRange(e.target.value)}
            placeholder="1-3, 5, 7-9"
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
        </div>
      )}
      {status && <Status {...status} />}
      <Btn disabled={!file || !range || processing} onClick={split}>
        {processing ? "⏳ Splitting..." : "✂️ Split Karo"}
      </Btn>
    </div>
  );
}

// ── TOOL: Rotate PDF ─────────────────────────────────────────────────────
function RotatePdf({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [angle, setAngle] = useState(90);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const rotate = async () => {
    if (!file || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Rotating...", type: "info" });
    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const ab = await readFile(file);
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      doc.getPages().forEach(p => p.setRotation(degrees(angle)));
      const bytes = await doc.save();
      downloadBlob(bytes, "rotated.pdf");
      setStatus({ msg: `✅ ${angle}° rotate ho gayi!`, type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={(f) => setFile(f[0])} label="PDF drop karo" />
      {file && <p style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>📄 {file.name}</p>}
      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        {[90, 180, 270].map(a => (
          <button key={a} onClick={() => setAngle(a)}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${angle === a ? "#FF6B35" : "#333"}`,
              background: angle === a ? "#1a0800" : "#111", color: angle === a ? "#FF6B35" : "#aaa",
              cursor: "pointer", fontSize: 14, fontWeight: 600,
            }}>{a}°</button>
        ))}
      </div>
      {status && <Status {...status} />}
      <Btn disabled={!file || processing} onClick={rotate}>
        {processing ? "⏳ Rotating..." : "🔄 Rotate Karo"}
      </Btn>
    </div>
  );
}

// ── TOOL: Lock PDF ──────────────────────────────────────────────────────
function LockPdf({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const lock = async () => {
    if (!file || !pass || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Locking...", type: "info" });
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(file);
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      const bytes = await doc.save({
        userPassword: pass, ownerPassword: pass + "_owner",
        permissions: { printing: "lowResolution", copying: false, modifying: false }
      });
      downloadBlob(bytes, "locked.pdf");
      setStatus({ msg: "✅ PDF lock ho gayi!", type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={(f) => setFile(f[0])} label="PDF drop karo" />
      {file && <p style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>📄 {file.name}</p>}
      <input value={pass} onChange={e => setPass(e.target.value)}
        placeholder="Password daalo 🔑"
        type="password"
        style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 12 }} />
      {status && <Status {...status} />}
      <Btn disabled={!file || !pass || processing} onClick={lock}>
        {processing ? "⏳ Locking..." : "🔒 Lock Karo"}
      </Btn>
    </div>
  );
}

// ── TOOL: Unlock PDF ─────────────────────────────────────────────────────
function UnlockPdf({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const unlock = async () => {
    if (!file || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Unlocking...", type: "info" });
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(file);
      const doc = await PDFDocument.load(ab, { password: pass, ignoreEncryption: false });
      const bytes = await doc.save();
      downloadBlob(bytes, "unlocked.pdf");
      setStatus({ msg: "✅ PDF unlock ho gayi!", type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ Wrong password ya decrypt error: " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={(f) => setFile(f[0])} label="Locked PDF drop karo" />
      {file && <p style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>📄 {file.name}</p>}
      <input value={pass} onChange={e => setPass(e.target.value)}
        placeholder="Password daalo (agar ho)"
        type="password"
        style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 12 }} />
      {status && <Status {...status} />}
      <Btn disabled={!file || processing} onClick={unlock}>
        {processing ? "⏳ Unlocking..." : "🔓 Unlock Karo"}
      </Btn>
    </div>
  );
}

// ── TOOL: Compress PDF ───────────────────────────────────────────────────
function CompressPdf({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const compress = async () => {
    if (!file || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Compressing...", type: "info" });
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(file);
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      const before = (file.size / 1024).toFixed(1);
      const after = (bytes.length / 1024).toFixed(1);
      downloadBlob(bytes, "compressed.pdf");
      setStatus({ msg: `✅ ${before}KB → ${after}KB`, type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={(f) => setFile(f[0])} label="PDF drop karo" />
      {file && <p style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>📄 {file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
      {status && <Status {...status} />}
      <Btn disabled={!file || processing} onClick={compress}>
        {processing ? "⏳ Compressing..." : "📦 Compress Karo"}
      </Btn>
    </div>
  );
}

// ── TOOL: PDF → Images ───────────────────────────────────────────────────
function Pdf2Img({ pdfJsReady }) {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const convert = async () => {
    if (!file || !pdfJsReady) return;
    setProcessing(true); setPages([]); setStatus({ msg: "Rendering pages...", type: "info" });
    try {
      const ab = await readFile(file);
      const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
      const imgs = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        imgs.push(canvas.toDataURL("image/png"));
      }
      setPages(imgs);
      setStatus({ msg: `✅ ${imgs.length} pages render ho gayi!`, type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  const downloadAll = () => {
    pages.forEach((dataUrl, i) => {
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `page-${i + 1}.png`; a.click();
    });
  };

  return (
    <div>
      <DropZone onFiles={(f) => { setFile(f[0]); setPages([]); }} label="PDF drop karo" />
      {file && <p style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>📄 {file.name}</p>}
      {status && <Status {...status} />}
      <Btn disabled={!file || processing} onClick={convert}>
        {processing ? "⏳ Rendering..." : "🖼️ Images Banao"}
      </Btn>
      {pages.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginTop: 16 }}>
            {pages.map((src, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #333", position: "relative" }}>
                <img src={src} alt={`Page ${i+1}`} style={{ width: "100%", display: "block" }} />
                <div style={{ position: "absolute", top: 4, left: 4, background: "#000a", borderRadius: 4, padding: "2px 6px", fontSize: 11, color: "#fff" }}>P{i+1}</div>
              </div>
            ))}
          </div>
          <Btn onClick={downloadAll} style={{ background: "#1a2d1a", borderColor: "#82E0AA", color: "#82E0AA" }}>
            ⬇️ Sabhi Download Karo
          </Btn>
        </>
      )}
    </div>
  );
}

// ── TOOL: PDF Info ───────────────────────────────────────────────────────
function PdfInfo({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState(null);

  const analyze = async (files) => {
    const f = files[0]; setFile(f);
    if (!pdfLibReady) return;
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(f);
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      setInfo({
        pages: doc.getPageCount(),
        title: doc.getTitle() || "N/A",
        author: doc.getAuthor() || "N/A",
        subject: doc.getSubject() || "N/A",
        creator: doc.getCreator() || "N/A",
        size: (f.size / 1024).toFixed(1) + " KB",
        pdfVersion: doc.getProducer() || "N/A",
      });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
  };

  return (
    <div>
      <DropZone onFiles={analyze} label="PDF drop karo" />
      {status && <Status {...status} />}
      {info && (
        <div style={{ marginTop: 16 }}>
          {Object.entries(info).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #1a1a1a", borderRadius: 4 }}>
              <span style={{ color: "#666", fontSize: 13, textTransform: "capitalize" }}>{k}</span>
              <span style={{ color: "#fff", fontSize: 13 }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TOOL: Extract Pages ──────────────────────────────────────────────────
function ExtractPages({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadFile = async (files) => {
    const f = files[0]; setFile(f); setSelected(new Set());
    const { PDFDocument } = window.PDFLib;
    const ab = await readFile(f);
    const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
    setPageCount(doc.getPageCount());
  };

  const toggle = (n) => setSelected(prev => {
    const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s;
  });

  const extract = async () => {
    if (!file || !selected.size || !pdfLibReady) return;
    setProcessing(true);
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(file);
      const src = await PDFDocument.load(ab, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();
      const indices = [...selected].sort((a, b) => a - b).map(n => n - 1);
      const pages = await newDoc.copyPages(src, indices);
      pages.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      downloadBlob(bytes, "extracted.pdf");
      setStatus({ msg: `✅ ${selected.size} pages extract ho gayi!`, type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={loadFile} label="PDF drop karo" />
      {pageCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 8 }}>Pages select karo:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => toggle(n)}
                style={{
                  width: 40, height: 40, borderRadius: 8,
                  border: `2px solid ${selected.has(n) ? "#FF6B35" : "#333"}`,
                  background: selected.has(n) ? "#1a0800" : "#111",
                  color: selected.has(n) ? "#FF6B35" : "#666",
                  cursor: "pointer", fontWeight: 600, fontSize: 13,
                }}>{n}</button>
            ))}
          </div>
        </div>
      )}
      {status && <Status {...status} />}
      <Btn disabled={!file || !selected.size || processing} onClick={extract}>
        {processing ? "⏳ Extracting..." : `📑 ${selected.size} Pages Extract Karo`}
      </Btn>
    </div>
  );
}

// ── TOOL: Watermark ──────────────────────────────────────────────────────
function Watermark({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.3);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const apply = async () => {
    if (!file || !text || !pdfLibReady) return;
    setProcessing(true); setStatus({ msg: "Applying watermark...", type: "info" });
    try {
      const { PDFDocument, rgb, degrees } = window.PDFLib;
      const ab = await readFile(file);
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      const pages = doc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - (text.length * 12), y: height / 2,
          size: 48, color: rgb(0.8, 0.1, 0.1),
          opacity, rotate: degrees(45),
        });
      }
      const bytes = await doc.save();
      downloadBlob(bytes, "watermarked.pdf");
      setStatus({ msg: "✅ Watermark lag gayi!", type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={(f) => setFile(f[0])} label="PDF drop karo" />
      {file && <p style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>📄 {file.name}</p>}
      <input value={text} onChange={e => setText(e.target.value)}
        placeholder="Watermark text"
        style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 12 }} />
      <div style={{ marginTop: 12 }}>
        <label style={{ color: "#aaa", fontSize: 13 }}>Opacity: {Math.round(opacity * 100)}%</label>
        <input type="range" min="0.1" max="0.9" step="0.05" value={opacity}
          onChange={e => setOpacity(Number(e.target.value))}
          style={{ width: "100%", marginTop: 6, accentColor: "#FF6B35" }} />
      </div>
      {status && <Status {...status} />}
      <Btn disabled={!file || !text || processing} onClick={apply}>
        {processing ? "⏳ Applying..." : "💧 Watermark Lagao"}
      </Btn>
    </div>
  );
}

// ── TOOL: Reorder Pages ──────────────────────────────────────────────────
function ReorderPages({ pdfLibReady }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [order, setOrder] = useState([]);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadFile = async (files) => {
    const f = files[0]; setFile(f);
    const { PDFDocument } = window.PDFLib;
    const ab = await readFile(f);
    const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
    const count = doc.getPageCount();
    setPageCount(count);
    setOrder(Array.from({ length: count }, (_, i) => i + 1));
  };

  const move = (from, to) => {
    setOrder(prev => {
      const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return arr;
    });
  };

  const save = async () => {
    if (!file || !pdfLibReady) return;
    setProcessing(true);
    try {
      const { PDFDocument } = window.PDFLib;
      const ab = await readFile(file);
      const src = await PDFDocument.load(ab, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();
      const indices = order.map(n => n - 1);
      const pages = await newDoc.copyPages(src, indices);
      pages.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      downloadBlob(bytes, "reordered.pdf");
      setStatus({ msg: "✅ Reorder ho gayi!", type: "success" });
    } catch (e) {
      setStatus({ msg: "❌ " + e.message, type: "error" });
    }
    setProcessing(false);
  };

  return (
    <div>
      <DropZone onFiles={loadFile} label="PDF drop karo" />
      {order.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 8 }}>Drag ya buttons se reorder karo:</p>
          {order.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a1a1a", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
              <span style={{ color: "#555", width: 20, fontSize: 12 }}>{i+1}.</span>
              <span style={{ flex: 1, color: "#aaa", fontSize: 14 }}>Page {n}</span>
              <button onClick={() => i > 0 && move(i, i-1)} disabled={i === 0}
                style={{ background: "none", border: "none", color: i === 0 ? "#333" : "#aaa", cursor: i === 0 ? "default" : "pointer", fontSize: 16 }}>↑</button>
              <button onClick={() => i < order.length-1 && move(i, i+1)} disabled={i === order.length-1}
                style={{ background: "none", border: "none", color: i === order.length-1 ? "#333" : "#aaa", cursor: i === order.length-1 ? "default" : "pointer", fontSize: 16 }}>↓</button>
            </div>
          ))}
        </div>
      )}
      {status && <Status {...status} />}
      <Btn disabled={!file || processing} onClick={save}>
        {processing ? "⏳ Saving..." : "📋 Save Karo"}
      </Btn>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        marginTop: 16, width: "100%", padding: "14px", borderRadius: 12,
        border: "2px solid #FF6B35", background: disabled ? "#111" : "#1a0800",
        color: disabled ? "#444" : "#FF6B35", fontFamily: "Georgia, serif",
        fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s", letterSpacing: 0.5,
        ...style,
      }}>{children}</button>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function PdfToolsHub() {
  const [active, setActive] = useState(null);
  const pdfLibReady = usePdfLib();
  const pdfJsReady = usePdfJs();

  const TOOL_COMPONENTS = {
    camera:    <Camera2Pdf pdfLibReady={pdfLibReady} />,
    img2pdf:   <Img2Pdf pdfLibReady={pdfLibReady} />,
    merge:     <MergePdf pdfLibReady={pdfLibReady} />,
    split:     <SplitPdf pdfLibReady={pdfLibReady} />,
    rotate:    <RotatePdf pdfLibReady={pdfLibReady} />,
    lock:      <LockPdf pdfLibReady={pdfLibReady} />,
    unlock:    <UnlockPdf pdfLibReady={pdfLibReady} />,
    compress:  <CompressPdf pdfLibReady={pdfLibReady} />,
    pdf2img:   <Pdf2Img pdfJsReady={pdfJsReady} />,
    reorder:   <ReorderPages pdfLibReady={pdfLibReady} />,
    info:      <PdfInfo pdfLibReady={pdfLibReady} />,
    extract:   <ExtractPages pdfLibReady={pdfLibReady} />,
    watermark: <Watermark pdfLibReady={pdfLibReady} />,
  };

  const activeTool = TOOLS.find(t => t.id === active);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      fontFamily: "system-ui, sans-serif",
      backgroundImage: "radial-gradient(ellipse at 20% 0%, #1a0800 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, #001a1a 0%, transparent 60%)",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a1a1a", padding: "20px 24px",
        display: "flex", alignItems: "center", gap: 16,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {active && (
          <button onClick={() => setActive(null)}
            style={{ background: "none", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", color: "#aaa", cursor: "pointer", fontSize: 13 }}>
            ← Back
          </button>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: active ? 20 : 26, fontFamily: "Georgia, serif", fontWeight: 700, color: "#fff" }}>
            {active ? `${activeTool?.icon} ${activeTool?.label}` : "📄 PDF Tools Hub"}
          </h1>
          {!active && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>Sabhi PDF tools ek jagah — Free & Private</p>}
        </div>
        {!pdfLibReady && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#555", background: "#111", borderRadius: 6, padding: "4px 8px" }}>Loading...</span>
        )}
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        {!active ? (
          <>
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {TOOLS.map(tool => (
                <button key={tool.id} onClick={() => setActive(tool.id)}
                  style={{
                    background: "#0e0e0e", border: "1px solid #1a1a1a",
                    borderRadius: 16, padding: "20px 16px", cursor: "pointer",
                    textAlign: "left", transition: "all 0.2s",
                    position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = `1px solid ${tool.color}40`;
                    e.currentTarget.style.background = "#111";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = "1px solid #1a1a1a";
                    e.currentTarget.style.background = "#0e0e0e";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{tool.icon}</div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{tool.label}</div>
                  <div style={{ color: "#555", fontSize: 11, lineHeight: 1.4 }}>{tool.desc}</div>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 3, height: "100%", background: tool.color, borderRadius: "0 16px 16px 0", opacity: 0.6 }} />
                </button>
              ))}
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 32, textAlign: "center", color: "#333", fontSize: 12 }}>
              🔒 Sabhi files aapke browser mein process hoti hain — server par kuch bhi upload nahi hota
            </div>
          </>
        ) : (
          <div style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 20, padding: 24 }}>
            <div style={{
              display: "inline-block", background: activeTool?.color + "15",
              border: `1px solid ${activeTool?.color}30`, borderRadius: 8,
              padding: "4px 12px", fontSize: 12, color: activeTool?.color, marginBottom: 20,
            }}>
              {activeTool?.desc}
            </div>
            {TOOL_COMPONENTS[active]}
          </div>
        )}
      </div>
    </div>
  );
}
