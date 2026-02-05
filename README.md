# HeyClaw 🎤

Voice companion app for hands-free AI assistant interaction with [OpenClaw](https://github.com/openclaw/openclaw).

**Say "Computer" and start talking** – Star Trek style!

## Features

### Core
- 🎤 **Hands-free operation** – Always ready, no touch required
- 📴 **Works with display off** (Android)
- 👂 **Wake word detection** – "Computer" activates listening (or choose your own!)
- 🗣️ **Speech to text** – Your voice transcribed and sent to OpenClaw
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

### 2. Get Your Gateway Info

From your OpenClaw Control UI URL:
```
http://192.168.1.100:18789/?token=abc123def456
     ^^^^^^^^^^^^^^^^^^        ^^^^^^^^^^^^
     Gateway Address           Gateway Token
```

### 3. Install HeyClaw

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

### 4. Configure

1. Open HeyClaw settings (⚙️ icon)
2. Enter **Gateway Address**: `192.168.1.100:18789` (without `ws://`)
3. Enter **Gateway Token**: The token from your Control UI URL
4. Choose your **Wake Word** (default: "Computer")
5. Save!

### 5. Use It!

1. Grant microphone permission when prompted
2. Say **"Computer"** (or your chosen wake word)
3. Wait for the beep
4. Speak your message
5. HeyClaw sends it to OpenClaw and plays the response

## Wake Words

Built-in wake words (no API key needed):

| Word | Style |
|------|-------|
| 🖖 Computer | Star Trek (default) |
| 🤖 Jarvis | Iron Man |
| 🐝 Bumblebee | Transformers |
| 🦔 Porcupine | Picovoice default |
| 🔴 Terminator | Hasta la vista |
| ☕ Americano | Coffee lover |
| ...and more! | |

All wake words work **100% offline** using [Picovoice Porcupine](https://picovoice.ai/).

## Tech Stack

- **React Native** – Cross-platform mobile
- **Porcupine SDK** – Offline wake word detection
- **WebSocket** – Real-time OpenClaw Gateway protocol
- **Zustand** – State management

## Project Structure

```
HeyClaw/
├── src/
│   ├── components/        # UI components
│   ├── screens/           # Home & Settings
│   ├── services/          # WebSocket, WakeWord, Audio
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

### "Not connected to gateway"
- Check Gateway Address and Token in settings
- Ensure your phone is on the same network as the gateway
- Verify gateway is running (`openclaw gateway status`)

### Wake word not detecting
- Check microphone permission is granted
- Try a different wake word
- Move to a quieter environment

### App stops listening in background (Android)
- Disable battery optimization for HeyClaw
- Check "Background app refresh" settings

## How It Works

1. **Wake word** – Porcupine runs offline, listening for trigger phrase
2. **Recording** – After wake word, records your speech
3. **Send** – Sends transcribed text to OpenClaw via WebSocket
4. **Receive** – Gets response from your AI assistant
5. **Speak** – Plays response audio via TTS

HeyClaw connects to the **main session** – same context as Telegram, Discord, or any other OpenClaw channel!

## License

MIT

## Credits

- [OpenClaw](https://github.com/openclaw/openclaw) – AI Assistant Framework
- [Picovoice](https://picovoice.ai/) – Wake Word Detection
- [React Native](https://reactnative.dev/) – Mobile Framework
