import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Animated, Easing } from 'react-native';
import Svg, { Rect, Circle, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const GROUND_Y = H * 0.68;

// ─── Timeline (ms) ─────────────────────────────────────────
// 0-800: Sky is bright day, sun visible, ground appears
// 200-1200: Buildings rise with stagger
// 800-1000: Trees pop in
// 1000-1300: People slide in, start cleaning
// 1500-3000: Sky transitions from day to sunset to night
// 2200-2600: Sun sets, moon rises, stars appear
// 2600-3200: Windows light up warm, sparkles
// 3200-3800: Logo fades in center
// 4200: Fade out to app

const BUILDINGS = [
  { x: W * 0.00, w: W * 0.17, h: H * 0.24, color: '#B0BEC5', colorNight: '#37474F', delay: 200, windows: 4 },
  { x: W * 0.19, w: W * 0.20, h: H * 0.36, color: '#90A4AE', colorNight: '#263238', delay: 350, windows: 6 },
  { x: W * 0.41, w: W * 0.16, h: H * 0.20, color: '#B0BEC5', colorNight: '#455A64', delay: 500, windows: 3 },
  { x: W * 0.59, w: W * 0.21, h: H * 0.32, color: '#78909C', colorNight: '#1B3A4B', delay: 300, windows: 5 },
  { x: W * 0.82, w: W * 0.18, h: H * 0.28, color: '#90A4AE', colorNight: '#37474F', delay: 450, windows: 4 },
];

interface AnimatedSplashProps {
  onFinish: () => void;
}

// ─── Helpers ────────────────────────────────────────────────
function delayedSpring(anim: Animated.Value, toValue: number, delay: number, config?: Partial<Animated.SpringAnimationConfig>) {
  return Animated.sequence([
    Animated.delay(delay),
    Animated.spring(anim, { toValue, damping: 12, stiffness: 80, useNativeDriver: false, ...config }),
  ]);
}

function delayedTiming(anim: Animated.Value, toValue: number, delay: number, duration: number, easing?: (v: number) => number) {
  return Animated.sequence([
    Animated.delay(delay),
    Animated.timing(anim, { toValue, duration, easing, useNativeDriver: false }),
  ]);
}

function loopPulse(anim: Animated.Value, delay: number, duration = 500) {
  Animated.sequence([
    Animated.delay(delay),
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ),
  ]).start();
}

// ─── Animated Sky ───────────────────────────────────────────
function AnimatedSky({ dayToNight }: { dayToNight: Animated.Value }) {
  // Day sky: light blue → Night sky: dark blue/indigo
  const skyColor = dayToNight.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: ['#87CEEB', '#F4A460', '#2C3E6B', '#0F1B3D'],
  });

  // Horizon glow color for sunset
  const horizonColor = dayToNight.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 1],
    outputRange: ['#B3E5FC', '#FF8C42', '#E8587A', '#1A2540', '#0A1128'],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: skyColor }]} />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: H - GROUND_Y - 20,
          left: 0,
          right: 0,
          height: H * 0.15,
          backgroundColor: horizonColor,
          opacity: dayToNight.interpolate({
            inputRange: [0, 0.2, 0.5, 0.8, 1],
            outputRange: [0.2, 0.6, 0.8, 0.4, 0.1],
          }),
        }}
      />
    </View>
  );
}

// ─── Sun ────────────────────────────────────────────────────
function AnimatedSun({ dayToNight }: { dayToNight: Animated.Value }) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: dayToNight.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [H * 0.12, H * 0.45, H * 0.7],
        }),
        left: dayToNight.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [W * 0.65, W * 0.15, W * 0.05],
        }),
        opacity: dayToNight.interpolate({
          inputRange: [0, 0.4, 0.7, 1],
          outputRange: [1, 0.9, 0.3, 0],
        }),
      }}
    >
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFD54F', shadowColor: '#FFD54F', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20 }} />
    </Animated.View>
  );
}

