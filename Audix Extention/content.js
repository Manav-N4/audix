console.log("AUDIX CONTENT SCRIPT READY");

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
        <button id="mic-btn" class="icon-btn">
          <img id="mic-icon" />
        </button>

        <button id="copy-btn" class="icon-btn">
          <img id="copy-icon" />
        </button>

        <button id="clear-btn" class="icon-btn">
          <img id="clear-icon" />
        </button>

        <button id="download-btn" class="icon-btn">
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

// ===============================
// Icon resolution (CRITICAL FIX)
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
  if (!container) {
    createAudix();
    centerAudixOnce(); // ✅ only on first creation
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

closeBtn.addEventListener("mousedown", e => {
  e.stopPropagation(); // 🔥 THIS IS THE FIX
});

closeBtn.addEventListener("click", e => {
  e.stopPropagation();
  container.style.display = "none";
});




document.addEventListener("keydown", e => {
  if (e.key === "Escape" && container) {
    container.style.display = "none";
  }
});



  input.addEventListener(
    "input",
    debounce(async () => {
      if (!input.value.trim()) {
        output.textContent = "";
        return;
      }

      output.textContent = "Processing…";

      const res = await fetch("http://localhost:8000/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.value })
      });

      const data = await res.json();
      output.textContent = data.output;
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
// Dictation (Web Speech API)
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

  recognition.onend = async () => {
    recognizing = false;
    document.getElementById("mic-icon").src =
      chrome.runtime.getURL("assets/mic-off.svg");

    sendDictationToBackend();
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

function makeAudixDraggable() {
  const container = document.getElementById("audix-container");
  const header = document.getElementById("audix-header");

  if (!container || !header) return;

  let isDragging = false;
  let startX, startY, startLeft, startTop;

header.addEventListener("mousedown", e => {
  // ignore clicks on buttons inside header
  if (e.target.closest("button")) return;

  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;

  const rect = container.getBoundingClientRect();
  startLeft = rect.left;
  startTop = rect.top;

  container.style.transform = "none";
});
  document.addEventListener("mousemove", e => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = startLeft + dx;
    const newTop = startTop + dy;

    // confine to viewport
    container.style.left = `${Math.max(0, newLeft)}px`;
    container.style.top = `${Math.max(0, newTop)}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
  });
}


const box = document.querySelector(".audix-box");
const header = box.querySelector("h2"); // or a drag bar

let isDragging = false;
let startX, startY, startLeft, startTop;

header.addEventListener("mousedown", e => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  const rect = box.getBoundingClientRect();
  startLeft = rect.left;
  startTop = rect.top;
});

document.addEventListener("mousemove", e => {
  if (!isDragging) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  const newLeft = startLeft + dx;
  const newTop = startTop + dy;

  const rect = box.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const minLeft = 10;
  const minTop = 10;
  const maxLeft = vw - rect.width - 10;
  const maxTop = vh - rect.height - 10;

  box.style.left =
    Math.min(Math.max(newLeft, minLeft), maxLeft) + "px";

  box.style.top =
    Math.min(Math.max(newTop, minTop), maxTop) + "px";

  box.style.position = "fixed";
});


document.addEventListener("mouseup", () => {
  isDragging = false;
});
function makeAudixResizable() {
  const container = document.getElementById("audix-container");
  if (!container) return;

  const handle = container.querySelector(".resize-handle");
  if (!handle) return; // 🔒 prevents crash

  let resizing = false;
  let startX, startY, startW, startH;

  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();

    resizing = true;
    startX = e.clientX;
    startY = e.clientY;

    startW = container.offsetWidth;
    startH = container.offsetHeight;

    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", e => {
    if (!resizing) return;

    const newW = startW + (e.clientX - startX);
    const newH = startH + (e.clientY - startY);

    container.style.width =
      Math.min(Math.max(newW, 480), window.innerWidth * 0.9) + "px";

    container.style.height =
      Math.min(Math.max(newH, 320), window.innerHeight * 0.85) + "px";
  });

  document.addEventListener("mouseup", () => {
    resizing = false;
    document.body.style.userSelect = "";
  });
}
function centerAudixOnce() {
  const container = document.getElementById("audix-container");
  if (!container.dataset.centered) {
    const rect = container.getBoundingClientRect();
    container.style.left = `${(window.innerWidth - rect.width) / 2}px`;
    container.style.top = `${(window.innerHeight - rect.height) / 2}px`;
    container.dataset.centered = "true";
  }
}
