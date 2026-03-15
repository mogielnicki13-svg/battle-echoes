// ============================================================
// BATTLE ECHOES — SessionService.ts
// Classroom Session Management (Kahoot-style)
//
// Architecture:
//   Teacher (Host) → writes state → Firestore
//   Students       → onSnapshot  → react to state changes
//
// Firestore collections:
//   classroom_sessions/{sessionId}          — session state
//   classroom_sessions/{id}/participants/{uid} — student data
//   pin_index/{pin}                         — fast PIN lookup
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ──────────────────────────────────────────────────
export type SessionState =
  | 'lobby'
  | 'narrating'
  | 'paused'
  | 'quiz'
  | 'results'
  | 'ended';

export interface QuizState {
  active:             boolean;
  questionIndex:      number;
  showAnswer:         boolean;
  questionStartedAt:  number;  // unix ms timestamp
}

export interface ClassroomSession {
  id:               string;
  pin:              string;
  hostId:           string;
  hostName:         string;
  battleId:         string;
  battleName:       string;
  state:            SessionState;
  currentScene:     number;
  isPlaying:        boolean;
  perspective:      string;
  quizState:        QuizState;
  participantCount: number;
  createdAt:        number;
  expiresAt:        number;   // session auto-expires after 4h
}

export interface Participant {
  userId:      string;
  name:        string;
  avatar:      string;
  joinedAt:    number;
  score:       number;
  isActive:    boolean;
  quizAnswers: Record<string, {
    answer:   number;
    correct:  boolean;
    timeMs:   number;
    points:   number;
  }>;
}

// ── Scoring ───────────────────────────────────────────────
export const BASE_CORRECT_POINTS = 1000;
export const MAX_SPEED_BONUS     = 500;
export const QUESTION_TIME_MS    = 20_000; // 20 seconds per question

export function calcAnswerPoints(correct: boolean, timeMs: number): number {
  if (!correct) return 0;
  const speedFactor = Math.max(0, 1 - timeMs / QUESTION_TIME_MS);
  return Math.round(BASE_CORRECT_POINTS + MAX_SPEED_BONUS * speedFactor);
}

// ── Firebase lazy init (mirrors FirebaseService.ts pattern) ─
let _db: any = null;