// ─── Moon ───────────────────────────────────────────────────
function AnimatedMoon({ dayToNight }: { dayToNight: Animated.Value }) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: dayToNight.interpolate({
          inputRange: [0, 0.5, 0.8, 1],
          outputRange: [H * -0.1, H * 0.25, H * 0.10, H * 0.08],
        }),
        right: W * 0.15,
        opacity: dayToNight.interpolate({
          inputRange: [0, 0.5, 0.7, 1],
          outputRange: [0, 0, 0.7, 1],
        }),
      }}
    >
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={16} fill="#F5F5DC" />
        <Circle cx={28} cy={16} r={14} fill="transparent" />
        <Circle cx={14} cy={14} r={3} fill="rgba(200,200,180,0.4)" />
        <Circle cx={22} cy={24} r={2} fill="rgba(200,200,180,0.3)" />
        <Circle cx={16} cy={22} r={1.5} fill="rgba(200,200,180,0.3)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Stars ──────────────────────────────────────────────────
function AnimatedStars({ dayToNight }: { dayToNight: Animated.Value }) {
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loopPulse(twinkle, 2200, 1200);
  }, []);

  const starPositions = [
    { x: W * 0.1, y: H * 0.05 }, { x: W * 0.3, y: H * 0.08 },
    { x: W * 0.5, y: H * 0.03 }, { x: W * 0.7, y: H * 0.10 },
    { x: W * 0.85, y: H * 0.04 }, { x: W * 0.15, y: H * 0.14 },
    { x: W * 0.45, y: H * 0.12 }, { x: W * 0.75, y: H * 0.06 },
    { x: W * 0.55, y: H * 0.16 }, { x: W * 0.25, y: H * 0.18 },
    { x: W * 0.9, y: H * 0.13 }, { x: W * 0.05, y: H * 0.20 },
  ];

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: dayToNight.interpolate({
            inputRange: [0, 0.6, 0.8, 1],
            outputRange: [0, 0, 0.5, 1],
          }),
        },
      ]}
    >
      {starPositions.map((pos, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: 1.5,
            backgroundColor: '#FFFFFF',
            opacity: twinkle.interpolate({
              inputRange: [0, 1],
              outputRange: [i % 2 === 0 ? 0.3 : 0.8, i % 2 === 0 ? 0.8 : 0.3],
            }),
          }}
        />
      ))}
    </Animated.View>
  );
}

// ─── Clouds ─────────────────────────────────────────────────
function AnimatedClouds({ dayToNight }: { dayToNight: Animated.Value }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: false })
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: H * 0.08,
        left: 0,
        right: 0,
        opacity: dayToNight.interpolate({
          inputRange: [0, 0.5, 0.8, 1],
          outputRange: [0.7, 0.5, 0.15, 0],
        }),
        transform: [{
          translateX: drift.interpolate({
            inputRange: [0, 1],
            outputRange: [0, W * 0.15],
          }),
        }],
      }}
    >
      {/* Cloud 1 */}
      <Svg width={80} height={35} viewBox="0 0 80 35" style={{ position: 'absolute', left: W * 0.05 }}>
        <Ellipse cx={30} cy={20} rx={28} ry={14} fill="rgba(255,255,255,0.9)" />
        <Ellipse cx={50} cy={18} rx={20} ry={12} fill="rgba(255,255,255,0.85)" />
        <Ellipse cx={18} cy={22} rx={16} ry={10} fill="rgba(255,255,255,0.8)" />
      </Svg>
      {/* Cloud 2 */}
      <Svg width={60} height={25} viewBox="0 0 60 25" style={{ position: 'absolute', left: W * 0.55, top: 15 }}>
        <Ellipse cx={25} cy={14} rx={22} ry={10} fill="rgba(255,255,255,0.8)" />
        <Ellipse cx={40} cy={12} rx={16} ry={9} fill="rgba(255,255,255,0.75)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Building ───────────────────────────────────────────────
