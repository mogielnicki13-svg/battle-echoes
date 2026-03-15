// ============================================================
// BATTLE ECHOES — GPSService.ts
// Serwis GPS — lokalizacja, odległości, wykrywanie pól bitew
// ============================================================
import * as Location from 'expo-location';

// ── Typy ────────────────────────────────────────────────────
export interface Coords {
  latitude:  number;
  longitude: number;
}

export interface BattleSite {
  battleId:    string;
  name:        string;
  coords:      Coords;
  radiusM:     number;   // promień strefy w metrach
  xpReward:    number;
  coinReward:  number;
  artifactId?: string;   // legendarny artefakt za wizytę
}

export interface ProximityResult {
  site:        BattleSite;
  distanceM:   number;
  isInside:    boolean;  // czy w strefie
}

// ── Strefy pól bitew ─────────────────────────────────────
export const BATTLE_SITES: BattleSite[] = [
  // ── Starożytność ──────────────────────────────────────
  {
    battleId:   'marathon-490bc',
    name:       'Równina Maratońska',
    coords:     { latitude: 38.1537, longitude: 23.9613 },
    radiusM:    600,
    xpReward:   300,
    coinReward: 75,
  },
  {
    battleId:   'cannae-216bc',
    name:       'Pole bitwy pod Kannami',
    coords:     { latitude: 41.3059, longitude: 15.9940 },
    radiusM:    500,
    xpReward:   300,
    coinReward: 75,
  },
  // ── Średniowiecze ─────────────────────────────────────
  {
    battleId:   'grunwald-1410',
    name:       'Pole bitwy pod Grunwaldem',
    coords:     { latitude: 53.4833, longitude: 20.1167 },
    radiusM:    500,
    xpReward:   300,
    coinReward: 75,
    artifactId: 'grunwald_sword_jungingen',
  },
  {
    battleId:   'hastings-1066',
    name:       'Pole bitwy pod Hastings',
    coords:     { latitude: 50.9149, longitude: 0.5939 },
    radiusM:    400,
    xpReward:   300,
    coinReward: 75,
  },
  {
    battleId:   'agincourt-1415',
    name:       'Pole bitwy pod Azincourt',
    coords:     { latitude: 50.4583, longitude: 2.1357 },
    radiusM:    400,
    xpReward:   300,
    coinReward: 75,
  },
  // ── Nowożytność ───────────────────────────────────────
  {
    battleId:   'lepanto-1571',
    name:       'Zatoka Lepanto',
    coords:     { latitude: 38.4000, longitude: 21.2667 },
    radiusM:    1000,
    xpReward:   300,
    coinReward: 75,
  },
  {
    battleId:   'rocroi-1643',
    name:       'Pole bitwy pod Rocroi',
    coords:     { latitude: 49.9190, longitude: 4.5228 },
    radiusM:    400,
    xpReward:   300,
    coinReward: 75,
  },
  // ── Napoleon ──────────────────────────────────────────
  {
    battleId:   'waterloo-1815',
    name:       'Pole bitwy pod Waterloo',
    coords:     { latitude: 50.6800, longitude: 4.4120 },
    radiusM:    400,
    xpReward:   300,
    coinReward: 75,
    artifactId: 'waterloo_eagle_legendary',
  },
  {
    battleId:   'austerlitz-1805',
    name:       'Pole bitwy pod Austerlitz (Slavkov)',
    coords:     { latitude: 49.1575, longitude: 16.9012 },
    radiusM:    500,
    xpReward:   300,
    coinReward: 75,
  },
  {
    battleId:   'borodino-1812',
    name:       'Pole bitwy pod Borodino',
    coords:     { latitude: 55.5167, longitude: 35.8167 },
    radiusM:    600,
    xpReward:   300,
    coinReward: 75,
  },
  // ── I Wojna Światowa ──────────────────────────────────
  {
    battleId:   'ypres-1914',
    name:       'Ypres — Brama Menin',
    coords:     { latitude: 50.8503, longitude: 2.8787 },
    radiusM:    300,
    xpReward:   300,
    coinReward: 75,
    artifactId: 'ypres_menin_gate',
  },
  {
    battleId:   'marne-1914',
    name:       'Dolina Marny',
    coords:     { latitude: 48.9167, longitude: 3.6667 },
    radiusM:    800,
    xpReward:   300,
    coinReward: 75,
  },
  {
    battleId:   'verdun-1916',
    name:       'Fortece Verdun',
    coords:     { latitude: 49.1577, longitude: 5.3875 },
    radiusM:    500,
    xpReward:   350,
    coinReward: 90,
  },
  // ── II Wojna Światowa ─────────────────────────────────
  {
    battleId:   'britain-1940',
    name:       'RAF Biggin Hill (Bitwa o Anglię)',
    coords:     { latitude: 51.3308, longitude: 0.0312 },
    radiusM:    400,
    xpReward:   350,
    coinReward: 90,
  },
  {
    battleId:   'stalingrad-1942',
    name:       'Wołgograd — Mamajew Kurhan',
    coords:     { latitude: 48.7454, longitude: 44.5322 },
    radiusM:    500,
    xpReward:   400,
    coinReward: 100,
  },
];

