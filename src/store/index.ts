// ============================================================
// BATTLE ECHOES — store/index.ts (z artefaktami)
// ============================================================
// TIP: Use selectors to avoid unnecessary re-renders:
//   const battles = useAppStore(s => s.battles);
//   const user = useAppStore(s => s.user);
// ============================================================
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { EraId, Colors, ERA_THEMES } from '../constants/theme';
import * as WebBrowser from 'expo-web-browser';
import {
  getBattles,
  getUserProgress,
  saveUserProgress,
  updateLeaderboardEntry,
} from '../services/FirebaseService';
import BATTLE_IMAGE_URLS from '../services/BattleImageUrls';
import notificationService from '../services/NotificationService';
import {
  rescheduleStreakNotifications,
  rescheduleWeeklyRecap,
  checkLevelUpReminder,
} from '../services/NotificationTriggers';
import { SEED_CAMPAIGNS, findCampaignForBattle, type Campaign } from '../campaigns/data';
export type { Campaign };
WebBrowser.maybeCompleteAuthSession();

// ── Recruit Pack constants ─────────────────────────────────
const KEY_FIRST_LAUNCH_TS    = 'be_first_launch_ts';
const RECRUIT_PACK_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

export const XP_REWARDS = {
  listen_full: 100, listen_all: 250, visit_gps: 300,
  daily_streak: 75, first_battle: 200,
};
export const COIN_REWARDS = {
  listen_full: 25, listen_all: 60, visit_gps: 75,
  daily_streak: 20, first_battle: 50, level_up: 100,
};

// XP przyznawane jednorazowo przy odblokowaniu osiągnięcia
export const ACHIEVEMENT_XP_REWARDS: Record<string, number> = {
  first_listen: 50,  five_listens: 150, all_listens: 400,  streak_7: 200,
  first_gps: 100,    three_gps: 300,    five_gps: 500,     all_eras: 600,
  first_artifact: 75, five_artifacts: 250, ten_artifacts: 500, all_perspectives: 200,
  first_quiz: 100,   three_quizzes: 300,
  level_10: 0,       xp_5000: 0,
};

export function xpForLevel(level: number): number { return level * 500; }
export function levelFromXP(totalXP: number): { level: number; currentXP: number; xpToNext: number } {
  let level = 1, remaining = totalXP;
  while (remaining >= xpForLevel(level)) { remaining -= xpForLevel(level); level++; }
  return { level, currentXP: remaining, xpToNext: xpForLevel(level) };
}

export interface User {
  id: string; name: string; email: string;
  provider: 'google' | 'apple' | 'guest';
  unlockedEras:      EraId[];
  unlockedBattles:   string[];
  listenedBattles:   string[];
  visitedBattles:    string[];
  completedBattles:  string[];
  completedQuizzes:    string[];   // battleId-e quizów ukończonych (co najmniej raz)
  unlockedArtifacts:   string[];   // ← NOWE
  seenAchievementIds:  string[];   // osiągnięcia już wyświetlone graczowi
  activityLog: Record<string, number>; // 'YYYY-MM-DD' → liczba bitew
  totalXP:    number;
  coins:      number;
  streak:     number;
  lastActive: string;
  isEducator?: boolean;            // ← Tryb nauczyciela

  // ── Onboarding / Guest-to-Auth ────────────────────────
  isGuest?: boolean;               // true for guest accounts
  hasCompletedFirstBattle?: boolean; // first narration finished
  promoteDismissed?: boolean;      // user dismissed Commander promo
  ownedCampaigns?: string[];       // ID zakupionych pakietów kampanii
}

export interface Battle {
  id: string; name: string; era: EraId; date: string;
  location: { name: string; lat: number; lng: number };
  summary: string; outcome: string;
  sides: string[]; commanders: string[];
  imageUrl?: string; // URL do ikonicznego obrazu/zdjęcia (Wikimedia Commons)
  campaignId?: string; // opcjonalne — bitwa należy do pakietu kampanii
}

export interface RewardEvent {
  id: string; type: 'xp' | 'coins' | 'level_up' | 'unlock';
  amount?: number; level?: number; label: string; icon: string; color: string;
}

interface AppStore {
  user: User | null;
  battles: Battle[];
  campaigns: Campaign[];           // pakiety kampanii (dane ze SEED_CAMPAIGNS)
  isAuthLoading: boolean;
  isAppReady: boolean;
  pendingRewards: RewardEvent[];
  pendingUnlocks: string[];        // kolejka ID osiągnięć do wyświetlenia w bannerze

  // ── Recruit Pack ──────────────────────────────────────
  firstLaunchTs: number | null;  // ms timestamp, null until initFirstLaunch

  signInWithGoogle: (profile: { id: string; name: string; email: string }) => Promise<void>;
  signInWithApple:  (profile?: { id: string; name: string; email: string }) => Promise<void>;
  signInAsGuest:    () => void;
  signOut:          () => void;