function AnimatedBuilding({
  x, w, h, color, colorNight, delay, windows, dayToNight,
}: {
  x: number; w: number; h: number; color: string; colorNight: string;
  delay: number; windows: number; dayToNight: Animated.Value;
}) {
  const rise = useRef(new Animated.Value(0)).current;
  const winGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      delayedSpring(rise, 1, delay),
      delayedTiming(winGlow, 1, 2600, 800),
    ]).start();
  }, []);

  const windowRows = Math.min(windows, Math.floor(h / 28));
  const windowCols = Math.max(2, Math.floor(w / 28));
  const winW = 8;
  const winH = 10;
  const padX = (w - windowCols * winW) / (windowCols + 1);
  const padY = 16;

  // Building color interpolation from day to night
  const buildingColor = dayToNight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [color, colorNight, colorNight],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        bottom: H - GROUND_Y,
        width: w,
        height: h,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        backgroundColor: buildingColor,
        overflow: 'hidden',
        opacity: rise,
        transform: [{
          translateY: rise.interpolate({
            inputRange: [0, 1],
            outputRange: [h, 0],
          }),
        }],
      }}
    >
      {/* Day windows (dark) */}
      <Animated.View style={{ flex: 1, paddingTop: padY, opacity: dayToNight.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
        {Array.from({ length: windowRows }).map((_, row) => (
          <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: padY - 4, paddingHorizontal: padX / 2 }}>
            {Array.from({ length: windowCols }).map((_, col) => (
              <View key={col} style={{ width: winW, height: winH, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            ))}
          </View>
        ))}
      </Animated.View>

      {/* Night windows (glowing warm) */}
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, paddingTop: padY, opacity: Animated.multiply(winGlow, dayToNight.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.3, 1], extrapolate: 'clamp' })) }}>
        {Array.from({ length: windowRows }).map((_, row) => (
          <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: padY - 4, paddingHorizontal: padX / 2 }}>
            {Array.from({ length: windowCols }).map((_, col) => {
              const isLit = (row + col) % 3 !== 0;
              return (
                <View key={col} style={{
                  width: winW, height: winH, borderRadius: 1.5,
                  backgroundColor: isLit ? '#FFE082' : 'rgba(255,255,255,0.15)',
                  shadowColor: isLit ? '#FFD54F' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isLit ? 0.8 : 0,
                  shadowRadius: 4,
                }} />
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Door */}
      <View style={{
        position: 'absolute', bottom: 0, left: w / 2 - 8,
        width: 16, height: 22,
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderTopLeftRadius: 8, borderTopRightRadius: 8,
      }} />
    </Animated.View>
  );
}

// ─── Tree ───────────────────────────────────────────────────
function AnimatedTree({ x, delay, size = 1, dayToNight }: { x: number; delay: number; size?: number; dayToNight: Animated.Value }) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    delayedSpring(pop, 1, delay, { damping: 8, stiffness: 100 }).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        bottom: H - GROUND_Y - 2,
        alignItems: 'center',
        opacity: pop,
        transform: [{ scale: pop }],
      }}
    >
      <Svg width={30 * size} height={52 * size} viewBox="0 0 30 52">
        <Circle cx={15} cy={14} r={13} fill="#4CAF50" />
        <Circle cx={9} cy={20} r={10} fill="#66BB6A" />
        <Circle cx={21} cy={20} r={10} fill="#66BB6A" />
        <Rect x={12} y={28} width={6} height={14} rx={2} fill="#795548" />
      </Svg>
    </Animated.View>
  );
}

// ─── Person with Broom ──────────────────────────────────────
function PersonBroom({ x, delay }: { x: number; delay: number }) {
  const enter = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    delayedSpring(enter, 1, delay, { damping: 10 }).start();
    loopPulse(sweep, delay + 300, 400);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, bottom: H - GROUND_Y - 2,
        opacity: enter,
        transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
      }}
    >
      <View style={{ alignItems: 'center', width: 36, height: 50 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFB74D' }} />
        <View style={{ width: 14, height: 18, borderRadius: 4, backgroundColor: '#42A5F5', marginTop: 2 }} />
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <View style={{ width: 5, height: 14, borderRadius: 2, backgroundColor: '#1E88E5' }} />
          <View style={{ width: 5, height: 14, borderRadius: 2, backgroundColor: '#1E88E5' }} />
        </View>
        <Animated.View
          style={{
            position: 'absolute', right: -8, top: 10,
            transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '15deg'] }) }],
          }}
        >
          <View style={{ width: 3, height: 28, backgroundColor: '#A1887F', borderRadius: 1 }} />
          <View style={{ width: 12, height: 8, backgroundColor: '#F5A623', borderRadius: 2, marginLeft: -4.5, marginTop: -1 }} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Person with Mop ────────────────────────────────────────