function getDb(): any | null {
  if (_db) return _db;
  try {
    const fb  = require('firebase/app');
    const ffs = require('firebase/firestore');
    const app = fb.getApps().length ? fb.getApps()[0] : null;
    if (!app) return null;
    _db = ffs.getFirestore(app);
    return _db;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────
function genPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function genSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function now(): number {
  return Date.now();
}

function sessionRef(db: any, sessionId: string) {
  const { doc, collection } = require('firebase/firestore');
  return doc(db, 'classroom_sessions', sessionId);
}

function participantsRef(db: any, sessionId: string) {
  const { collection } = require('firebase/firestore');
  return collection(db, 'classroom_sessions', sessionId, 'participants');
}

function participantRef(db: any, sessionId: string, userId: string) {
  const { doc } = require('firebase/firestore');
  return doc(db, 'classroom_sessions', sessionId, 'participants', userId);
}

function pinRef(db: any, pin: string) {
  const { doc } = require('firebase/firestore');
  return doc(db, 'pin_index', pin);
}

// ══════════════════════════════════════════════════════════
// HOST OPERATIONS (teacher)
// ══════════════════════════════════════════════════════════

/**
 * Create a new classroom session. Returns { sessionId, pin }.
 */
export async function createSession(opts: {
  hostId:      string;
  hostName:    string;
  battleId:    string;
  battleName:  string;
}): Promise<{ sessionId: string; pin: string }> {
  const db = getDb();
  if (!db) {
    // Offline-safe: generate local-only session
    const sessionId = genSessionId();
    const pin       = genPin();
    await AsyncStorage.setItem('be_local_session', JSON.stringify({ sessionId, pin, ...opts }));
    return { sessionId, pin };
  }

  const { setDoc, Timestamp } = require('firebase/firestore');

  const sessionId = genSessionId();
  const pin       = genPin();
  const fourHours = 4 * 60 * 60 * 1000;

  const session: Omit<ClassroomSession, 'id'> = {
    pin,
    hostId:     opts.hostId,
    hostName:   opts.hostName,
    battleId:   opts.battleId,
    battleName: opts.battleName,
    state:      'lobby',
    currentScene:     0,
    isPlaying:        false,
    perspective:      'narrator',
    quizState: {
      active:            false,
      questionIndex:     0,
      showAnswer:        false,
      questionStartedAt: 0,
    },
    participantCount: 0,
    createdAt:  now(),
    expiresAt:  now() + fourHours,
  };

  // Write session document
  await setDoc(sessionRef(db, sessionId), session);

  // Write PIN index for fast lookup
  await setDoc(pinRef(db, pin), {
    sessionId,
    hostId:    opts.hostId,
    battleId:  opts.battleId,
    expiresAt: now() + fourHours,
  });

  return { sessionId, pin };
}

/** Update session state (host only). */
export async function updateSessionState(
  sessionId: string,
  updates: Partial<Omit<ClassroomSession, 'id' | 'pin' | 'hostId' | 'createdAt'>>
): Promise<void> {
  const db = getDb();
  if (!db) return;
  const { updateDoc } = require('firebase/firestore');
  await updateDoc(sessionRef(db, sessionId), updates);
}

/** Transition the session to narrating state. */
export async function startNarration(sessionId: string, perspective = 'narrator'): Promise<void> {
  await updateSessionState(sessionId, {
    state: 'narrating', isPlaying: true, perspective,
  });
}

/** Pause/resume audio from host side. */
export async function setPlayingState(sessionId: string, isPlaying: boolean): Promise<void> {
  await updateSessionState(sessionId, { isPlaying });
}

/** Move to a different scene index. */
export async function setCurrentScene(sessionId: string, scene: number): Promise<void> {
  await updateSessionState(sessionId, { currentScene: scene });
}

/** Start the quiz phase. */
export async function startQuiz(sessionId: string): Promise<void> {
  await updateSessionState(sessionId, {
    state: 'quiz',
    isPlaying: false,
    quizState: {
      active:            true,
      questionIndex:     0,
      showAnswer:        false,
      questionStartedAt: now(),
    },
  });
}

/** Advance quiz to the next question (or show answer for current). */
export async function advanceQuiz(
  sessionId: string,
  questionIndex: number,
  showAnswer: boolean
): Promise<void> {
  await updateSessionState(sessionId, {
    quizState: {
      active:            true,
      questionIndex,
      showAnswer,
      questionStartedAt: showAnswer ? 0 : now(),
    },
  });
}

/** Move to results screen. */
export async function showResults(sessionId: string): Promise<void> {
  await updateSessionState(sessionId, {
    state: 'results',
    quizState: {
      active: false, questionIndex: 0, showAnswer: false, questionStartedAt: 0,
    },
  });
}

/** End and close the session. */
export async function endSession(sessionId: string, pin: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const { updateDoc, deleteDoc } = require('firebase/firestore');
  await updateDoc(sessionRef(db, sessionId), { state: 'ended' });
  // Clean up PIN index
  try { await deleteDoc(pinRef(db, pin)); } catch {}
}

// ══════════════════════════════════════════════════════════
// STUDENT OPERATIONS
// ══════════════════════════════════════════════════════════

/**
 * Look up session by 6-digit PIN.
 * Returns the session doc if found and not expired, else null.
 */
export async function lookupPin(pin: string): Promise<{
  sessionId: string; battleId: string; battleName: string; hostName: string;
} | null> {
  const db = getDb();
  if (!db) return null;

  const { getDoc } = require('firebase/firestore');

  try {
    const pinSnap = await getDoc(pinRef(db, pin));
    if (!pinSnap.exists()) return null;

    const pinData = pinSnap.data();
    if (pinData.expiresAt < now()) return null;

    // Fetch session to get battleName
    const sessSnap = await getDoc(sessionRef(db, pinData.sessionId));
    if (!sessSnap.exists()) return null;

    const sess = sessSnap.data() as ClassroomSession;
    if (sess.state === 'ended') return null;

    return {
      sessionId:   pinData.sessionId,
      battleId:    pinData.battleId,
      battleName:  sess.battleName,
      hostName:    sess.hostName,
    };
  } catch {
    return null;
  }
}

/**
 * Join a session as a student participant.
 */
export async function joinSession(opts: {
  sessionId: string;
  userId:    string;
  name:      string;
  avatar:    string;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { setDoc, updateDoc, increment } = require('firebase/firestore');

  const participant: Participant = {
    userId:      opts.userId,
    name:        opts.name,
    avatar:      opts.avatar,
    joinedAt:    now(),
    score:       0,
    isActive:    true,
    quizAnswers: {},
  };

  await setDoc(participantRef(db, opts.sessionId, opts.userId), participant);
  // Increment count in session doc
  try {
    await updateDoc(sessionRef(db, opts.sessionId), {
      participantCount: increment(1),
    });
  } catch {}
}

/**
 * Submit a quiz answer as a student.
 */
export async function submitAnswer(opts: {
  sessionId:     string;
  userId:        string;
  questionIndex: number;
  answer:        number;
  correct:       boolean;
  timeMs:        number;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { updateDoc } = require('firebase/firestore');

  const points = calcAnswerPoints(opts.correct, opts.timeMs);
  const answerKey = `quizAnswers.${opts.questionIndex}`;

  await updateDoc(participantRef(db, opts.sessionId, opts.userId), {
    [answerKey]: {
      answer:  opts.answer,
      correct: opts.correct,
      timeMs:  opts.timeMs,
      points,
    },
    score: require('firebase/firestore').increment(points),
  });
}

/**
 * Mark a participant as disconnected.
 */
export async function leaveSession(sessionId: string, userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const { updateDoc } = require('firebase/firestore');
  try {
    await updateDoc(participantRef(db, sessionId, userId), { isActive: false });
  } catch {}
}

// ══════════════════════════════════════════════════════════
// REAL-TIME LISTENERS
// ══════════════════════════════════════════════════════════

/**
 * Subscribe to session state changes.
 * Returns an unsubscribe function.
 */
export function listenToSession(
  sessionId: string,
  callback:  (session: ClassroomSession | null) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};

  const { onSnapshot } = require('firebase/firestore');

  return onSnapshot(
    sessionRef(db, sessionId),
    (snap: any) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() } as ClassroomSession);
    },
    () => callback(null)
  );
}

/**
 * Subscribe to participants list changes.
 * Returns an unsubscribe function.
 */
export function listenToParticipants(
  sessionId: string,
  callback:  (participants: Participant[]) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};

  const { onSnapshot, query, orderBy } = require('firebase/firestore');

  const q = query(participantsRef(db, sessionId), orderBy('score', 'desc'));

  return onSnapshot(
    q,
    (snap: any) => {
      const participants: Participant[] = snap.docs.map((d: any) => d.data() as Participant);
      callback(participants);
    },
    () => callback([])
  );
}

/** Fetch session once (no real-time). */
export async function fetchSession(sessionId: string): Promise<ClassroomSession | null> {
  const db = getDb();
  if (!db) return null;
  const { getDoc } = require('firebase/firestore');
  try {
    const snap = await getDoc(sessionRef(db, sessionId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ClassroomSession;
  } catch {
    return null;
  }
}

// ── AVATAR pool ────────────────────────────────────────────
export const STUDENT_AVATARS = ['⚔', '🛡', '🏹', '🪖', '🎖', '🔱', '⚡', '🏛', '📜', '🦅'];

export function randomAvatar(): string {
  return STUDENT_AVATARS[Math.floor(Math.random() * STUDENT_AVATARS.length)];
}
