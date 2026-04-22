// =======================
// GLOBAL STATE
// =======================
let typingTimer;
const TYPING_DELAY = 700;

let suppressTypingProcessing = false;
let lastRawText = "";

// Speech Recognition & Recording
let recognition;
let recognizing = false;
let recorder;
let chunks = [];
let recording = false;

// Audio Context for Visualizer & Silence Detection
let audioContext;
let analyser;
let dataArray;
let silenceStart = null;
let animationId;

const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION = 5000; // Increased to 5s for a more relaxed experience

// =======================
// INITIALIZATION
// =======================
document.addEventListener('DOMContentLoaded', () => {
    setupLiveRecognition();
    setupVisualizer();
});

// =======================
// AUTO-PROCESS TYPED INPUT
// =======================
let isProcessing = false;

document.getElementById("input").addEventListener("input", () => {
    if (suppressTypingProcessing) return;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(processTypedText, TYPING_DELAY);
});

async function processTypedText() {
  const text = document.getElementById("input").value.trim();

  if (!text || isProcessing) return;

  isProcessing = true;
  document.getElementById("output").classList.add("loading");
  
  try {
    const res = await fetch("http://127.0.0.1:8000/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById("output").innerText = data.output;
    }
  } catch (err) {
    console.error("Processing failed", err);
  } finally {
    isProcessing = false;
    document.getElementById("output").classList.remove("loading");
  }
}

// =======================
// LIVE SPEECH RECOGNITION
// =======================
function setupLiveRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser.");
      return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = event => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    suppressTypingProcessing = true;
    // Show everything word-for-word in the input box
    document.getElementById("input").value = (lastRawText + " " + finalTranscript + interimTranscript).trim();
    suppressTypingProcessing = false;
  };

  recognition.onend = () => {
    lastRawText = document.getElementById("input").value;
  };
}

// =======================
// MIC INTERACTION
// =======================
async function startDictation() {
  if (!recognition) {
    showToast("Speech Recognition not supported");
    return;
  }

  const micBtn = document.getElementById("micBtn");
  const micIcon = document.getElementById("micIcon");
  const micStatus = document.getElementById("micStatus");

  if (!recognizing) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      recognizing = true;
      recording = true;
      
      micBtn.classList.add("active");
      micIcon.src = "assets/mic-on.svg";
      micStatus.textContent = "Listening...";
      
      recognition.start();
      startAudioRecording(stream);
      startVisualizer(stream);
    } catch (err) {
      showToast("Microphone access denied");
      console.error(err);
    }
  } else {
    stopEverything();
  }
}

function stopEverything() {
    recognizing = false;
    recording = false;
    
    document.getElementById("micBtn").classList.remove("active");
    document.getElementById("micIcon").src = "assets/mic-off.svg";
    document.getElementById("micStatus").textContent = "Standby";

    if (recognition) recognition.stop();
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (audioContext) audioContext.close();
    cancelAnimationFrame(animationId);
}

// =======================
// AUDIO RECORDING
// =======================
function startAudioRecording(stream) {
  recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  chunks = [];
  
  recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
  };
  
  recorder.onstop = sendAudioData;
  recorder.start();
  
  setupSilenceDetection(stream);
}

function setupSilenceDetection(stream) {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  source.connect(analyser);

  monitorSilence();
}

function monitorSilence() {
  if (!recording) return;

  analyser.getByteFrequencyData(dataArray);
  let average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  let normalized = average / 255;

  if (normalized < SILENCE_THRESHOLD) {
    if (!silenceStart) silenceStart = Date.now();
    if (Date.now() - silenceStart > SILENCE_DURATION) {
      showToast("Auto-stopped due to silence");
      stopEverything();
      return;
    }
  } else {
    silenceStart = null;
  }

  requestAnimationFrame(monitorSilence);
}

async function sendAudioData() {
  if (!chunks.length) return;

  const blob = new Blob(chunks, { type: "audio/wav" });
  const form = new FormData();
  form.append("audio", blob, "speech.wav");

  document.getElementById("output").innerText = "Analyzing speech patterns...";

  try {
    const res = await fetch("http://localhost:8000/dictate", {
      method: "POST",
      body: form
    });

    if (!res.ok) throw new Error("Backend error");

    const data = await res.json();
    if (!data.raw) return;

    suppressTypingProcessing = true;
    document.getElementById("input").value = data.raw;
    document.getElementById("output").innerText = data.final;
    suppressTypingProcessing = false;
    
    showToast("Processing complete");
  } catch (err) {
    document.getElementById("output").innerText = "Recognition failed";
    showToast("Backend connection failed");
  }
}

// =======================
// VISUALIZER
// =======================
function setupVisualizer() {
    const canvas = document.getElementById('visualizer');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 100;
}

function startVisualizer(stream) {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    
    // We already have analyser from silence detection if both are used
    if (!analyser) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        if (!recording) return;
        animationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const r = 59;
            const g = 130;
            const b = 246;
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${barHeight/canvas.height})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    
    draw();
}

// =======================
// ACTIONS
// =======================
function copyOutput() {
  const text = document.getElementById("output").innerText;
  if (text.trim()) {
      navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
  }
}

function clearText() {
  document.getElementById("input").value = "";
  document.getElementById("output").innerText = "";
  lastRawText = "";
  showToast("Cleared");
}

function downloadOutput() {
  const text = document.getElementById("output").innerText;
  if (!text.trim()) return;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audix-${new Date().getTime()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloading...");
}

// =======================
// KEYBOARD SHORTCUTS
// =======================
document.addEventListener('keydown', e => {
    // Alt + M to toggle mic
    if (e.altKey && e.code === 'KeyM') {
        e.preventDefault();
        startDictation();
    }
    
    // Alt + C to copy output
    if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        copyOutput();
    }

    // Escape to stop everything
    if (e.key === 'Escape' && recognizing) {
        stopEverything();
    }
});

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}