  awardXP:             (amount: number, reason: string) => RewardEvent[];
  awardCoins:          (amount: number, reason: string) => RewardEvent[];
  unlockArtifact:      (artifactId: string) => void;
  unlockEra:           (eraId: string) => void;
  unlockBattle:        (battleId: string) => void;
  unlockAllEras:       () => void;           // ← Pakiet Pełny
  markBattleListened:  (battleId: string) => RewardEvent[];
  markBattleVisited:   (battleId: string, xpOverride?: number, coinOverride?: number) => RewardEvent[];
  markBattleCompleted: (battleId: string) => RewardEvent[];
  markQuizCompleted:   (battleId: string) => void;          // rejestruje ukończenie quizu (XP przyznawane osobno w QuizScreen)
  checkDailyStreak:         () => RewardEvent[];
  checkAchievements:        () => void;   // wykryj nowo odblokowane → banner + XP
  clearPendingRewards:      () => void;
  dismissAchievementUnlock: () => void;  // usuń pierwsze z kolejki
  canAccessBattle:      (battleId: string) => boolean;
  getCampaignForBattle: (battleId: string) => Campaign | undefined;
  purchaseCampaign:     (campaignId: string) => RewardEvent[];
  hasAllEras:           () => boolean;
  setEducatorMode:     (enabled: boolean) => void; // ← tryb nauczyciela
  getLevelInfo:        () => { level: number; currentXP: number; xpToNext: number };
  loadFromStorage:     () => Promise<void>;
  saveToStorage:       () => Promise<void>;

  // ── Onboarding / Guest-to-Auth ────────────────────────
  initFirstLaunch:           () => Promise<void>;
  isRecruitPackActive:       () => boolean;
  getRecruitPackSecondsLeft: () => number;
  dismissCommanderPromotion: () => void;
  promoteGuestToAuth: (profile: { id: string; name: string; email: string; provider: 'google' | 'apple' }) => Promise<void>;
}

