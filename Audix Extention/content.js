console.log("AUDIX CONTENT SCRIPT READY");

// ===============================
// CONFIG - Switch this to your Railway URL for production
// ===============================
const IS_PRODUCTION = false; // Toggle this to true when your Railway is live
const PROD_URL = "https://your-railway-url.up.railway.app";
const BASE_URL = IS_PRODUCTION ? PROD_URL : "http://localhost:8000";

// ===============================
// Shortcut → toggle handler
// ===============================
if (!chrome.runtime?.id) {
  console.warn("Audix: Extension context invalidated. Please refresh the page.");
} else {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.source === "AUDIX" && msg.action === "TOGGLE") {
      internalToggleAudix();
    }
  });
}

// ===============================
// UI creation
// ===============================
let container = null;
let lastRawText = "";

function createAudix() {
  container = document.createElement("div");
  container.id = "audix-container";
  container.style.display = "none";

  container.innerHTML = `
    <div class="audix-box">
      <div id="audix-header">
        <h2>Audix</h2>
        <button id="audix-close" class="close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="columns">
        <textarea id="audix-input" placeholder="Speak or type…"></textarea>
        <div id="audix-output"></div>
      </div>

      <div class="controls">
        <button id="mic-btn" class="icon-btn" title="Toggle Microphone">
          <img id="mic-icon" />
        </button>
        <button id="copy-btn" class="icon-btn" title="Copy Output">
          <img id="copy-icon" />
        </button>
        <button id="clear-btn" class="icon-btn" title="Clear All">
          <img id="clear-icon" />
        </button>
        <button id="download-btn" class="icon-btn" title="Download Text">
          <img id="download-icon" />
        </button>
      </div>
      <div class="resize-handle"></div>
    </div>
  `;

  document.body.appendChild(container);
  makeAudixDraggable();
  makeAudixResizable();
  resolveIcons();
  wireAudix();
}

function resolveIcons() {
  document.getElementById("mic-icon").src = chrome.runtime.getURL("assets/mic-off.svg");
  document.getElementById("copy-icon").src = chrome.runtime.getURL("assets/copy.svg");
  document.getElementById("clear-icon").src = chrome.runtime.getURL("assets/bin.svg");
  document.getElementById("download-icon").src = chrome.runtime.getURL("assets/download.svg");
}

function internalToggleAudix() {
  if (!container) {
    createAudix();
    centerAudixOnce();
  }
  const visible = container.style.display === "flex";
  container.style.display = visible ? "none" : "flex";
}

