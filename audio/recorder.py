import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write

def record_audio(duration=10, fs=16000):
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1)
    sd.wait()
    return np.squeeze(audio)