export const MOCK_BATTLES: Battle[] = [
  {
    id: 'grunwald-1410', name: 'Bitwa pod Grunwaldem', era: 'medieval',
    date: '15 lipca 1410',
    location: { name: 'Grunwald, Polska', lat: 53.4833, lng: 20.1167 },
    summary: 'Jedna z największych bitew średniowiecznej Europy — starcie 39 chorągwi polsko-litewskich z armią Zakonu Krzyżackiego.',
    outcome: 'Zwycięstwo Polski i Litwy',
    sides: ['Królestwo Polskie i Litwa', 'Zakon Krzyżacki'],
    commanders: ['Władysław II Jagiełło', 'Ulrich von Jungingen'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg/800px-Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg',
  },
  {
    id: 'ypres-1914', name: 'Pierwsza Bitwa pod Ypres', era: 'ww1',
    date: 'Październik–Listopad 1914',
    location: { name: 'Ypres, Belgia', lat: 50.8503, lng: 2.8787 },
    summary: 'Zacięte starcia o kontrolę nad belgijskim miastem Ypres, ostatnie wielkie manewrowe walki na Zachodzie.',
    outcome: 'Alianckie utrzymanie Ypres',
    sides: ['Ententa', 'Cesarstwo Niemieckie'],
    commanders: ['John French', 'Erich von Falkenhayn'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  },
  {
    id: 'waterloo-1815', name: 'Bitwa pod Waterloo', era: 'napoleon',
    date: '18 czerwca 1815',
    location: { name: 'Waterloo, Belgia', lat: 50.6800, lng: 4.4120 },
    summary: 'Ostateczna klęska Napoleona Bonaparte — koniec Stu Dni i epoki napoleońskiej w Europie.',
    outcome: 'Zwycięstwo Koalicji',
    sides: ['Koalicja (Wielka Brytania, Prusy)', 'Cesarstwo Francuskie'],
    commanders: ['Wellington, Blücher', 'Napoleon Bonaparte'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Battle_of_Waterloo_1815.PNG/800px-Battle_of_Waterloo_1815.PNG',
  },
  {
    id: 'verdun-1916', name: 'Bitwa pod Verdun', era: 'ww1',
    date: 'Luty–Grudzień 1916',
    location: { name: 'Verdun, Francja', lat: 49.1600, lng: 5.3840 },
    summary: '10 miesięcy piekła — najdłuższa bitwa I Wojny Światowej, symbol jej bezsensu i poświęcenia.',
    outcome: 'Obrona Verdun przez Francję',
    sides: ['Francja', 'Cesarstwo Niemieckie'],
    commanders: ['Philippe Pétain', 'Erich von Falkenhayn'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Battle_of_Verdun_map.png/800px-Battle_of_Verdun_map.png',
  },
  {
    id: 'thermopylae-480bc', name: 'Bitwa pod Termopilami', era: 'ancient',
    date: 'Sierpień 480 p.n.e.',
    location: { name: 'Termopile, Grecja', lat: 38.7953, lng: 22.5335 },
    summary: '300 Spartan króla Leonidasa stawiło opór milionowej armii perskiej Kserksesa w wąwozie Termopile.',
    outcome: 'Taktyczna klęska Grecji, strategiczne zwycięstwo moralne',
    sides: ['Związek Helleński', 'Cesarstwo Perskie'],
    commanders: ['Leonidas I', 'Kserkses I'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg/800px-L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg',
  },
  {
    id: 'agincourt-1415', name: 'Bitwa pod Agincourt', era: 'medieval',
    date: '25 października 1415',
    location: { name: 'Agincourt, Francja', lat: 50.4600, lng: 2.1427 },
    summary: 'Henryk V z 6 000 wyczerpaną armią rozgromił 36 000 Francuzów dzięki angielskim łucznikom.',
    outcome: 'Druzgocące zwycięstwo Anglii',
    sides: ['Królestwo Anglii', 'Królestwo Francji'],
    commanders: ['Henryk V', 'Charles d\'Albret'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Schlacht_von_Azincourt.jpg/800px-Schlacht_von_Azincourt.jpg',
  },
  {
    id: 'borodino-1812', name: 'Bitwa pod Borodino', era: 'napoleon',
    date: '7 września 1812',
    location: { name: 'Borodino, Rosja', lat: 55.5225, lng: 35.8181 },
    summary: 'Największa bitwa kampanii rosyjskiej — 70 000 ofiar w ciągu jednego dnia. Napoleon zdobył pole, ale nie rozbił armii rosyjskiej.',
    outcome: 'Pyrrusowe zwycięstwo Francji',
    sides: ['Cesarstwo Francuskie', 'Cesarstwo Rosyjskie'],
    commanders: ['Napoleon Bonaparte', 'Michaił Kutuzow'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Battle_of_Borodino.jpg/800px-Battle_of_Borodino.jpg',
  },
  {
    id: 'gettysburg-1863', name: 'Bitwa pod Gettysburgiem', era: 'early_modern',
    date: '1–3 lipca 1863',
    location: { name: 'Gettysburg, USA', lat: 39.8282, lng: -77.2311 },
    summary: 'Punkt zwrotny amerykańskiej wojny domowej — ostatnia ofensywa Lee na Północ zakończyła się klęską Konfederacji.',
    outcome: 'Zwycięstwo Unii',
    sides: ['Unia (Północ)', 'Konfederacja (Południe)'],
    commanders: ['George Meade', 'Robert E. Lee'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Pickett%27s_Charge%2C_Gettysburg%2C_by_Thure_de_Thulstrup.jpg/800px-Pickett%27s_Charge%2C_Gettysburg%2C_by_Thure_de_Thulstrup.jpg',
  },
  {
    id: 'britain-1940', name: 'Bitwa o Anglię', era: 'ww2',
    date: 'Lipiec–Październik 1940',
    location: { name: 'Anglia, Wielka Brytania', lat: 51.1426, lng: 0.0311 },
    summary: 'Pierwsza bitwa stoczona wyłącznie w powietrzu — RAF ocalił Wielką Brytanię przed inwazją.',
    outcome: 'Zwycięstwo RAF, Niemcy porzucają plan inwazji',
    sides: ['Wielka Brytania (RAF)', 'Niemcy (Luftwaffe)'],
    commanders: ['Hugh Dowding', 'Hermann Göring'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Royal_Air_Force_Fighter_Command%2C_1939-1945._C2123.jpg/800px-Royal_Air_Force_Fighter_Command%2C_1939-1945._C2123.jpg',
  },
  {
    id: 'stalingrad-1942', name: 'Bitwa o Stalingrad', era: 'ww2',
    date: 'Sierpień 1942 – Luty 1943',
    location: { name: 'Wołgograd (Stalingrad), Rosja', lat: 48.7080, lng: 44.5133 },
    summary: 'Punkt zwrotny II Wojny Światowej — okrążenie i zniszczenie 6. Armii Paulusa, koniec ofensywy Niemiec na Wschodzie.',
    outcome: 'Zwycięstwo ZSRR',
    sides: ['ZSRR', 'Niemcy i sojusznicy'],
    commanders: ['Wasilij Czujkow, Georgi Żukow', 'Friedrich Paulus'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Battle_of_Stalingrad_second_collage.jpg/800px-The_Battle_of_Stalingrad_second_collage.jpg',
  },
  {
    id: 'marathon-490bc', name: 'Bitwa pod Maratonem', era: 'ancient',
    date: 'Wrzesień 490 p.n.e.',
    location: { name: 'Marathon, Grecja', lat: 38.1544, lng: 23.9646 },
    summary: '10 000 Ateńczyków rozbiło 25 000 Persów — pierwsze wielkie zwycięstwo Hellady nad imperium i narodziny legendy maratonu.',
    outcome: 'Zwycięstwo Aten',
    sides: ['Ateny i Plateje', 'Cesarstwo Perskie'],
    commanders: ['Miltiades', 'Datis i Artafernes'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Scene_of_the_Battle_of_Marathon.jpg/800px-Scene_of_the_Battle_of_Marathon.jpg',
  },
  {
    id: 'lepanto-1571', name: 'Bitwa pod Lepanto', era: 'early_modern',
    date: '7 października 1571',
    location: { name: 'Zatoka Patraikos, Grecja', lat: 38.3667, lng: 21.7667 },
    summary: 'Liga Święta rozbiła flotę Osmanów — ostatnia wielka bitwa morska na galery, zatrzymanie osmańskiej ekspansji na zachód.',
    outcome: 'Zwycięstwo Ligi Świętej',
    sides: ['Liga Święta (Hiszpania, Wenecja, Papiestwo)', 'Imperium Osmańskie'],
    commanders: ['Don Juan de Austria', 'Ali Pasza'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg/800px-Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg',
  },
  {
    id: 'austerlitz-1805', name: 'Bitwa pod Austerlitz', era: 'napoleon',
    date: '2 grudnia 1805',
    location: { name: 'Austerlitz (Sławków), Czechy', lat: 49.1550, lng: 16.7700 },
    summary: 'Bitwa Trzech Cesarzy — arcydzieło Napoleona. 73 000 Francuzów rozbiło 85 000 Austriaków i Rosjan w 9 godzin.',
    outcome: 'Druzgocące zwycięstwo Francji',
    sides: ['Cesarstwo Francuskie', 'Austria i Rosja'],
    commanders: ['Napoleon Bonaparte', 'Aleksander I, Franciszek II'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg/800px-La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg',
  },
  {
    id: 'somme-1916', name: 'Bitwa nad Sommą', era: 'ww1',
    date: 'Lipiec–Listopad 1916',
    location: { name: 'Somma, Francja', lat: 50.0010, lng: 2.6850 },
    summary: '1 lipca 1916 — najczarniejszy dzień w historii brytyjskiej armii: 57 470 ofiar w jednym dniu. Pierwsze użycie czołgów w historii.',
    outcome: 'Nierozstrzygnięte, minimalne postępy Aliantów',
    sides: ['Wielka Brytania i Francja', 'Cesarstwo Niemieckie'],
    commanders: ['Douglas Haig', 'Fritz von Below'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Map_of_the_Battle_of_the_Somme%2C_1916.svg/800px-Map_of_the_Battle_of_the_Somme%2C_1916.svg.png',
  },
  {
    id: 'kursk-1943', name: 'Bitwa pod Kurskiem', era: 'ww2',
    date: 'Lipiec–Sierpień 1943',
    location: { name: 'Kursk, Rosja', lat: 51.7304, lng: 36.1927 },
    summary: 'Największa bitwa pancerna w historii — 6 000 czołgów. Operacja Cytadela złamana, po Kursku Niemcy już się nie ofensywali na Wschodzie.',
    outcome: 'Zwycięstwo ZSRR',
    sides: ['ZSRR', 'Niemcy (Operacja Cytadela)'],
    commanders: ['Georgi Żukow, Rokossowski', 'Walter Model, Erich von Manstein'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Bundesarchiv_Bild_183-J14813%2C_Russland%2C_Kampf_um_Kursk%2C_Panzer_VI_%28Tiger_I%29.jpg/800px-Bundesarchiv_Bild_183-J14813%2C_Russland%2C_Kampf_um_Kursk%2C_Panzer_VI_%28Tiger_I%29.jpg',
  },
  {
    id: 'cannae-216bc', name: 'Bitwa pod Kannami', era: 'ancient',
    date: '2 sierpnia 216 p.n.e.',
    location: { name: 'Kanny, Italia', lat: 41.3050, lng: 16.1325 },
    summary: 'Arcydzieło taktyczne Hannibala — podwójne okrążenie i zniszczenie 8 legionów rzymskich. Największa klęska Republiki Rzymskiej.',
    outcome: 'Druzgocące zwycięstwo Kartaginy',
    sides: ['Kartagina', 'Republika Rzymska'],
    commanders: ['Hannibal Barkas', 'Lucjusz Emiliusz Paulus'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg/800px-The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg',
  },
  {
    id: 'hastings-1066', name: 'Bitwa pod Hastings', era: 'medieval',
    date: '14 października 1066',
    location: { name: 'Hastings, Anglia', lat: 50.9087, lng: 0.4857 },
    summary: 'Wilhelm Zdobywca pokonał anglosaskiego króla Harolda II i rozpoczął normandzkie panowanie w Anglii.',
    outcome: 'Zwycięstwo Normanów',
    sides: ['Normandia', 'Anglia anglosaska'],
    commanders: ['Wilhelm Zdobywca', 'Harold II Godwinson'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg/800px-Bayeux_Tapestry_scene57_Harold_death.jpg',
  },
  {
    id: 'vienna-1683', name: 'Bitwa pod Wiedniem', era: 'early_modern',
    date: '12 września 1683',
    location: { name: 'Wiedeń, Austria', lat: 48.2082, lng: 16.3738 },
    summary: 'Jan III Sobieski na czele husarii złamał oblężenie Wiednia przez Turków — ostatnia wielka szarża kawaleryjska w historii.',
    outcome: 'Zwycięstwo Ligi Świętej',
    sides: ['Liga Święta (Polska, Austria, Niemcy)', 'Imperium Osmańskie'],
    commanders: ['Jan III Sobieski', 'Kara Mustafa'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Anonym_Entsatz_Wien_1683.jpg/800px-Anonym_Entsatz_Wien_1683.jpg',
  },
  {
    id: 'rocroi-1643', name: 'Bitwa pod Rocroi', era: 'early_modern',
    date: '19 maja 1643',
    location: { name: 'Rocroi, Francja', lat: 49.9269, lng: 4.5231 },
    summary: 'Młody książę Condé rozbił hiszpańskie tercios — koniec mitu niezwyciężonej piechoty hiszpańskiej.',
    outcome: 'Zwycięstwo Francji',
    sides: ['Królestwo Francji', 'Hiszpania Habsburgów'],
    commanders: ['Ludwik de Bourbon (Condé)', 'Francisco de Melo'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Bataille_de_Rocroi%2C_par_Philippoteaux.jpg/800px-Bataille_de_Rocroi%2C_par_Philippoteaux.jpg',
  },
  {
    id: 'marne-1914', name: 'Pierwsza Bitwa nad Marną', era: 'ww1',
    date: '5–12 września 1914',
    location: { name: 'Marna, Francja', lat: 48.9600, lng: 3.3800 },
    summary: 'Francuzi i Brytyjczycy zatrzymali niemiecką ofensywę — koniec planu Schlieffena i początek wojny pozycyjnej.',
    outcome: 'Zwycięstwo Ententy',
    sides: ['Francja i Wielka Brytania', 'Cesarstwo Niemieckie'],
    commanders: ['Joseph Joffre', 'Helmuth von Moltke mł.'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/BatailleMarneGermans.jpg/800px-BatailleMarneGermans.jpg',
  },
  {
    id: 'normandy-1944', name: 'Lądowanie w Normandii (D-Day)', era: 'ww2',
    date: '6 czerwca 1944',
    location: { name: 'Normandia, Francja', lat: 49.3672, lng: -0.8731 },
    summary: 'Największa operacja desantowa w historii — 156 000 żołnierzy alianckich wylądowało na plażach Normandii, otwierając drugi front w Europie.',
    outcome: 'Zwycięstwo Aliantów',
    sides: ['Alianci (USA, Wielka Brytania, Kanada)', 'Niemcy nazistowskie'],
    commanders: ['Dwight D. Eisenhower', 'Erwin Rommel'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  },
  {
    id: 'berlin-1945', name: 'Bitwa o Berlin', era: 'ww2',
    date: '16 kwietnia – 2 maja 1945',
    location: { name: 'Berlin, Niemcy', lat: 52.5200, lng: 13.4050 },
    summary: 'Ostatnia wielka bitwa w Europie — Armia Czerwona szturmowała Berlin, kończąc III Rzeszę.',
    outcome: 'Zwycięstwo ZSRR, upadek III Rzeszy',
    sides: ['ZSRR', 'Niemcy nazistowskie'],
    commanders: ['Georgi Żukow', 'Helmuth Weidling'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Raising_a_flag_over_the_Reichstag_-_Restoration.jpg/800px-Raising_a_flag_over_the_Reichstag_-_Restoration.jpg',
  },
];

function createGuestUser(): User {
  return {
    id: `guest_${Date.now()}`, name: 'Gość', email: '',
    provider: 'guest',
    isGuest: true,
    unlockedEras: ['medieval', 'ancient'], // ancient is always free
    unlockedBattles: ['grunwald-1410'],
    listenedBattles: [], visitedBattles: [], completedBattles: [],
    completedQuizzes: [],
    unlockedArtifacts: [],
    seenAchievementIds: [],
    activityLog: {},
    totalXP: 0, coins: 50, streak: 0,
    lastActive: new Date().toISOString(),
    hasCompletedFirstBattle: false,
    promoteDismissed: false,
  };
}

function uid() { return Math.random().toString(36).substring(2, 10); }
function todayKey(): string { return new Date().toISOString().slice(0, 10); }

// MOCK_BATTLES z nadpisanymi URL-ami ze statycznego pliku (gdy skrypt już uruchomiony)
const MOCK_BATTLES_WITH_IMAGES = MOCK_BATTLES.map(b => ({
  ...b,
  imageUrl: BATTLE_IMAGE_URLS[b.id] ?? b.imageUrl,
}));

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  battles: MOCK_BATTLES_WITH_IMAGES,
  campaigns: SEED_CAMPAIGNS,        // rozszerzalne — wystarczy dodać do SEED_CAMPAIGNS
  isAuthLoading: false, isAppReady: false, pendingRewards: [],
  pendingUnlocks: [],
  firstLaunchTs: null,

  signInWithGoogle: async ({ id, name, email }) => {
    set({ isAuthLoading: true });
    try {
      // Sprawdź czy użytkownik już istnieje w storage (powracający użytkownik)
      const stored = await AsyncStorage.getItem('battle_echoes_user');
      if (stored) {
        const parsed: User = JSON.parse(stored);
        if (parsed.id === `google_${id}`) {
          // Powracający użytkownik — zaktualizuj tylko dane profilu
          set({ user: { ...parsed, name, email, lastActive: new Date().toISOString() }, isAuthLoading: false });
          await AsyncStorage.setItem('battle_echoes_user', JSON.stringify(get().user));
          return;
        }
      }
      // Nowy użytkownik
      const user: User = {
        id: `google_${id}`,
        name,
        email,
        provider: 'google',
        unlockedEras: ['medieval'],
        unlockedBattles: ['grunwald-1410'],
        listenedBattles: [], visitedBattles: [], completedBattles: [],
        completedQuizzes: [],
        unlockedArtifacts: [],
        seenAchievementIds: [],
        activityLog: {},
        totalXP: 0, coins: 100, streak: 0,
        lastActive: new Date().toISOString(),
      };
      set({ user, isAuthLoading: false });
      await get().saveToStorage();
      get().awardXP(200, 'Pierwsze logowanie');
    } catch {
      set({ isAuthLoading: false });
    }
  },

  signInWithApple: async (profile?: { id: string; name: string; email: string }) => {
    if (!profile) return;
    set({ isAuthLoading: true });
    try {
      const existing = await getUserProgress(profile.id);
      const newUser: User = existing ? {
        ...existing,
        name:     profile.name || existing.name,
        email:    profile.email || existing.email,
        provider: 'apple',
      } : {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        provider: 'apple',
        unlockedEras:      ['medieval'],
        unlockedBattles:   ['grunwald-1410'],
        listenedBattles:   [],
        visitedBattles:    [],
        completedBattles:  [],
        completedQuizzes:  [],
        unlockedArtifacts: [],
        seenAchievementIds:[],
        activityLog:       {},
        totalXP:           0,
        coins:             50,
        streak:            0,
        lastActive:        new Date().toISOString(),
      };
      set({ user: newUser, isAuthLoading: false });
      await get().saveToStorage();
    } catch (e) {
      set({ isAuthLoading: false });
      Alert.alert('Błąd', 'Nie udało się zalogować przez Apple. Spróbuj ponownie.');
    }
  },

  signInAsGuest: () => {
    set({ user: createGuestUser() });
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  signOut: async () => {
    set({ user: null });
    await AsyncStorage.removeItem('battle_echoes_user');
  },

  awardXP: (amount, reason) => {
    const { user } = get();
    if (!user) return [];
    const prevLevel = levelFromXP(user.totalXP).level;
    const newTotal  = user.totalXP + amount;
    const newInfo   = levelFromXP(newTotal);
    const didLevelUp = newInfo.level > prevLevel;
    const events: RewardEvent[] = [{
      id: uid(), type: 'xp', amount,
      label: `+${amount} XP`, icon: '⭐', color: '#fbbf24',
    }];
    if (didLevelUp) {
      const bonus = COIN_REWARDS.level_up;
      events.push({ id: uid(), type: 'level_up', level: newInfo.level,
        label: `Poziom ${newInfo.level}!`, icon: '🏆', color: Colors.gold });
      set(s => ({ user: s.user ? { ...s.user, totalXP: newTotal, coins: s.user.coins + bonus } : null,
        pendingRewards: [...s.pendingRewards, ...events] }));
    } else {
      set(s => ({ user: s.user ? { ...s.user, totalXP: newTotal } : null,
        pendingRewards: [...s.pendingRewards, ...events] }));
    }
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    return events;
  },

  awardCoins: (amount, reason) => {
    const { user } = get();
    if (!user) return [];
    const event: RewardEvent = { id: uid(), type: 'coins', amount,
      label: `+${amount} Dukatów`, icon: '🪙', color: '#D4A017' };
    set(s => ({ user: s.user ? { ...s.user, coins: Math.max(0, s.user.coins + amount) } : null,
      pendingRewards: [...s.pendingRewards, event] }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    return [event];
  },

  unlockArtifact: (artifactId) => {
    set(s => ({
      user: s.user ? {
        ...s.user,
        unlockedArtifacts: s.user.unlockedArtifacts.includes(artifactId)
          ? s.user.unlockedArtifacts
          : [...s.user.unlockedArtifacts, artifactId],
      } : null,
    }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    get().checkAchievements();
  },

  unlockEra: (eraId) => {
    set(s => ({
      user: s.user ? {
        ...s.user,
        unlockedEras: s.user.unlockedEras.includes(eraId as EraId)
          ? s.user.unlockedEras
          : [...s.user.unlockedEras, eraId as EraId],
      } : null,
    }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  // Odblokuj bitwę + wyślij powiadomienie
  unlockBattle: (battleId) => {
    const { user, battles } = get();
    if (!user || user.unlockedBattles.includes(battleId)) return;

    set(s => ({
      user: s.user ? {
        ...s.user,
        unlockedBattles: [...s.user.unlockedBattles, battleId],
      } : null,
    }));

    // Powiadomienie — sprawdza własne ustawienia przed wysłaniem
    const battle = battles.find(b => b.id === battleId);
    if (battle) {
      notificationService.notifyNewBattleUnlocked(battle.name).catch(() => {});
    }

    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  // Odblokuj wszystkie epoki (Pakiet Pełny)
  unlockAllEras: () => {
    const ALL_ERA_IDS: EraId[] = ['ancient', 'medieval', 'early_modern', 'napoleon', 'ww1', 'ww2'];
    set(s => ({
      user: s.user ? { ...s.user, unlockedEras: ALL_ERA_IDS } : null,
    }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  hasAllEras: () => {
    const { user } = get();
    if (!user) return false;
    const ALL_ERA_IDS: EraId[] = ['ancient', 'medieval', 'early_modern', 'napoleon', 'ww1', 'ww2'];
    return ALL_ERA_IDS.every(era => user.unlockedEras.includes(era));
  },

  setEducatorMode: (enabled) => {
    set(s => ({ user: s.user ? { ...s.user, isEducator: enabled } : null }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  markBattleListened: (battleId) => {
    const { user, awardXP, awardCoins } = get();
    if (!user || user.listenedBattles.includes(battleId)) return [];
    const isFirst = user.listenedBattles.length === 0;
    const key = todayKey();
    set(s => ({ user: s.user ? {
      ...s.user,
      listenedBattles: [...s.user.listenedBattles, battleId],
      activityLog: { ...s.user.activityLog, [key]: (s.user.activityLog[key] || 0) + 1 },
      // Mark first battle completed (triggers PromoteToCommanderModal for guests)
      hasCompletedFirstBattle: s.user.hasCompletedFirstBattle || isFirst,
    } : null }));
    const rewards = [
      ...awardXP(isFirst ? XP_REWARDS.first_battle : XP_REWARDS.listen_full, 'Narracja'),
      ...awardCoins(isFirst ? COIN_REWARDS.first_battle : COIN_REWARDS.listen_full, 'Narracja'),
    ];
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    get().checkAchievements();
    // Aktualizuj powiadomienia: weekly recap + level-up
    const updatedUser = get().user;
    if (updatedUser) {
      rescheduleWeeklyRecap(updatedUser).catch(() => {});
      checkLevelUpReminder(updatedUser).catch(() => {});
    }
    return rewards;
  },

  markBattleVisited: (battleId, xpOverride, coinOverride) => {
    const { user, awardXP, awardCoins } = get();
    if (!user || user.visitedBattles.includes(battleId)) return [];
    set(s => ({ user: s.user ? { ...s.user, visitedBattles: [...s.user.visitedBattles, battleId] } : null }));
    const xp    = xpOverride   ?? XP_REWARDS.visit_gps;
    const coins = coinOverride  ?? COIN_REWARDS.visit_gps;
    const rewards = [
      ...awardXP(xp, 'GPS'),
      ...awardCoins(coins, 'GPS'),
    ];
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    get().checkAchievements();
    return rewards;
  },

  markBattleCompleted: (battleId) => {
    const { user, awardXP, awardCoins } = get();
    if (!user || user.completedBattles.includes(battleId)) return [];
    set(s => ({ user: s.user ? { ...s.user, completedBattles: [...s.user.completedBattles, battleId] } : null }));
    const rewards = [
      ...awardXP(XP_REWARDS.listen_all, 'Komplet perspektyw'),
      ...awardCoins(COIN_REWARDS.listen_all, 'Komplet perspektyw'),
    ];
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    get().checkAchievements();
    return rewards;
  },

  markQuizCompleted: (battleId) => {
    const { user } = get();
    // Idempotentne — ignoruj jeśli quiz już był ukończony dla tej bitwy
    if (!user || user.completedQuizzes.includes(battleId)) return;
    set(s => ({
      user: s.user
        ? { ...s.user, completedQuizzes: [...s.user.completedQuizzes, battleId] }
        : null,
    }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    get().checkAchievements();
  },

  checkDailyStreak: () => {
    const { user, awardXP, awardCoins } = get();
    if (!user) return [];
    const today     = new Date().toDateString();
    const lastDate  = new Date(user.lastActive).toDateString();
    if (today === lastDate) return [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const consecutive = new Date(user.lastActive).toDateString() === yesterday.toDateString();
    const newStreak   = consecutive ? user.streak + 1 : 1;
    set(s => ({ user: s.user ? { ...s.user, streak: newStreak, lastActive: new Date().toISOString() } : null }));
    const rewards = [
      ...awardXP(XP_REWARDS.daily_streak * newStreak, `Seria ${newStreak} dni`),
      ...awardCoins(COIN_REWARDS.daily_streak, 'Seria dzienna'),
    ];
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
    get().checkAchievements();
    // Aktualizuj powiadomienia o serii
    rescheduleStreakNotifications(get().user!).catch(() => {});
    return rewards;
  },

  // ── Sprawdź nowo odblokowane osiągnięcia ─────────────────
  checkAchievements: () => {
    const { user, battles } = get();
    if (!user) return;

    const lc  = user.listenedBattles.length;
    const vc  = user.visitedBattles.length;
    const ac  = user.unlockedArtifacts.length;
    const cc  = user.completedBattles.length;
    const qc  = user.completedQuizzes.length;
    const lvl = levelFromXP(user.totalXP).level;
    const totalBattles = battles.length || 10; // fallback gdy bitwy jeszcze się ładują

    const unlocked: string[] = [];
    if (lc >= 1)             unlocked.push('first_listen');
    if (lc >= 5)             unlocked.push('five_listens');
    if (lc >= totalBattles)  unlocked.push('all_listens');
    if (user.streak >= 7)    unlocked.push('streak_7');
    if (vc >= 1)             unlocked.push('first_gps');
    if (vc >= 3)             unlocked.push('three_gps');
    if (vc >= 5)             unlocked.push('five_gps');
    if (vc >= 6)             unlocked.push('all_eras');
    if (ac >= 1)             unlocked.push('first_artifact');
    if (ac >= 5)             unlocked.push('five_artifacts');
    if (ac >= 10)            unlocked.push('ten_artifacts');
    if (cc >= 1)             unlocked.push('all_perspectives');
    if (qc >= 1)             unlocked.push('first_quiz');
    if (qc >= 3)             unlocked.push('three_quizzes');
    if (lvl >= 10)           unlocked.push('level_10');
    if (user.totalXP >= 5000) unlocked.push('xp_5000');

    const seen = user.seenAchievementIds ?? [];
    const newlyUnlocked = unlocked.filter(id => !seen.includes(id));
    if (!newlyUnlocked.length) return;

    // Przyznaj XP za każde nowe osiągnięcie (przed oznaczeniem jako seen)
    for (const id of newlyUnlocked) {
      const xp = ACHIEVEMENT_XP_REWARDS[id] ?? 0;
      if (xp > 0) get().awardXP(xp, `Osiągnięcie: ${id}`);
    }

    // Oznacz jako seen + dodaj do kolejki bannera
    set(s => ({
      user: s.user
        ? { ...s.user, seenAchievementIds: [...(s.user.seenAchievementIds ?? []), ...newlyUnlocked] }
        : null,
      pendingUnlocks: [...s.pendingUnlocks, ...newlyUnlocked],
    }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  dismissAchievementUnlock: () => set(s => ({ pendingUnlocks: s.pendingUnlocks.slice(1) })),

  clearPendingRewards: () => set({ pendingRewards: [] }),
  canAccessBattle: (battleId) => {
    const { user, battles, campaigns } = get();
    if (!user) return false;
    // 1. Bitwa bezpośrednio odblokowana
    if (user.unlockedBattles.includes(battleId)) return true;
    const battle = battles.find(b => b.id === battleId);
    if (!battle) return false;
    // 2. Era darmowa (np. ancient)
    if (ERA_THEMES[battle.era]?.isFree) return true;
    // 3. Era odblokowana przez gracza
    if (user.unlockedEras.includes(battle.era)) return true;
    // 4. Bitwa należy do zakupionej kampanii
    const campaign = findCampaignForBattle(campaigns, battleId);
    if (campaign && (user.ownedCampaigns ?? []).includes(campaign.id)) return true;
    return false;
  },

  getCampaignForBattle: (battleId) => {
    const { campaigns } = get();
    return findCampaignForBattle(campaigns, battleId);
  },

  purchaseCampaign: (campaignId) => {
    const { user, campaigns } = get();
    if (!user) return [];
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return [];

    // Sprawdź czy użytkownik już posiada kampanię
    if ((user.ownedCampaigns ?? []).includes(campaignId)) return [];

    // Sprawdź saldo
    if (user.coins < campaign.price) {
      Alert.alert(
        'Brak dukatów',
        `Potrzebujesz ${campaign.price} 🪙 aby zakupić kampanię "${campaign.name}".\nAktualne saldo: ${user.coins} 🪙`,
        [{ text: 'OK' }],
      );
      return [];
    }

    // Odejmij dukaty + dodaj kampanię do kolekcji
    const events = get().awardCoins(-campaign.price, `Kampania: ${campaign.name}`);
    set(s => ({
      user: s.user ? {
        ...s.user,
        ownedCampaigns: [...(s.user.ownedCampaigns ?? []), campaignId],
      } : null,
    }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));

    return [
      ...events,
      {
        id: `campaign_unlock_${campaignId}`,
        type: 'unlock' as const,
        label: `Odblokowano: ${campaign.name}`,
        icon: '🎖',
        color: campaign.accentColor,
      },
    ];
  },
  getLevelInfo: () => levelFromXP(get().user?.totalXP ?? 0),

  // ── Onboarding / Guest-to-Auth ────────────────────────────
  initFirstLaunch: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY_FIRST_LAUNCH_TS);
      if (stored) {
        set({ firstLaunchTs: Number(stored) });
      } else {
        const now = Date.now();
        await AsyncStorage.setItem(KEY_FIRST_LAUNCH_TS, String(now));
        set({ firstLaunchTs: now });
      }
    } catch {
      set({ firstLaunchTs: Date.now() });
    }
  },

  isRecruitPackActive: () => {
    const { firstLaunchTs } = get();
    if (firstLaunchTs === null) return false;
    return Date.now() - firstLaunchTs < RECRUIT_PACK_DURATION_MS;
  },

  getRecruitPackSecondsLeft: () => {
    const { firstLaunchTs } = get();
    if (firstLaunchTs === null) return 0;
    return Math.max(0, Math.round((firstLaunchTs + RECRUIT_PACK_DURATION_MS - Date.now()) / 1000));
  },

  dismissCommanderPromotion: () => {
    set(s => ({ user: s.user ? { ...s.user, promoteDismissed: true } : null }));
    get().saveToStorage().catch(e => console.warn('[Store] Save failed:', e));
  },

  // Upgrade a guest account to a real account, preserving progress
  promoteGuestToAuth: async ({ id, name, email, provider }) => {
    const { user } = get();
    if (!user) return;
    const promoted: User = {
      ...user,
      id: `${provider}_${id}`,
      name,
      email,
      provider,
      isGuest: false,
      promoteDismissed: true,
    };
    set({ user: promoted });
    await get().saveToStorage();
  },

  loadFromStorage: async () => {
    // ── Wczytaj użytkownika z AsyncStorage ────────────
    try {
      const stored = await AsyncStorage.getItem('battle_echoes_user');
      if (stored) {
        const parsed: User = JSON.parse(stored);
        if (!parsed.unlockedArtifacts)    parsed.unlockedArtifacts = [];
        if (!parsed.activityLog)          parsed.activityLog = {};
        if (!parsed.completedQuizzes)     parsed.completedQuizzes = [];
        if (!parsed.seenAchievementIds)   parsed.seenAchievementIds = [];
        if (!parsed.ownedCampaigns)       parsed.ownedCampaigns = [];       // migracja: nowe pole
        if (parsed.hasCompletedFirstBattle === undefined) parsed.hasCompletedFirstBattle = false;
        if (parsed.promoteDismissed        === undefined) parsed.promoteDismissed = false;
        set({ user: parsed });

        // Synchronizuj z Firestore (cross-device) — pomijaj gości
        if (parsed.provider !== 'guest') {
          const cloud = await getUserProgress(parsed.id).catch(() => null);
          if (cloud && cloud.lastActive > parsed.lastActive) {
            const merged: User = { ...parsed, ...cloud };
            set({ user: merged });
            await AsyncStorage.setItem('battle_echoes_user', JSON.stringify(merged));
          }
        }
      }
    } catch {}

    // ── Wczytaj bitwy z Firestore / cache ─────────────
    try {
      const battles = await getBattles();
      if (battles.length > 0) {
        // Aplikuj statyczne URL-e z BattleImageUrls.ts (wygenerowane przez skrypt)
        const withImages = battles.map(b => ({
          ...b,
          imageUrl: BATTLE_IMAGE_URLS[b.id] ?? b.imageUrl,
        }));
        set({ battles: withImages });
      }
    } catch {}

    set({ isAppReady: true });
    // Synchronizuj osiągnięcia po załadowaniu danych — m.in. nadaje brakujące XP
    // starym kontom, które nie miały jeszcze systemu osiągnięć (krok 10).
    get().checkAchievements();
  },

  saveToStorage: async () => {
    try {
      const { user } = get();
      if (user) {
        await AsyncStorage.setItem('battle_echoes_user', JSON.stringify(user));
        // Synchronizuj z Firestore (fire-and-forget — nie blokuje UI)
        if (user.provider !== 'guest') {
          saveUserProgress(user.id, user).catch(() => {});
          updateLeaderboardEntry(user).catch(() => {});
        }
      }
    } catch {}
  },
}));