// ===============================
// Wiring UI logic
// ===============================
function wireAudix() {
  const input = document.getElementById("audix-input");
  const output = document.getElementById("audix-output");
  const closeBtn = document.getElementById("audix-close");

  closeBtn.onclick = () => container.style.display = "none";

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && container) container.style.display = "none";
    if (e.altKey && e.code === "KeyC") copyOutput();
  });

  input.addEventListener("input", debounce(async () => {
    const text = input.value.trim();
    if (!text) {
      output.textContent = "";
      return;
    }
    output.textContent = "Processing...";
    const res = await fetch(`${BASE_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });
    const data = await res.json();
    output.textContent = data.output;
  }, 700));

  document.getElementById("copy-btn").onclick = copyOutput;
  document.getElementById("clear-btn").onclick = clearAll;
  document.getElementById("download-btn").onclick = downloadOutput;

  setupDictation();
  wireMicButton();
}

function copyOutput() {
    const output = document.getElementById("audix-output");
    if (output.textContent.trim()) {
        navigator.clipboard.writeText(output.textContent);
    }
}

function clearAll() {
    document.getElementById("audix-input").value = "";
    document.getElementById("audix-output").textContent = "";
    lastRawText = "";
}

function downloadOutput() {
    const text = document.getElementById("audix-output").textContent;
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audix-output.txt";
    a.click();
    URL.revokeObjectURL(url);
}

// ===============================
// Dictation & Audio
// ===============================
let recognition = null;
let recognizing = false;
let audioContext = null;
let analyser = null;
let dataArray = null;
let silenceStart = null;
const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION = 5000;

function setupDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      else interimTranscript += event.results[i][0].transcript;
    }
    document.getElementById("audix-input").value = (lastRawText + " " + finalTranscript + interimTranscript).trim();
  };

  recognition.onend = () => {
    recognizing = false;
    document.getElementById("mic-btn").classList.remove("active");
    document.getElementById("mic-icon").src = chrome.runtime.getURL("assets/mic-off.svg");
    lastRawText = document.getElementById("audix-input").value;
    sendDictationToBackend();
    if (audioContext) audioContext.close();
  };
}

async function sendDictationToBackend() {
  const raw = document.getElementById("audix-input").value.trim();
  if (!raw) return;

  document.getElementById("audix-output").textContent = "Processing…";
  const res = await fetch("http://localhost:8000/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: raw })
  });
  const data = await res.json();
  document.getElementById("audix-output").textContent = data.output;
}

function wireMicButton() {
  const micBtn = document.getElementById("mic-btn");
  micBtn.onclick = async () => {
    if (!recognition) return;
    if (!recognizing) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recognizing = true;
        micBtn.classList.add("active");
        document.getElementById("mic-icon").src = chrome.runtime.getURL("assets/mic-on.svg");
        recognition.start();
        setupSilenceDetection(stream);
      } catch (err) {
          console.error("Mic access denied", err);
      }
    } else {
      recognition.stop();
    }
  };
}

function setupSilenceDetection(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  source.connect(analyser);
  monitorSilence();
}

function monitorSilence() {
  if (!recognizing) return;
  analyser.getByteFrequencyData(dataArray);
  let average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  let normalized = average / 255;

  if (normalized < SILENCE_THRESHOLD) {
    if (!silenceStart) silenceStart = Date.now();
    if (Date.now() - silenceStart > SILENCE_DURATION) {
      recognition.stop();
      return;
    }
  } else {
    silenceStart = null;
  }
  requestAnimationFrame(monitorSilence);
}

// ===============================
// UI Helpers
// ===============================
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function makeAudixDraggable() {
  const h = document.getElementById("audix-header");
  if (!h) return;
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  h.onmousedown = e => {
    if (e.target.closest("button")) return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = container.getBoundingClientRect();
    startLeft = rect.left; startTop = rect.top;
    container.style.transform = "none";
    container.style.bottom = "auto";
    container.style.right = "auto";
  };

  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    
    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);

    // Boundary Checks (Containment)
    const padding = 10;
    const rect = container.getBoundingClientRect();
    
    newLeft = Math.max(padding, Math.min(newLeft, window.innerWidth - rect.width - padding));
    newTop = Math.max(padding, Math.min(newTop, window.innerHeight - rect.height - padding));

    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  });

  document.addEventListener("mouseup", () => isDragging = false);
}

function makeAudixResizable() {
  const handle = container.querySelector(".resize-handle");
  if (!handle) return;
  let resizing = false;
  let startX, startY, startW, startH;

  handle.onmousedown = e => {
    e.preventDefault(); e.stopPropagation();
    resizing = true;
    startX = e.clientX; startY = e.clientY;
    startW = container.offsetWidth; startH = container.offsetHeight;
  };

  document.addEventListener("mousemove", e => {
    if (!resizing) return;
    
    let newWidth = Math.max(480, startW + (e.clientX - startX));
    let newHeight = Math.max(380, startH + (e.clientY - startY));

    // Boundary Checks (Keep within screen)
    const rect = container.getBoundingClientRect();
    if (rect.left + newWidth > window.innerWidth - 10) {
        newWidth = window.innerWidth - rect.left - 10;
    }
    if (rect.top + newHeight > window.innerHeight - 10) {
        newHeight = window.innerHeight - rect.top - 10;
    }

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
  });

  document.addEventListener("mouseup", () => resizing = false);
}

function centerAudixOnce() {
  if (container.dataset.centered) return;
  const rect = container.getBoundingClientRect();
  container.style.left = `${(window.innerWidth - rect.width) / 2}px`;
  container.style.top = `${(window.innerHeight - rect.height) / 2}px`;
  container.dataset.centered = "true";
}
