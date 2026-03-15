// ============================================================
// BATTLE ECHOES — KaraokeReader.tsx
//
// Renders a list of narration sentences with real-time
// karaoke-style highlighting as audio plays.
//
// Features:
//   • Active sentence highlighted in era primary color
//   • Past sentences dimmed
//   • Future sentences in default text color
//   • Auto-scroll to keep active sentence centered on screen
//   • Animated background on the active sentence
//   • Tappable sentences (optional) — lets user seek to sentence
//
// Usage:
//   <KaraokeReader
//     sentences={sentences}
//     activeSentenceIdx={sentenceIdx}
//     accentColor={theme.primary}
//     scrollRef={scrollRef}
//     onSentenceLayout={(idx, y) => { sentenceYs.current[idx] = y; }}
//     onSentenceTap={idx => seekToSentence(idx)}   // optional
//   />
// ============================================================

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, ScrollView,
  TouchableWithoutFeedback, ViewStyle,
} from 'react-native';
import { Colors } from '../constants/theme';

// ── Types ──────────────────────────────────────────────────
export interface KaraokeReaderProps {
  sentences:         string[];
  activeSentenceIdx: number;
  accentColor:       string;
  scrollRef:         React.RefObject<ScrollView | null>;
  /** Called with (index, yOffset) — store for auto-scroll */
  onSentenceLayout:  (idx: number, y: number) => void;
  /** Optional: tap a sentence to seek there */
  onSentenceTap?:    (idx: number) => void;
  style?:            ViewStyle;
  /** Override text color for unplayed sentences (default: Colors.textSecondary) */
  normalColor?:      string;
  /** Override text color for already-played sentences (default: Colors.textMuted) */
  pastColor?:        string;
  /** Font size for all sentences (default: 17) */
  fontSize?:         number;
  /** Playing state — when false, all sentences use normalColor */
  isPlaying?:        boolean;
}

// ── Helpers ────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Single Sentence Row ────────────────────────────────────
interface SentenceRowProps {
  text:        string;
  idx:         number;
  isActive:    boolean;
  isPast:      boolean;
  accentColor: string;
  normalColor: string;
  pastColor:   string;
  fontSize:    number;
  onLayout:    (idx: number, y: number) => void;
  onPress?:    (idx: number) => void;
}

function SentenceRow({
  text, idx, isActive, isPast, accentColor,
  normalColor, pastColor, fontSize, onLayout, onPress,
}: SentenceRowProps) {
  // Highlight animation for the active sentence
  const bgAnim  = useRef(new Animated.Value(0)).current;
  const sclAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(bgAnim, {
          toValue: 1, duration: 250, useNativeDriver: false,
        }),
        Animated.spring(sclAnim, {
          toValue: 1.01, tension: 120, friction: 8, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgAnim, {
          toValue: 0, duration: 180, useNativeDriver: false,
        }),
        Animated.spring(sclAnim, {
          toValue: 1, tension: 120, friction: 8, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const backgroundColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(0,0,0,0)', hexToRgba(accentColor, 0.12)],
  });

  const textColor = isActive
    ? accentColor
    : isPast
      ? pastColor
      : normalColor;

  const fontWeight: '400' | '600' | '800' = isActive ? '600' : '400';

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { y: number } } }) => {
      onLayout(idx, e.nativeEvent.layout.y);
    },
    [idx, onLayout],
  );

  const inner = (
    <Animated.View
      style={[
        s.sentenceWrap,
        { backgroundColor, transform: [{ scale: sclAnim }] },
        isActive && s.activeBorder,
        isActive && { borderLeftColor: accentColor },
      ]}
      onLayout={handleLayout}
    >
      {/* Active indicator dot */}
      {isActive && (
        <View style={[s.dot, { backgroundColor: accentColor }]} />
      )}
      <Text style={[s.sentence, { color: textColor, fontWeight, fontSize, lineHeight: fontSize * 1.62 }]}>
        {text}
      </Text>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableWithoutFeedback onPress={() => onPress(idx)}>
        {inner}
      </TouchableWithoutFeedback>
    );
  }

  return inner;
}

// ════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════
export default function KaraokeReader({
  sentences,
  activeSentenceIdx,
  accentColor,
  scrollRef,
  onSentenceLayout,
  onSentenceTap,
  style,
  normalColor = Colors.textSecondary,
  pastColor   = Colors.textMuted,
  fontSize    = 17,
  isPlaying   = false,
}: KaraokeReaderProps) {
  // Auto-scroll to keep the active sentence visible
  const sentenceYs = useRef<number[]>([]);

  const handleLayout = useCallback((idx: number, y: number) => {
    sentenceYs.current[idx] = y;
    onSentenceLayout(idx, y);
  }, [onSentenceLayout]);

  useEffect(() => {
    const y = sentenceYs.current[activeSentenceIdx];
    if (y !== undefined && scrollRef?.current) {
      (scrollRef.current as ScrollView).scrollTo({ y: Math.max(0, y - 120), animated: true });
    }
  }, [activeSentenceIdx]);

  return (
    <View style={[s.container, style]}>
      {sentences.map((text, idx) => (
        <SentenceRow
          key={idx}
          text={text}
          idx={idx}
          isActive={isPlaying && idx === activeSentenceIdx}
          isPast={isPlaying && idx < activeSentenceIdx}
          accentColor={accentColor}
          normalColor={normalColor}
          pastColor={pastColor}
          fontSize={fontSize}
          onLayout={handleLayout}
          onPress={onSentenceTap}
        />
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    gap: 2,
    paddingVertical: 8,
  },
  sentenceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 16,
    gap: 10,
    // Active border will be applied inline
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  activeBorder: {
    borderLeftWidth: 3,
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  sentence: {
    flex: 1,
    fontSize: 17,
    lineHeight: 27,
    letterSpacing: 0.1,
  },
});
