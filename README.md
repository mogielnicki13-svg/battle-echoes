# Battle Echoes

**Stój tam, gdzie historia się działa.**

Battle Echoes to mobilna aplikacja, która zamienia pola bitewne w żywe lekcje historii. Słuchaj narracji z perspektywy różnych stron konfliktu, zbieraj artefakty, rozwiązuj quizy i odwiedzaj prawdziwe miejsca bitew dzięki GPS.

## Funkcje

- **21 bitew** z 6 epok historycznych (Starożytność → II Wojna Światowa)
- **Narracja audio** z wieloma perspektywami (narrator, strona A, strona B, mix)
- **Mapa interaktywna** z filtrowaniem po epokach i clusteringiem
- **System GPS** — odwiedź prawdziwe pole bitwy, odblokuj bonusy
- **Quizy** po każdej narracji z natychmiastowym feedbackiem
- **Artefakty** — kolekcjonerskie przedmioty z rzadkością (Common → Legendary)
- **System XP i poziomów** z monetami (Dukaty) i daily streak
- **15 osiągnięć** z automatycznym wykrywaniem i banerami
- **Kampanie** (pakiety bitew) do zakupu za Dukaty
- **Tryb Classroom** (Kahoot-style) — nauczyciel hostuje sesję quizową
- **Dwujęzyczność** — pełna obsługa PL/EN (500+ kluczy tłumaczeń)
- **6 motywów epok** z ambient dźwiękiem i animacjami dymu

## Tech Stack

| Warstwa | Technologia |
|---------|------------|
| Framework | Expo ~55 / React Native 0.83 / React 19 |
| Język | TypeScript (0 błędów) |
| Nawigacja | React Navigation 7 (typed — `RootStackParamList`) |
| State | Zustand v5 |
| Storage | AsyncStorage + Firebase Firestore |
| Audio | expo-av (narracja + ambient) |
| TTS | ElevenLabs API |
| GPS | expo-location + react-native-maps |
| IAP | RevenueCat (`react-native-purchases`) |
| i18n | i18next + react-i18next + expo-localization |
| Testy | Jest + ts-jest (136 testów, 5 suites) |
| Analytics | Firebase Analytics |
| Crash | CrashReportingService + ErrorBoundary |

## Szybki start

```bash
# 1. Sklonuj repo
git clone https://github.com/mogielnicki13-svg/battle-echoes.git
cd battle-echoes

# 2. Zainstaluj zależności
npm install

# 3. Skopiuj zmienne środowiskowe
cp .env.example .env
# Uzupełnij klucze w .env (ElevenLabs, RevenueCat)

# 4. Uruchom w Expo
npx expo start
# Klawisz 'a' → Android | 's' → Expo Go
```

### Dev Build (Android)

```bash
# Wymagane: Android Studio + JDK (JAVA_HOME)
npx expo run:android

# Jeśli Metro nie łączy się z telefonem:
adb reverse tcp:8081 tcp:8081
```

## Testy

```bash
npm test
# 136 testów, 5 suites:
#   - store.test.ts        — XP system (math)
#   - storeActions.test.ts — 70 testów akcji store (rewards, achievements, streaks)
#   - artifacts.test.ts    — integralność danych artefaktów
#   - quizData.test.ts     — struktura pytań quizowych
#   - i18n.test.ts         — parytet kluczy PL/EN
```

## Struktura projektu

```
src/
├── __tests__/          # Testy jednostkowe + mocki
├── artifacts/          # Dane artefaktów
├── campaigns/          # Pakiety kampanii (Campaign[])
├── components/         # Shared components (ErrorBoundary, SmokeBackground, XPSystem...)
├── constants/          # Design system (theme.ts), Firebase config, auth
├── data/               # Quiz data
├── hooks/              # Custom hooks (EraTheme, AmbientSound, Auth, Accessibility)
├── i18n/               # Internationalization (PL/EN)
├── navigation/         # React Navigation (typed) + types.ts
├── screens/            # 25+ ekranów
│   └── classroom/      # Tryb nauczyciela (Kahoot-style)
├── scripts/            # Seed Firestore
├── services/           # Firebase, GPS, Notifications, IAP, TTS, Analytics, Crash
├── store/              # Zustand store (20+ akcji)
└── utils/              # Platform helpers
```

## Epoki

| Epoka | Okres | Bitwy |
|-------|-------|-------|
| Starożytność | 800 p.n.e. – 476 | Termopile, Maraton, Kanny |
| Średniowiecze | 476 – 1500 | Grunwald, Agincourt, Hastings |
| Nowożytność | 1500 – 1789 | Lepanto, Wiedeń 1683, Rocroi |
| Era Napoleońska | 1789 – 1815 | Austerlitz, Borodino, Waterloo |
| I Wojna Światowa | 1914 – 1918 | Ypres, Verdun, Somma, Marna |
| II Wojna Światowa | 1939 – 1945 | Bitwa o Anglię, Stalingrad, Kursk, Normandia, Berlin |

## Licencja

Projekt prywatny. Wszelkie prawa zastrzeżone.
