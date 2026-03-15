// ============================================================
// BATTLE ECHOES — OnboardingScreen.tsx
// 5 slajdów z animacjami — pierwsze uruchomienie
// ============================================================
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView, Platform,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoldIcon, { Icon, EraIcon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

const { width: SW, height: SH } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════
// DANE SLAJDÓW
// ════════════════════════════════════════════════════════════
const SLIDES = [
  {
    id: 1,
    icon: 'map',
    titleKey: 'onboarding.slide1_title',
    subtitleKey: 'onboarding.slide1_subtitle',
    accent: '#D4A017',
    bg: 'rgba(212,160,23,0.06)',
    floatingIcons: ['sword', 'castle', 'sword', 'shield', 'shield'],
  },
  {
    id: 2,
    icon: 'microphone',
    titleKey: 'onboarding.slide2_title',
    subtitleKey: 'onboarding.slide2_subtitle',
    accent: '#60a5fa',
    bg: 'rgba(96,165,250,0.06)',
    floatingIcons: ['microphone', 'radio-tower', 'headphones', 'volume-high', 'microphone'],
  },
  {
    id: 3,
    icon: 'pot-mix',
    titleKey: 'onboarding.slide3_title',
    subtitleKey: 'onboarding.slide3_subtitle',
    accent: '#c084fc',
    bg: 'rgba(192,132,252,0.06)',
    floatingIcons: ['pot-mix', 'scroll-text', 'sword', 'bitcoin', 'crown'],
  },
  {
    id: 4,
    icon: 'map-marker',
    titleKey: 'onboarding.slide4_title',
    subtitleKey: 'onboarding.slide4_subtitle',
    accent: '#4ade80',
    bg: 'rgba(74,222,128,0.06)',
    floatingIcons: ['map-marker', 'map', 'compass-rose', 'map-marker', 'map'],
  },
  {
    id: 5,
    icon: 'fire',
    titleKey: 'onboarding.slide5_title',
    subtitleKey: 'onboarding.slide5_subtitle',
    accent: '#f97316',
    bg: 'rgba(249,115,22,0.06)',
    floatingIcons: ['fire', 'star', 'trophy', 'medal', 'crown'],
  },
];

// ════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ════════════════════════════════════════════════════════════
interface Props {
  onFinish: () => void;
}

export default function OnboardingScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Animacje globalne
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideUp     = useRef(new Animated.Value(30)).current;

  // Animacje per-slajd
  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconRotate  = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide  = useRef(new Animated.Value(20)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const visualAnim  = useRef(SLIDES[0].floatingIcons.map(() => new Animated.Value(0))).current;

  // Intro animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, tension: 60 }),
    ]).start();
    animateSlide(0);
  }, []);

  const animateSlide = (idx: number) => {
    // Reset
    iconScale.setValue(0);
    iconRotate.setValue(-15);
    titleOpacity.setValue(0);
    titleSlide.setValue(24);
    subOpacity.setValue(0);
    visualAnim.forEach(a => a.setValue(0));

    // Animate in
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1, useNativeDriver: true,
        tension: 80, friction: 8,
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, useNativeDriver: true, tension: 100 }),
      ]),
      Animated.timing(subOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Visual icons — staggered
    SLIDES[idx].floatingIcons.forEach((_, i) => {
      Animated.sequence([
        Animated.delay(200 + i * 80),
        Animated.spring(visualAnim[i], {
          toValue: 1, useNativeDriver: true,
          tension: 120, friction: 8,
        }),
      ]).start();
    });

    // Icon rotation spring
    Animated.spring(iconRotate, {
      toValue: 0, useNativeDriver: true, tension: 60, friction: 10,
    }).start();
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= SLIDES.length) return;
    scrollRef.current?.scrollTo({ x: idx * SW, animated: true });
    setCurrent(idx);
    animateSlide(idx);
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('battle_echoes_onboarding_done', '1');
    onFinish();
  };

  const slide = SLIDES[current];
  const iconRotateDeg = iconRotate.interpolate({
    inputRange: [-15, 0], outputRange: ['-15deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

      {/* ── Tło accent ─────────────────────────────── */}
      <View style={[styles.accentBg, { backgroundColor: slide.bg }]} />

      {/* ── Skip ───────────────────────────────────── */}
      {current < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* ── Slajdy (horizontal scroll) ─────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.slider}
      >
        {SLIDES.map((s, idx) => (
          <View key={s.id} style={styles.slide}>
            {/* Ikona główna */}
            <Animated.View style={[
              styles.mainIconContainer,
              {
                transform: [
                  { scale: idx === current ? iconScale : new Animated.Value(1) },
                  { rotate: idx === current ? iconRotateDeg : '0deg' },
                ],
              },
            ]}>
              <GoldIcon name={s.icon} size={40} color="#C9A84C" />
            </Animated.View>

            {/* Floating visual icons */}
            <View style={styles.visualRow}>
              {s.floatingIcons.map((iconName, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.visualIcon,
                    {
                      opacity: idx === current ? visualAnim[i] : new Animated.Value(1),
                      transform: [{
                        scale: idx === current
                          ? visualAnim[i].interpolate({ inputRange: [0,1], outputRange: [0.3, 1] })
                          : new Animated.Value(1),
                      }],
                    },
                  ]}
                >
                  <GoldIcon name={iconName} size={32} color="rgba(201,168,76,0.3)" />
                </Animated.View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Treść slajdu ──────────────────────────── */}
      <Animated.View style={[styles.content, { transform: [{ translateY: slideUp }] }]}>

        {/* Tytuł */}
        <Animated.Text style={[
          styles.title,
          { color: slide.accent },
          { opacity: titleOpacity, transform: [{ translateY: titleSlide }] },
        ]}>
          {t(slide.titleKey)}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subOpacity }]}>
          {t(slide.subtitleKey)}
        </Animated.Text>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <Animated.View style={[
                styles.dot,
                i === current
                  ? [styles.dotActive, { backgroundColor: slide.accent }]
                  : styles.dotInactive,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Przycisk dalej / start */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.accent }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.nextBtnText}>
              {current < SLIDES.length - 1 ? t('onboarding.next') : t('onboarding.start')}
            </Text>
            {current < SLIDES.length - 1 && (
              <Icon id="chevron_right" size={15} color="#000" />
            )}
          </View>
        </TouchableOpacity>

        {/* Numer slajdu */}
        <Text style={styles.pageNum}>{current + 1} / {SLIDES.length}</Text>
      </Animated.View>

    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLE
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  accentBg: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: SH * 0.6,
  },

  skipBtn: {
    position: 'absolute', top: 52, right: 20, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  skipText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },

  slider: { flex: 1 },
  slide:  {
    width: SW, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingTop: SH * 0.08,
  },

  mainIconContainer: {
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20,
  },

  visualRow: {
    flexDirection: 'row', gap: 12,
    marginTop: 8,
  },
  visualIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    gap: 16, alignItems: 'center',
  },

  title: {
    fontSize: 30, fontWeight: '800',
    textAlign: 'center', lineHeight: 36,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 15, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
    maxWidth: SW * 0.82,
  },

  dots: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  dot:        { borderRadius: 4 },
  dotActive:  { width: 24, height: 8 },
  dotInactive:{ width: 8,  height: 8, backgroundColor: 'rgba(255,255,255,0.2)' },

  nextBtn: {
    width: SW - 56, paddingVertical: 16,
    borderRadius: 16, alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  nextBtnText: {
    fontSize: 17, color: Colors.ink, fontWeight: '800', letterSpacing: 0.3,
  },

  pageNum: { fontSize: 11, color: Colors.textMuted },
});