function PersonMop({ x, delay }: { x: number; delay: number }) {
  const enter = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    delayedSpring(enter, 1, delay, { damping: 10 }).start();
    loopPulse(bob, delay + 200, 500);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, bottom: H - GROUND_Y - 2,
        opacity: enter,
        transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center', width: 36, height: 50,
          transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
        }}
      >
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFB74D' }} />
        <View style={{ position: 'absolute', top: -2, width: 16, height: 6, borderRadius: 3, backgroundColor: '#EF5350' }} />
        <View style={{ width: 14, height: 18, borderRadius: 4, backgroundColor: '#66BB6A', marginTop: 2 }} />
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <View style={{ width: 5, height: 14, borderRadius: 2, backgroundColor: '#43A047' }} />
          <View style={{ width: 5, height: 14, borderRadius: 2, backgroundColor: '#43A047' }} />
        </View>
      </Animated.View>
      <View style={{
        position: 'absolute', right: -14, bottom: 0,
        width: 14, height: 12, backgroundColor: '#42A5F5',
        borderRadius: 3, borderTopLeftRadius: 0, borderTopRightRadius: 0,
      }} />
    </Animated.View>
  );
}

// ─── Person Gardener ────────────────────────────────────────
function PersonGardener({ x, delay }: { x: number; delay: number }) {
  const enter = useRef(new Animated.Value(0)).current;
  const spray = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    delayedSpring(enter, 1, delay, { damping: 10 }).start();
    loopPulse(spray, delay + 400, 600);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, bottom: H - GROUND_Y - 2,
        opacity: enter, transform: [{ scale: enter }],
      }}
    >
      <View style={{ alignItems: 'center', width: 36, height: 50 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFB74D' }} />
        <View style={{ position: 'absolute', top: -3, width: 20, height: 5, borderRadius: 10, backgroundColor: '#FFF9C4' }} />
        <View style={{ width: 14, height: 18, borderRadius: 4, backgroundColor: '#FF7043', marginTop: 2 }} />
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <View style={{ width: 5, height: 14, borderRadius: 2, backgroundColor: '#E64A19' }} />
          <View style={{ width: 5, height: 14, borderRadius: 2, backgroundColor: '#E64A19' }} />
        </View>
      </View>
      <Animated.View
        style={{
          position: 'absolute', left: -16, top: 18,
          opacity: spray,
          transform: [{ scaleX: spray.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }}
      >
        <Svg width={18} height={14} viewBox="0 0 18 14">
          <Ellipse cx={9} cy={7} rx={8} ry={6} fill="rgba(66, 165, 245, 0.4)" />
          <Circle cx={4} cy={4} r={2} fill="rgba(66, 165, 245, 0.6)" />
          <Circle cx={12} cy={9} r={1.5} fill="rgba(66, 165, 245, 0.5)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Sparkle ────────────────────────────────────────────────
function Sparkle({ x, y, delay, size = 8 }: { x: number; y: number; delay: number; size?: number }) {
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => { loopPulse(sparkle, delay, 600); }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y,
        opacity: sparkle,
        transform: [{ scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 12 12">
        <Path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#FFF9E6" />
      </Svg>
    </Animated.View>
  );
}

// ─── Ground ─────────────────────────────────────────────────
function Ground({ dayToNight }: { dayToNight: Animated.Value }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  }, []);

  const groundColor = dayToNight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#81C784', '#4E7A51', '#2E4A30'],
  });

  const sidewalkColor = dayToNight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#E0E0E0', '#9E9E9E', '#616161'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: 0, top: GROUND_Y,
        width: W, height: H - GROUND_Y, opacity: fadeIn,
      }}
    >
      <Animated.View style={{ width: W, height: 6, backgroundColor: sidewalkColor }} />
      <Animated.View style={{ flex: 1, backgroundColor: groundColor }} />
    </Animated.View>
  );
}

