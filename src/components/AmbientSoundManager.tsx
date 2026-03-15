// ============================================================
// BATTLE ECHOES — AmbientSoundManager.tsx
// Wstaw ten komponent wewnątrz <EraThemeProvider> w App.tsx
// ============================================================
// W App.tsx:
//
//   import AmbientSoundManager from './src/components/AmbientSoundManager';
//
//   return (
//     <EraThemeProvider>
//       <AmbientSoundManager />          ← dodaj tę linię
//       <StatusBar ... />
//       <AppNavigation />
//     </EraThemeProvider>
//   );
// ============================================================

import { useAmbientSound } from '../hooks/useAmbientSound';

export default function AmbientSoundManager() {
  useAmbientSound();
  return null;  // Nie renderuje nic — tylko zarządza dźwiękiem
}
