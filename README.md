# HeyClaw 🎤

Voice companion app for hands-free AI assistant interaction with [OpenClaw](https://github.com/openclaw/openclaw).

**Say "Computer" and start talking** – Star Trek style!

## 🎉 Fully Open Source & Offline

**No API keys required!** HeyClaw uses [Vosk](https://alphacephei.com/vosk/) for both wake word detection and speech-to-text. Everything runs locally on your device.

## Features

### Core
- 🎤 **Hands-free operation** – Always ready, no touch required
- 📴 **Works with display off** (Android)
- 👂 **Wake word detection** – "Computer" activates listening (or any word you want!)
- 🗣️ **Speech to text** – Your voice transcribed locally with Vosk
- 🔊 **Voice responses** – AI responses read back to you
- 🔄 **Same session** – Shares context with Telegram, WhatsApp, etc.

### Platform Support

| Feature | Android | iOS |
|---------|---------|-----|
| Background wake word | ✅ Full | ⚠️ Foreground only |
| Screen off operation | ✅ | ❌ |
| Auto-start on boot | ✅ | ❌ |
| Voice responses | ✅ | ✅ |

*iOS limitations are due to Apple's background audio restrictions*

## Quick Start

### 1. Prerequisites

- Node.js 20+
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- Running OpenClaw gateway

### 2. Voice Models

HeyClaw downloads voice models directly in the app - no manual setup needed! On first launch, you'll be guided to download a model. 

**Recommended:** German (Small) - 45MB, fast and accurate for wake word detection.

Models can be managed in **Settings → Manage Voice Models**.

### 3. Get Your Gateway Info

From your OpenClaw Control UI URL:
```
http://192.168.1.100:18789/?token=abc123def456
     ^^^^^^^^^^^^^^^^^^        ^^^^^^^^^^^^
     Gateway Address           Gateway Token
```

### 4. Install HeyClaw

```bash
# Clone
git clone https://github.com/R4FI-bot/HeyClaw.git
cd HeyClaw

# Install dependencies
npm install

# iOS only: Install pods
cd ios && pod install && cd ..

# Run
npm run android  # or npm run ios
```

### 5. Configure

1. Open HeyClaw settings (⚙️ icon)
2. Enter **Gateway Address**: `192.168.1.100:18789` (without `ws://`)
3. Enter **Gateway Token**: The token from your Control UI URL
4. **Download a Voice Model** – Tap "Download Voice Model" to get started
5. Choose your **Wake Word** (default: "Computer" - or type your own!)
6. Save!

### 6. Use It!

1. Grant microphone permission when prompted
2. Say **"Computer"** (or your chosen wake word)
3. Wait for the beep
4. Speak your message
5. HeyClaw sends it to OpenClaw and plays the response

## Wake Words

**Any word works!** Unlike proprietary solutions, Vosk can detect any word you configure:

| Word | Style |
|------|-------|
| 🖖 Computer | Star Trek (default) |
| 🤖 Jarvis | Iron Man |
| 🎤 Hey Claw | HeyClaw brand |
| 👋 Hello | Simple |
| 🇩🇪 Hallo | German |
| 🗣️ Assistent | German formal |
| ✨ *Your name* | Custom! |

Just type any word in settings - Vosk handles it offline!

## In-App Model Download

HeyClaw includes a built-in **Model Manager** for downloading and managing Vosk models:

- 📥 **Download models** directly in the app
- 📊 **Progress tracking** with download percentage
- 🗑️ **Delete models** you don't need
- 💾 **Storage info** shows available space
- 🔄 **Switch models** between languages easily

### Available Models

| Model | Language | Size | Notes |
|-------|----------|------|-------|
| vosk-model-small-de-0.15 | 🇩🇪 German | 45 MB | ⭐ Recommended |
| vosk-model-small-en-us-0.15 | 🇺🇸 English | 40 MB | |
| vosk-model-small-es-0.42 | 🇪🇸 Spanish | 39 MB | |
| vosk-model-small-fr-0.22 | 🇫🇷 French | 41 MB | |
| vosk-model-small-it-0.22 | 🇮🇹 Italian | 48 MB | |
| vosk-model-small-ru-0.22 | 🇷🇺 Russian | 45 MB | |
| vosk-model-small-pt-0.3 | 🇧🇷 Portuguese | 31 MB | |
| vosk-model-small-cn-0.22 | 🇨🇳 Chinese | 42 MB | |
| vosk-model-small-ja-0.22 | 🇯🇵 Japanese | 48 MB | |
| vosk-model-de-0.21 | 🇩🇪 German (Large) | 1.9 GB | Higher accuracy |
| vosk-model-en-us-0.22 | 🇺🇸 English (Large) | 1.8 GB | Higher accuracy |

Small models are recommended for wake word detection - they're fast and accurate enough for trigger words.

## Audio Providers

HeyClaw supports multiple Speech-to-Text and Text-to-Speech providers.

### Speech-to-Text (STT)

| Provider | Setup | Pros | Cons |
|----------|-------|------|------|
| **Vosk** (default) | Download model | 100% offline, free, open source | Needs ~50MB model |
| **Device** | None | Easy setup | Requires internet (cloud) |
| **Custom Whisper** | Self-host | Best accuracy | Requires server |

### Text-to-Speech (TTS)

| Provider | Setup | Pros | Cons |
|----------|-------|------|------|
| **Device** (default) | None! | Works offline, multi-language | Basic voices |
| **Custom Piper/XTTS** | Self-host | Fast, good quality, free | Requires server |
| **ElevenLabs** | API key | Excellent quality | Paid service |

### Vosk Models

For best results, use a model matching your language:

| Model | Size | Language | Link |
|-------|------|----------|------|
| vosk-model-small-en-us-0.15 | 40MB | English (US) | [Download](https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip) |
| vosk-model-small-de-0.15 | 45MB | German | [Download](https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip) |
| vosk-model-en-us-0.22 | 1.8GB | English (high accuracy) | [Download](https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip) |
| vosk-model-de-0.21 | 1.9GB | German (high accuracy) | [Download](https://alphacephei.com/vosk/models/vosk-model-de-0.21.zip) |

Small models are recommended for mobile devices.

### Self-Hosting TTS

Want better voice quality? Host your own TTS server!

#### Piper (TTS)

Lightweight, fast, great voices:

```bash
# Docker
docker run -d -p 5000:5000 \
  rhasspy/piper-http-server \
  --voice en_US-lessac-medium

# For German, try "thorsten" voice:
docker run -d -p 5000:5000 \
  rhasspy/piper-http-server \
  --voice de_DE-thorsten-medium
```

In HeyClaw Settings:
- Select "Custom Endpoint" for TTS
- Enter URL: `http://your-server:5000/synthesize`

#### XTTS v2 (TTS)

Best quality, multilingual, voice cloning:

```bash
# Requires GPU (CUDA)
pip install TTS

# Run server
tts-server --model_name tts_models/multilingual/multi-dataset/xtts_v2
```

In HeyClaw Settings:
- Select "Custom Endpoint" for TTS
- Enter URL: `http://your-server:5002/api/tts`

#### ElevenLabs (TTS)

High-quality cloud TTS (paid):

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Get API key from profile settings
3. Choose a voice from the Voice Library
4. In HeyClaw Settings:
   - Select "ElevenLabs" for TTS
   - Enter API Key
   - Enter Voice ID

## Tech Stack

- **React Native** – Cross-platform mobile
- **Vosk** – Offline wake word + speech recognition
- **react-native-voice** – Optional cloud STT
- **react-native-tts** – On-device text-to-speech
- **WebSocket** – Real-time OpenClaw Gateway protocol
- **Zustand** – State management

## Project Structure

```
HeyClaw/
├── src/
│   ├── components/        # UI components
│   ├── screens/           # Home & Settings
│   ├── services/          # WebSocket, WakeWord, STT, TTS
│   ├── store/             # Zustand state
│   ├── navigation/        # React Navigation
│   ├── types/             # TypeScript types
│   └── constants/         # Config & colors
├── android/               # Android native
└── ios/                   # iOS native
```

## Development

### Build APK

```bash
# Debug
cd android && ./gradlew assembleDebug

# Release
cd android && ./gradlew assembleRelease
```

### Run Tests

```bash
npm test
```

## Troubleshooting

### "No model installed" / Wake word not working
- Open Settings → Manage Voice Models
- Download a model (German Small recommended)
- Wait for download and extraction to complete
- Model should show as "Active" after download

### "Not connected to gateway"
- Check Gateway Address and Token in settings
- Ensure your phone is on the same network as the gateway
- Verify gateway is running (`openclaw gateway status`)

### Wake word not detecting
- Check microphone permission is granted
- Verify Vosk model is loaded (check logs)
- Try a simpler wake word
- Move to a quieter environment

### App stops listening in background (Android)
- Disable battery optimization for HeyClaw
- Check "Background app refresh" settings

## How It Works

1. **Wake word** – Vosk runs in grammar mode, listening only for your trigger word (efficient!)
2. **Recording** – After wake word, switches to full STT mode
3. **Transcribe** – Vosk converts speech to text locally
4. **Send** – Sends text to OpenClaw via WebSocket
5. **Receive** – Gets response from your AI assistant
6. **Speak** – Plays response audio via TTS

HeyClaw connects to the **main session** – same context as Telegram, Discord, or any other OpenClaw channel!

## Why Vosk?

- **100% Offline** – Works without internet
- **Open Source** – MIT license, no vendor lock-in
- **No API Keys** – Zero cost, zero rate limits
- **One Package** – Wake word AND STT in one library
- **Multi-language** – 20+ languages supported
- **Privacy** – Your voice never leaves your device

## License

MIT

## Credits

- [OpenClaw](https://github.com/openclaw/openclaw) – AI Assistant Framework
- [Vosk](https://alphacephei.com/vosk/) – Offline Speech Recognition
- [React Native](https://reactnative.dev/) – Mobile Framework
