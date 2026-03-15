// ============================================================
// BATTLE ECHOES — ElevenLabsService.ts
// Generuje i cachuje narracje głosowe przez ElevenLabs API
// ============================================================
// UŻYCIE:
//   const uri = await generateAndCacheNarration(battleId, sceneId, text, 'narrator');
//   // uri to ścieżka do pliku MP3 lub null (brak klucza / Expo Go)
//
// KLUCZ API: uzupełnij ELEVENLABS_API_KEY w src/constants/auth.ts
// CACHE:     FileSystem.documentDirectory + 'audio/' (trwały między sesjami)
// ============================================================

import { ELEVENLABS_API_KEY } from '../constants/auth';

// Lazy require expo-file-system (unavailable in Expo Go)
let FS: any = null;
try {
  FS = require('expo-file-system');
} catch {
  console.warn('[ElevenLabs] expo-file-system niedostępny — cache wyłączony');
}

// ── Voice ID mapping ─────────────────────────────────────────
// narrator → Adam  (spokojny, historyczny)
// side_a   → Josh  (pewny, militarny)
// side_b   → Arnold (głęboki, dramatyczny)
// mix      → Adam  (narrator jako fallback dla miksu)
const VOICE_IDS: Record<string, string> = {
  narrator: 'pNInz6obpgDQGcFmaJgB',
  side_a:   'TxGEqnHWrfWFTfGW9XjX',
  side_b:   'VR6AewLTigWG4xSOukaG',
  mix:      'pNInz6obpgDQGcFmaJgB',
};

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const MODEL_ID        = 'eleven_multilingual_v2';

// ── Cache dir ─────────────────────────────────────────────────
async function getCacheDir(): Promise<string | null> {
  if (!FS) return null;
  const dir = `${FS.documentDirectory}audio/`;
  const info = await FS.getInfoAsync(dir);
  if (!info.exists) {
    await FS.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

// ── Główna funkcja ────────────────────────────────────────────
// Zwraca lokalną ścieżkę do pliku MP3, lub null gdy:
//   - brak klucza API (ELEVENLABS_API_KEY = '')
//   - brak expo-file-system (Expo Go)
export async function generateAndCacheNarration(
  battleId:  string,
  sceneId:   number | string,
  text:      string,
  voiceName: string,
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('[ElevenLabs] Brak klucza API — ustaw ELEVENLABS_API_KEY w src/constants/auth.ts');
    return null;
  }

  if (!FS) {
    console.warn('[ElevenLabs] expo-file-system niedostępny');
    return null;
  }

  const voiceId  = VOICE_IDS[voiceName] ?? VOICE_IDS.narrator;
  const cacheDir = await getCacheDir();
  if (!cacheDir) return null;

  const fileName = `${battleId}_${sceneId}_${voiceName}.mp3`;
  const filePath = cacheDir + fileName;

  // Cache hit — zwróć istniejący plik
  const cached = await FS.getInfoAsync(filePath);
  if (cached.exists) {
    if (__DEV__) console.log('[ElevenLabs] Cache hit:', fileName);
    return filePath;
  }

  // Generuj przez ElevenLabs API
  if (__DEV__) console.log('[ElevenLabs] Generuję:', fileName);

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability:        0.5,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }

  // Zapisz jako base64
  const buffer = await res.arrayBuffer();
  const base64 = bufferToBase64(buffer);
  await FS.writeAsStringAsync(filePath, base64, {
    encoding: FS.EncodingType.Base64,
  });

  if (__DEV__) console.log('[ElevenLabs] Zapisano:', filePath);
  return filePath;
}

// ── Ile scen danej bitwy + perspektywy jest w cache ──────────
export async function countCachedNarrations(
  battleId: string,
  voiceName: string,
): Promise<number> {
  if (!FS) return 0;
  const cacheDir = await getCacheDir();
  if (!cacheDir) return 0;
  try {
    const files: string[] = await FS.readDirectoryAsync(cacheDir);
    return files.filter(
      f => f.startsWith(`${battleId}_`) && f.endsWith(`_${voiceName}.mp3`),
    ).length;
  } catch {
    return 0;
  }
}

// ── Prebatch-generuj wszystkie sceny dla danej bitwy ──────────
// Zwraca { succeeded, failed, skipped }
export async function pregenerateBattle(
  battleId: string,
  scenes: Array<{ id: string | number; text: string }>,
  voiceName: string,
  onProgress: (done: number, total: number) => void,
): Promise<{ succeeded: number; failed: number; skipped: number }> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('[ElevenLabs] pregenerateBattle: brak klucza API');
    return { succeeded: 0, failed: scenes.length, skipped: 0 };
  }
  if (!FS) {
    return { succeeded: 0, failed: scenes.length, skipped: 0 };
  }

  const voiceId  = VOICE_IDS[voiceName] ?? VOICE_IDS.narrator;
  const cacheDir = await getCacheDir();
  if (!cacheDir) return { succeeded: 0, failed: scenes.length, skipped: 0 };

  let succeeded = 0, failed = 0, skipped = 0;
  const total = scenes.length;

  for (const scene of scenes) {
    const fileName = `${battleId}_${scene.id}_${voiceName}.mp3`;
    const filePath = cacheDir + fileName;

    // Pomiń jeśli już w cache
    const info = await FS.getInfoAsync(filePath).catch(() => ({ exists: false }));
    if ((info as any).exists) {
      skipped++;
      onProgress(succeeded + skipped, total);
      continue;
    }

    try {
      const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key':   ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text:      scene.text,
          model_id:  MODEL_ID,
          voice_settings: { stability: 0.6, similarity_boost: 0.8 },
        }),
      });

      if (!res.ok) {
        failed++;
      } else {
        const base64 = bufferToBase64(await res.arrayBuffer());
        await FS.writeAsStringAsync(filePath, base64, {
          encoding: FS.EncodingType.Base64,
        });
        succeeded++;
      }
    } catch (e) {
      console.warn(`[ElevenLabs] pregenerateBattle failed scene ${scene.id}:`, e);
      failed++;
    }

    onProgress(succeeded + skipped, total);
  }

  if (__DEV__) console.log(`[ElevenLabs] pregenerateBattle ${battleId}: +${succeeded} ok, ${skipped} skip, ${failed} err`);
  return { succeeded, failed, skipped };
}

// ── Usuń cache dla danej bitwy ────────────────────────────────
export async function clearBattleCache(battleId: string): Promise<void> {
  if (!FS) return;
  const cacheDir = await getCacheDir();
  if (!cacheDir) return;

  const files = await FS.readDirectoryAsync(cacheDir).catch(() => [] as string[]);
  for (const file of files) {
    if (file.startsWith(battleId + '_')) {
      await FS.deleteAsync(cacheDir + file, { idempotent: true });
    }
  }
}

// ── ArrayBuffer → Base64 ─────────────────────────────────────
// Przetwarza w kawałkach 8 KB, żeby uniknąć przepełnienia stosu
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes  = new Uint8Array(buffer);
  const CHUNK  = 8192;
  let binary   = '';

  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as any));
  }

  return btoa(binary);
}