// ─── Logo ───────────────────────────────────────────────────
function AnimatedLogo({ dayToNight }: { dayToNight: Animated.Value }) {
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      delayedTiming(cardOpacity, 1, 3000, 600),
      delayedSpring(cardScale, 1, 3000, { damping: 12, stiffness: 80 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.logoContainer, {
      opacity: cardOpacity,
      transform: [{ scale: cardScale }],
    }]}>
      <View style={styles.logoCard}>
        {/* Icon */}
        <View style={styles.logoIconWrap}>
          <Svg width={52} height={52} viewBox="0 0 48 48">
            <Rect x="8" y="16" width="14" height="24" rx={2} fill={COLORS.primary} />
            <Rect x="26" y="8" width="14" height="32" rx={2} fill={COLORS.primary} opacity={0.8} />
            <Rect x="12" y="20" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="17" y="20" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="12" y="26" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="17" y="26" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="30" y="12" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="35" y="12" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="30" y="18" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="35" y="18" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="30" y="24" width="3" height="3" rx={0.5} fill="white" />
            <Rect x="35" y="24" width="3" height="3" rx={0.5} fill="white" />
            <Circle cx="15" cy="36" r={3} fill={COLORS.secondary} />
            <Circle cx="33" cy="36" r={3} fill={COLORS.secondary} />
          </Svg>
        </View>

        {/* Brand */}
        <Text style={styles.brandName}>
          Condo<Text style={styles.brandDaily}>Daily</Text>
        </Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Seu condominio em boas maos</Text>
      </View>
    </Animated.View>
  );
}

// ─── Main Animated Splash ───────────────────────────────────
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const fadeOut = useRef(new Animated.Value(1)).current;
  const dayToNight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Day → Night transition
    Animated.timing(dayToNight, {
      toValue: 1,
      duration: 2800,
      delay: 800,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // colors can't use native driver
    }).start();

    // Fade out after full animation
    const timer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <AnimatedSky dayToNight={dayToNight} />
      <AnimatedSun dayToNight={dayToNight} />
      <AnimatedMoon dayToNight={dayToNight} />
      <AnimatedStars dayToNight={dayToNight} />
      <AnimatedClouds dayToNight={dayToNight} />

      <Ground dayToNight={dayToNight} />

      {BUILDINGS.map((b, i) => (
        <AnimatedBuilding key={i} {...b} dayToNight={dayToNight} />
      ))}

      <AnimatedTree x={W * 0.38} delay={700} size={0.8} dayToNight={dayToNight} />
      <AnimatedTree x={W * 0.54} delay={850} size={0.65} dayToNight={dayToNight} />
      <AnimatedTree x={W * 0.76} delay={750} size={0.9} dayToNight={dayToNight} />

      <PersonBroom x={W * 0.08} delay={1000} />
      <PersonMop x={W * 0.44} delay={1150} />
      <PersonGardener x={W * 0.70} delay={1200} />

      <Sparkle x={W * 0.12} y={GROUND_Y - 20} delay={2800} size={10} />
      <Sparkle x={W * 0.50} y={GROUND_Y - 30} delay={3000} />
      <Sparkle x={W * 0.82} y={GROUND_Y - 15} delay={3100} size={6} />
      <Sparkle x={W * 0.30} y={H * 0.18} delay={3200} size={12} />
      <Sparkle x={W * 0.65} y={H * 0.15} delay={3300} />

      <AnimatedLogo dayToNight={dayToNight} />
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#87CEEB',
    zIndex: 999,
  },
  logoContainer: {
    position: 'absolute',
    top: H * 0.20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  logoIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 36,
    color: COLORS.primary,
    letterSpacing: -1,
  },
  brandDaily: {
    color: COLORS.secondary,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.secondary,
    marginVertical: 10,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
