// =======================
// GLOBAL STATE
// =======================
let typingTimer;
const TYPING_DELAY = 700;

let suppressTypingProcessing = false;
let lastRawText = "";

// =======================
// AUTO-PROCESS TYPED INPUT
// =======================
document.getElementById("input").addEventListener("input", () => {
  if (suppressTypingProcessing) return;

  clearTimeout(typingTimer);
  typingTimer = setTimeout(processTypedText, TYPING_DELAY);
});

async function processTypedText() {
  const text = document.getElementById("input").value.trim();

  if (!text) {
    document.getElementById("output").innerText = "";
    lastRawText = "";
    return;
  }

  document.getElementById("output").innerText = "Processing…";

  try {
    const res = await fetch("http://localhost:8000/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      document.getElementById("output").innerText = "Backend error";
      return;
    }

    const data = await res.json();
    lastRawText = text;
    document.getElementById("output").innerText = data.output;
  } catch {
    document.getElementById("output").innerText = "Backend not running";
  }
}

// =======================
// LIVE SPEECH RECOGNITION (SUBTITLES)
// =======================
let recognition;
let recognizing = false;

function setupLiveRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = event => {
    let liveText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      liveText += event.results[i][0].transcript;
    }

    suppressTypingProcessing = true;
    document.getElementById("input").value = liveText;
    suppressTypingProcessing = false;
  };
}

setupLiveRecognition();

// =======================
// AUDIO RECORDING (BACKEND)
// =======================
let recorder;
let chunks = [];
let recording = false;

let audioContext;
let analyser;
let dataArray;
let silenceStart = null;

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 1400;

// =======================
// MIC UI
// =======================
function micOn() {
  document.getElementById("micStatus").textContent = "Mic ON";
  document.getElementById("micIcon").src = "assets/mic-on.svg";
}

function micOff() {
  document.getElementById("micStatus").textContent = "Mic OFF";
  document.getElementById("micIcon").src = "assets/mic-off.svg";
}

// =======================
// RESET RECORDING STATE
// =======================
function resetRecordingState() {
  recorder = null;
  chunks = [];
  audioContext = null;
  analyser = null;
  dataArray = null;
  silenceStart = null;
}

// =======================
// MIC TOGGLE
// =======================
async function startDictation() {
  if (!recognition) return;

  if (!recognizing) {
    recognizing = true;
    micOn();
    recognition.start();
    startAudioRecording();
  } else {
    recognizing = false;
    micOff();
    recognition.stop();
    stopAudioRecording();
  }
}

// =======================
// START AUDIO RECORDING
// =======================
async function startAudioRecording() {
  resetRecordingState();

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

  chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = sendAudio;

  recorder.start();
  recording = true;

  setupSilenceDetection(stream);
}

// =======================
// SILENCE DETECTION
// =======================
function setupSilenceDetection(stream) {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  dataArray = new Uint8Array(analyser.fftSize);
  source.connect(analyser);

  monitorVolume();
}

function monitorVolume() {
  if (!recording) return;

  analyser.getByteTimeDomainData(dataArray);

  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] - 128) / 128;
    sumSquares += v * v;
  }

  const rms = Math.sqrt(sumSquares / dataArray.length);

  if (rms < SILENCE_THRESHOLD) {
    if (!silenceStart) silenceStart = Date.now();
    if (Date.now() - silenceStart > SILENCE_DURATION) {
      startDictation(); // auto stop
      return;
    }
  } else {
    silenceStart = null;
  }

  requestAnimationFrame(monitorVolume);
}

// =======================
// STOP AUDIO RECORDING
// =======================
function stopAudioRecording() {
  if (!recording) return;

  recorder.stop();
  audioContext.close();
  recording = false;
  resetRecordingState();
}

// =======================
// SEND AUDIO TO BACKEND
// =======================
async function sendAudio() {
  if (!chunks.length) return;

  const blob = new Blob(chunks, { type: "audio/wav" });
  const form = new FormData();
  form.append("audio", blob, "speech.wav");

  document.getElementById("output").innerText = "Processing…";

  try {
    const res = await fetch("http://localhost:8000/dictate", {
      method: "POST",
      body: form
    });

    if (!res.ok) {
      document.getElementById("output").innerText = "Backend error";
      return;
    }

    const data = await res.json();
    if (!data.raw) return;

    suppressTypingProcessing = true;
    lastRawText = data.raw;
    document.getElementById("input").value = data.raw;
    document.getElementById("output").innerText = data.final;
    suppressTypingProcessing = false;
  } catch {
    document.getElementById("output").innerText = "Backend not running";
  }
}

// =======================
// UTIL ACTIONS
// =======================
function copyOutput() {
  const text = document.getElementById("output").innerText;
  if (text.trim()) navigator.clipboard.writeText(text);
}

function clearText() {
  suppressTypingProcessing = true;
  document.getElementById("input").value = "";
  document.getElementById("output").innerText = "";
  lastRawText = "";
  suppressTypingProcessing = false;
}

function downloadOutput() {
  const text = document.getElementById("output").innerText;
  if (!text.trim()) return;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "audix-output.txt";
  a.click();

  URL.revokeObjectURL(url);
}
