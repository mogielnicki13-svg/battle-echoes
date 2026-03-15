// ============================================================
// BATTLE ECHOES — SmokeBackground.tsx
// Animowany dym z iskrami — efekt tła dla kart
// Pure React Native Animated — zero zewnętrznych bibliotek
// ============================================================
// UŻYCIE:
//   <SmokeBackground />                    ← pełne tło ekranu
//   <SmokeBackground card />               ← subtelne tło karty
//   <SmokeBackground color="#C9A84C" />    ← złoty dym
// ============================================================

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { BaseColors } from '../constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Typy ─────────────────────────────────────────────────────
interface SmokeBackgroundProps {
  card?:         boolean;    // tryb karty (mniej cząsteczek, mniejszy obszar)
  color?:        string;     // kolor dymu (domyślnie złoty)
  sparkColor?:   string;     // kolor iskier
  intensity?:    number;     // 0.0-1.0 intensywność (domyślnie 0.5)
  width?:        number;
  height?:       number;
  children?:     React.ReactNode;
}

// ── Generator losowych wartości ───────────────────────────────
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ── Pojedyncza cząsteczka dymu ────────────────────────────────
interface SmokeParticle {
  id:        number;
  x:         number;
  size:      number;
  duration:  number;
  delay:     number;
  drift:     number;    // horyzontalne dryfowanie
  opacity:   number;    // max opacity
}

// ── Pojedyncza iskra ─────────────────────────────────────────
interface SparkParticle {
  id:       number;
  x:        number;
  size:     number;
  duration: number;
  delay:    number;
  drift:    number;
}

function SmokeParticleView({
  particle,
  color,
  containerHeight,
}: {
  particle: SmokeParticle;
  color: string;
  containerHeight: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      // Reset
      translateY.setValue(0);
      translateX.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.3);

      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          // Unoszenie w górę
          Animated.timing(translateY, {
            toValue:  -containerHeight * 0.85,
            duration: particle.duration,
            useNativeDriver: true,
          }),
          // Dryfowanie w bok
          Animated.timing(translateX, {
            toValue:  particle.drift,
            duration: particle.duration,
            useNativeDriver: true,
          }),
          // Opacity — pojawia się, zanika
          Animated.sequence([
            Animated.timing(opacity, {
              toValue:  particle.opacity,
              duration: particle.duration * 0.25,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue:  particle.opacity * 0.7,
              duration: particle.duration * 0.45,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue:  0,
              duration: particle.duration * 0.30,
              useNativeDriver: true,
            }),
          ]),
          // Rośnie w miarę unoszenia
          Animated.timing(scale, {
            toValue:  1.8,
            duration: particle.duration,
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished) animate();
      });
    };

    animate();
    return () => {
      translateY.stopAnimation();
      translateX.stopAnimation();
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -particle.size / 2,
        left:   particle.x - particle.size / 2,
        width:  particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: color,
        transform: [
          { translateY },
          { translateX },
          { scale },
        ],
        opacity,
      }}
    />
  );
}

function SparkView({
  spark,
  color,
  containerHeight,
}: {
  spark: SparkParticle;
  color: string;
  containerHeight: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      translateX.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(spark.delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue:  -containerHeight * rand(0.3, 0.7),
            duration: spark.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(translateX, {
              toValue:  spark.drift,
              duration: spark.duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue:  spark.drift * 0.5,
              duration: spark.duration * 0.4,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue:  0.9,
              duration: spark.duration * 0.1,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue:  0.7,
              duration: spark.duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue:  0,
              duration: spark.duration * 0.3,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(({ finished }) => {
        if (finished) animate();
      });
    };

    animate();
    return () => {
      translateY.stopAnimation();
      translateX.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: rand(0, 20),
        left:   spark.x,
        width:  spark.size,
        height: spark.size,
        borderRadius: spark.size / 2,
        backgroundColor: color,
        transform: [{ translateY }, { translateX }],
        opacity,
        // Efekt świecenia iskry
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: spark.size,
        elevation: 4,
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ════════════════════════════════════════════════════════════
export default function SmokeBackground({
  card        = false,
  color       = 'rgba(201,168,76,0.06)',
  sparkColor  = '#C9A84C',
  intensity   = 0.5,
  width,
  height,
  children,
}: SmokeBackgroundProps) {

  const containerW = width  || (card ? SW - 32 : SW);
  const containerH = height || (card ? 160 : SH);

  const smokeCount = card
    ? Math.floor(6  * intensity)
    : Math.floor(14 * intensity);

  const sparkCount = card
    ? Math.floor(4  * intensity)
    : Math.floor(10 * intensity);

  // Generuj cząsteczki tylko raz
  const smokeParticles = useMemo<SmokeParticle[]>(() =>
    Array.from({ length: smokeCount }, (_, i) => ({
      id:       i,
      x:        rand(0, containerW),
      size:     card ? rand(50, 120) : rand(80, 180),
      duration: card ? rand(5000, 10000) : rand(8000, 14000),
      delay:    rand(0, 3000),
      drift:    rand(-40, 40),
      opacity:  card ? rand(0.12, 0.22) : rand(0.15, 0.28),
    })), []
  );

  const sparkParticles = useMemo<SparkParticle[]>(() =>
    Array.from({ length: sparkCount }, (_, i) => ({
      id:       i,
      x:        rand(containerW * 0.1, containerW * 0.9),
      size:     rand(1.5, 4),
      duration: rand(2000, 5000),
      delay:    rand(0, 4000),
      drift:    rand(-30, 30),
    })), []
  );

  return (
    <View style={[styles.container, { width: containerW, height: containerH }]}>
      {/* Dym */}
      {smokeParticles.map(p => (
        <SmokeParticleView
          key={`smoke-${p.id}`}
          particle={p}
          color={color}
          containerHeight={containerH}
        />
      ))}

      {/* Iskry */}
      {sparkParticles.map(s => (
        <SparkView
          key={`spark-${s.id}`}
          spark={s}
          color={sparkColor}
          containerHeight={containerH}
        />
      ))}

      {/* Gradient u dołu — koncentracja dymu przy ziemi */}
      <View style={[styles.groundGlow, { backgroundColor: color }]} />

      {children}
    </View>
  );
}

// ── Wersja pełnoekranowa (absolute fill) ────────────────────
export function SmokeBackgroundFull({
  color      = 'rgba(201,168,76,0.05)',
  sparkColor = '#C9A84C',
  intensity  = 0.4,
}: Pick<SmokeBackgroundProps, 'color' | 'sparkColor' | 'intensity'>) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <SmokeBackground
        color={color}
        sparkColor={sparkColor}
        intensity={intensity}
        width={SW}
        height={SH}
      />
    </View>
  );
}

// ── Wersja dla kart ─────────────────────────────────────────
export function SmokeBackgroundCard({
  color      = 'rgba(201,168,76,0.06)',
  sparkColor = '#C9A84C',
  intensity  = 0.6,
  style,
}: Pick<SmokeBackgroundProps, 'color' | 'sparkColor' | 'intensity'> & { style?: any }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: 16 }, style]} pointerEvents="none">
      <SmokeBackground card color={color} sparkColor={sparkColor} intensity={intensity} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  groundGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    opacity: 0.6,
  },
});