// ════════════════════════════════════════════════════════════
// KALKULACJA ODLEGŁOŚCI (Haversine)
// ════════════════════════════════════════════════════════════
export function haversineDistance(a: Coords, b: Coords): number {
  const R   = 6371000; // promień Ziemi w metrach
  const lat1 = (a.latitude  * Math.PI) / 180;
  const lat2 = (b.latitude  * Math.PI) / 180;
  const dLat = ((b.latitude  - a.latitude)  * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ════════════════════════════════════════════════════════════
// SERWIS GPS
// ════════════════════════════════════════════════════════════
class GPSService {
  private subscription: Location.LocationSubscription | null = null;
  private lastCoords:   Coords | null = null;

  // ── Uprawnienia ──────────────────────────────────────────
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  // ── Pobierz aktualną lokalizację ─────────────────────────
  async getCurrentLocation(): Promise<Coords | null> {
    const ok = await this.hasPermission();
    if (!ok) return null;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      this.lastCoords = {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      return this.lastCoords;
    } catch {
      return null;
    }
  }

  // ── Sprawdź bliskość wszystkich pól bitew ─────────────────
  checkProximity(userCoords: Coords): ProximityResult[] {
    return BATTLE_SITES.map(site => {
      const distanceM = haversineDistance(userCoords, site.coords);
      return {
        site,
        distanceM,
        isInside: distanceM <= site.radiusM,
      };
    }).sort((a, b) => a.distanceM - b.distanceM);
  }

  // ── Nasłuchuj zmian lokalizacji ──────────────────────────
  async startWatching(
    onUpdate: (coords: Coords, proximity: ProximityResult[]) => void,
    intervalMs = 10000
  ): Promise<boolean> {
    const ok = await this.requestPermission();
    if (!ok) return false;

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy:           Location.Accuracy.Balanced,
        timeInterval:       intervalMs,
        distanceInterval:   20, // update co 20m ruchu
      },
      (loc) => {
        const coords: Coords = {
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        this.lastCoords = coords;
        const proximity = this.checkProximity(coords);
        onUpdate(coords, proximity);
      }
    );

    return true;
  }

  stopWatching(): void {
    this.subscription?.remove();
    this.subscription = null;
  }

  getLastCoords(): Coords | null {
    return this.lastCoords;
  }

  // ── Symulacja lokalizacji (demo / emulator) ───────────────
  simulateLocation(battleSiteIndex = 0): Coords {
    // Zwraca współrzędne blisko pierwszego pola bitwy
    const site = BATTLE_SITES[battleSiteIndex];
    return {
      latitude:  site.coords.latitude  + (Math.random() - 0.5) * 0.002,
      longitude: site.coords.longitude + (Math.random() - 0.5) * 0.002,
    };
  }
}

export const gpsService = new GPSService();
export default gpsService;
