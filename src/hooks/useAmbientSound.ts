// ============================================================
// BATTLE ECHOES — useAmbientSound.ts
// Ambient dźwięki w tle — zmieniają się wraz z motywem epoki
// ============================================================
// UŻYCIE:
//   // W App.tsx lub głównym ekranie:
//   useAmbientSound();   ← uruchamia ambient automatycznie
//
// PLIKI AUDIO (src/assets/audio/ambient/):
//   ambient_medieval.m4a      ← konie, miecze, bębny, wiatr
//   ambient_ancient.m4a       ← morze, wiatr, ptaki
//   ambient_early_modern.m4a  ← fallback: napoleon (brak osobnego pliku)
//   ambient_napoleon.m4a      ← bębny, fanfary, armaty
//   ambient_ww1.m4a           ← deszcz, artyleria, okopy
//   ambient_ww2.m4a           ← samoloty, eksplozje, radio
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useEraTheme } from './EraThemeContext';

// Mapa era → plik audio
const AMBIENT_FILES: Record<string, any> = {
  medieval:     require('../assets/audio/ambient/ambient_medieval.m4a'),
  ancient:      require('../assets/audio/ambient/ambient_ancient.m4a'),
  early_modern: require('../assets/audio/ambient/ambient_napoleon.m4a'), // fallback — brak osobnego pliku
  napoleon:     require('../assets/audio/ambient/ambient_napoleon.m4a'),
  ww1:          require('../assets/audio/ambient/ambient_ww1.m4a'),
  ww2:          require('../assets/audio/ambient/ambient_ww2.m4a'),
};

const AMBIENT_VOLUME = 0.12;  // Bardzo cichy ambient — nie przeszkadza w czytaniu

// Lazy load expo-av — jeśli native module niedostępny (Expo Go), hook się cicho wyłącza
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch {
  if (__DEV__) console.warn('[Ambient] expo-av niedostępne — ambient wyłączony (Expo Go). Użyj dev build.');
}

export function useAmbientSound() {
  const { currentEra } = useEraTheme();
  const soundRef      = useRef<any>(null);
  const currentEraRef = useRef<string>('');
  const isLoadingRef  = useRef(false);
  const pendingEraRef = useRef<string>(''); // ostatnie żądanie (może przyjść podczas ładowania)

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const playAmbient = useCallback(async (eraId: string) => {
    if (!Audio) return;  // expo-av niedostępne — cicha rezygnacja

    // Zawsze zapamiętaj ostatnie żądanie
    pendingEraRef.current = eraId;

    // Jeśli trwa już ładowanie — pętla while niżej zajmie się pending po zakończeniu
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;

    try {
      // Ładuj w pętli dopóki pending !== current (np. era zmieniła się podczas ładowania)
      while (pendingEraRef.current !== currentEraRef.current) {
        const target = pendingEraRef.current;
        if (!AMBIENT_FILES[target]) { currentEraRef.current = target; break; }

        await stopSound();
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          AMBIENT_FILES[target],
          { isLooping: true, volume: AMBIENT_VOLUME, shouldPlay: true }
        );

        soundRef.current = sound;
        currentEraRef.current = target;
      }
    } catch (err) {
      if (__DEV__) console.warn(`[Ambient] Błąd odtwarzania`);
    } finally {
      isLoadingRef.current = false;
    }
  }, [stopSound]);

  // Zmiana epoki → zmień ambient
  useEffect(() => {
    if (currentEra === currentEraRef.current) return;
    playAmbient(currentEra);
  }, [currentEra, playAmbient]);

  // Pauza gdy aplikacja w tle
  useEffect(() => {
    if (!Audio) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (!soundRef.current) return;
      try {
        if (state === 'background' || state === 'inactive') {
          await soundRef.current.pauseAsync();
        } else if (state === 'active') {
          await soundRef.current.playAsync();
        }
      } catch {}
    });
    return () => sub.remove();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { stopSound(); };
  }, []);
}

// ════════════════════════════════════════════════════════════
// WERSJA BEZ EXPO-AV (jeśli nie masz biblioteki)
// Zamień import expo-av na tę wersję — używa react-native-sound
// ════════════════════════════════════════════════════════════
// import Sound from 'react-native-sound';
// Sound.setCategory('Ambient', true);
//
// export function useAmbientSound() {
//   const { currentEra } = useEraTheme();
//   const soundRef = useRef<Sound | null>(null);
//
//   useEffect(() => {
//     soundRef.current?.stop(() => soundRef.current?.release());
//     const filename = `ambient_${currentEra}.mp3`;
//     soundRef.current = new Sound(filename, Sound.MAIN_BUNDLE, (err) => {
//       if (!err) {
//         soundRef.current?.setVolume(0.12);
//         soundRef.current?.setNumberOfLoops(-1);
//         soundRef.current?.play();
//       }
//     });
//     return () => { soundRef.current?.stop(() => soundRef.current?.release()); };
//   }, [currentEra]);
// }
