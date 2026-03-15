// ============================================================
// BATTLE ECHOES — firebase.ts
// Konfiguracja Firebase (Firestore jako baza bitew i postępów)
//
// KONFIGURACJA (jednorazowo):
//  1. Wejdź na https://console.firebase.google.com
//  2. Utwórz projekt (np. "battle-echoes")
//  3. Build → Firestore Database → Create database
//     Region: eur3 (europe-west) | Mode: Production
//  4. Project Settings → Your apps → </> (Web) → Register app
//  5. Skopiuj wartości z `firebaseConfig` poniżej
//
// REGUŁY FIRESTORE (PRODUKCYJNE — wgraj do Firebase Console):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       // Bitwy — publiczny odczyt, brak zapisu z klienta
//       match /battles/{id} {
//         allow read: if true;
//         allow write: if false;
//       }
//       // Postęp użytkownika — tylko właściciel może czytać/pisać
//       match /users/{userId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//       // Ranking — odczyt publiczny, zapis tylko przez właściciela
//       match /leaderboard/{userId} {
//         allow read: if true;
//         allow write: if request.auth != null && request.auth.uid == userId;
//       }
//       // Sesje classroom — odczyt dla uczestników, zapis dla hosta
//       match /sessions/{sessionId} {
//         allow read: if true;
//         allow write: if request.auth != null;
//         match /participants/{participantId} {
//           allow read: if true;
//           allow write: if request.auth != null;
//         }
//       }
//       // Domyślnie: blokuj wszystko
//       match /{document=**} {
//         allow read, write: if false;
//       }
//     }
//   }
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAVdHU1Rwfb4Mh7z9A0RWMWupRTLF2GB_k',
  authDomain:        'battle-echoes-63e55.firebaseapp.com',
  projectId:         'battle-echoes-63e55',
  storageBucket:     'battle-echoes-63e55.firebasestorage.app',
  messagingSenderId: '220331049837',
  appId:             '1:220331049837:web:bc4c47766975ea6de6d064',
} as const;
