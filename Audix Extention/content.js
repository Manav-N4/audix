console.log("AUDIX CONTENT SCRIPT READY");

// ===============================
// CONFIG
// ===============================
const AUDIX_API = "https://audix-production.up.railway.app/process";

// ===============================
// Shortcut → toggle handler
// ===============================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.source === "AUDIX" && msg.action === "TOGGLE") {
    internalToggleAudix();
  }
});

// ===============================
// UI creation
// ===============================
let container = null;

function createAudix() {
  container = document.createElement("div");
  container.id = "audix-container";
  container.style.display = "none";

  container.innerHTML = `
    <div class="audix-box">
      <div id="audix-header">
        <h2>Audix</h2>

        <button id="audix-close" class="close-btn" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#ff5f56"/>
            <path d="M8 8L16 16M16 8L8 16"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="columns">
        <textarea id="audix-input" placeholder="Speak or type…"></textarea>
        <pre id="audix-output"></pre>
      </div>

      <div class="controls">
        <button id="mic-btn" class="icon-btn"><img id="mic-icon" /></button>
        <button id="copy-btn" class="icon-btn"><img id="copy-icon" /></button>
        <button id="clear-btn" class="icon-btn"><img id="clear-icon" /></button>
        <button id="download-btn" class="icon-btn"><img id="download-icon" /></button>
      </div>

      <div class="resize-handle"></div>
    </div>
  `;

  document.body.appendChild(container);

  centerAudixOnce();
  resolveIcons();
  makeAudixDraggable();
  makeAudixResizable();
  wireAudix();
}

// ===============================
// Icon resolution
// ===============================
function resolveIcons() {
  document.getElementById("mic-icon").src =
    chrome.runtime.getURL("assets/mic-off.svg");
  document.getElementById("copy-icon").src =
    chrome.runtime.getURL("assets/copy.svg");
  document.getElementById("clear-icon").src =
    chrome.runtime.getURL("assets/bin.svg");
  document.getElementById("download-icon").src =
    chrome.runtime.getURL("assets/download.svg");
}

// ===============================
// Toggle logic
// ===============================
function internalToggleAudix() {
  if (!container) createAudix();
  container.style.display =
    container.style.display === "flex" ? "none" : "flex";
}

// ===============================
// Wiring UI logic
// ===============================
function wireAudix() {
  const input = document.getElementById("audix-input");
  const output = document.getElementById("audix-output");
  const closeBtn = document.getElementById("audix-close");

  closeBtn.addEventListener("mousedown", e => e.stopPropagation());
  closeBtn.addEventListener("click", () => {
    container.style.display = "none";
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") container.style.display = "none";
  });

  input.addEventListener(
    "input",
    debounce(async () => {
      if (!input.value.trim()) {
        output.textContent = "";
        return;
      }

      output.textContent = "Processing…";

      try {
        const res = await fetch(AUDIX_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input.value })
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        output.textContent = data.output ?? "";
      } catch {
        output.textContent = "Audix backend unavailable";
      }
    }, 700)
  );

  document.getElementById("copy-btn").onclick = () => {
    if (output.textContent.trim()) {
      navigator.clipboard.writeText(output.textContent);
    }
  };

  document.getElementById("clear-btn").onclick = () => {
    input.value = "";
    output.textContent = "";
  };

  document.getElementById("download-btn").onclick = () => {
    if (!output.textContent.trim()) return;

    const blob = new Blob([output.textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "audix-output.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  setupDictation();
  wireMicButton();
}

// ===============================
// Utils
// ===============================
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ===============================
// Dictation
// ===============================
let recognition = null;
let recognizing = false;

function setupDictation() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
    }
    document.getElementById("audix-input").value = text;
  };

  recognition.onend = sendDictationToBackend;
}

async function sendDictationToBackend() {
  const raw = document.getElementById("audix-input").value.trim();
  if (!raw) return;

  const output = document.getElementById("audix-output");
  output.textContent = "Processing…";

  try {
    const res = await fetch(AUDIX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: raw })
    });

    if (!res.ok) throw new Error();
    const data = await res.json();
    output.textContent = data.output ?? "";
  } catch {
    output.textContent = "Audix backend unavailable";
  }
}

// ===============================
// Mic button
// ===============================
function wireMicButton() {
  const micBtn = document.getElementById("mic-btn");
  const micIcon = document.getElementById("mic-icon");

  micBtn.onclick = () => {
    if (!recognition) return;

    recognizing = !recognizing;
    micIcon.src = chrome.runtime.getURL(
      recognizing ? "assets/mic-on.svg" : "assets/mic-off.svg"
    );

    recognizing ? recognition.start() : recognition.stop();
  };
}

// ===============================
// Dragging
// ===============================
function makeAudixDraggable() {
  const header = document.getElementById("audix-header");
  if (!header) return;

  let dragging = false;
  let startX, startY, startLeft, startTop;

  header.addEventListener("mousedown", e => {
    if (e.target.closest("button")) return;

    dragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = container.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    container.style.transform = "none";
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;

    container.style.left =
      Math.max(0, startLeft + (e.clientX - startX)) + "px";
    container.style.top =
      Math.max(0, startTop + (e.clientY - startY)) + "px";
  });

  document.addEventListener("mouseup", () => dragging = false);
}

// ===============================
// Resizing
// ===============================
function makeAudixResizable() {
  const handle = container.querySelector(".resize-handle");
  if (!handle) return;

  let resizing = false;
  let startX, startY, startW, startH;

  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = container.offsetWidth;
    startH = container.offsetHeight;
  });

  document.addEventListener("mousemove", e => {
    if (!resizing) return;

    container.style.width =
      Math.min(Math.max(startW + (e.clientX - startX), 480), window.innerWidth * 0.9) + "px";
    container.style.height =
      Math.min(Math.max(startH + (e.clientY - startY), 320), window.innerHeight * 0.85) + "px";
  });

  document.addEventListener("mouseup", () => resizing = false);
}

// ===============================
// Centering
// ===============================
function centerAudixOnce() {
  if (container.dataset.centered) return;

  const rect = container.getBoundingClientRect();
  container.style.left = `${(window.innerWidth - rect.width) / 2}px`;
  container.style.top = `${(window.innerHeight - rect.height) / 2}px`;
  container.dataset.centered = "true";
}
