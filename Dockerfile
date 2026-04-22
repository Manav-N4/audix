# Use a lightweight Python base
FROM python:3.10-slim

# Install system dependencies for audio and faster-whisper
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create audio directory
RUN mkdir -p audio

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PORT=8000
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 8000

# Start the application using uvicorn
CMD uvicorn app:app --host $HOST --port $PORT
