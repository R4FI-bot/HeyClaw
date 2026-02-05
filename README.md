# HeyClaw 🎤

Voice companion app for hands-free AI assistant interaction with [OpenClaw](https://github.com/openclaw/openclaw).

## Features

### Core
- 🎤 **Hands-free operation** - Always ready, no touch required
- 📴 **Works with display off** (Android)
- 👂 **Wake word detection** - Always listening for your trigger phrase
- 🎙️ **Voice recording** - Record and send voice messages
- 🔊 **Auto-play responses** - Incoming voice messages play automatically

### Android
- ✅ Full background operation
- ✅ Wake word detection while in background
- ✅ Screen off support (foreground service + partial wake lock)
- ✅ Auto-start on boot (optional)
- ✅ Async voice response playback

### iOS
- ⚠️ Wake word detection requires app to be in foreground (Apple restriction)
- ✅ Full voice control while app is open
- ✅ Async voice response playback while app is open

## Tech Stack

- **React Native** - Cross-platform mobile development
- **Porcupine SDK** - Offline wake word detection (Picovoice)
- **WebSocket** - Real-time communication with OpenClaw Gateway
- **Zustand** - State management
- **React Navigation** - Navigation

## Project Structure

```
HeyClaw/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ListeningButton.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── ConversationList.tsx
│   ├── screens/           # App screens
│   │   ├── HomeScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/          # Core services
│   │   ├── WebSocketService.ts
│   │   ├── WakeWordService.ts
│   │   ├── AudioService.ts
│   │   └── BackgroundService.ts
│   ├── store/             # Zustand state store
│   ├── navigation/        # React Navigation config
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   ├── constants/         # App constants
│   └── assets/            # Static assets
├── android/               # Android native code
├── ios/                   # iOS native code
└── __tests__/            # Tests
```

## Setup

### Prerequisites

- Node.js 20+
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- [Picovoice Console Account](https://console.picovoice.ai/) (for wake word)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/R4FI-bot/HeyClaw.git
   cd HeyClaw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS only: Install CocoaPods**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Get Picovoice Access Key**
   - Sign up at [Picovoice Console](https://console.picovoice.ai/)
   - Get your free Access Key
   - Add it in the app settings

5. **Run the app**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

## Configuration

### OpenClaw Gateway

1. Start your OpenClaw gateway
2. In HeyClaw settings, enter:
   - **Gateway URL**: `ws://YOUR_GATEWAY_IP:18789`
   - **Access Token**: Your OpenClaw access token

### Wake Word

Choose from built-in wake words:
- Porcupine
- Bumblebee
- Jarvis
- Computer
- Hey Google
- Alexa
- And more...

For custom wake words, use [Picovoice Console](https://console.picovoice.ai/).

## Android Background Service

HeyClaw uses a foreground service to keep wake word detection running in the background. This requires:

1. **Foreground Service Permission** - Granted automatically
2. **Notification** - Shows "HeyClaw is listening" in the notification bar
3. **Battery Optimization** - Recommend disabling for HeyClaw

## Development

### Build Debug APK
```bash
cd android
./gradlew assembleDebug
```

### Build Release APK
```bash
cd android
./gradlew assembleRelease
```

### Run Tests
```bash
npm test
```

## Troubleshooting

### Wake word not detecting
- Check microphone permissions
- Ensure Picovoice Access Key is valid
- Try a different wake word

### Not connecting to Gateway
- Verify Gateway URL and token
- Check network connectivity
- Ensure Gateway is running

### Background service stops
- Disable battery optimization for HeyClaw
- Check Android background app restrictions

## License

MIT

## Credits

- [OpenClaw](https://github.com/openclaw/openclaw) - AI Assistant Framework
- [Picovoice](https://picovoice.ai/) - Wake Word Detection
- [React Native](https://reactnative.dev/) - Mobile Framework
