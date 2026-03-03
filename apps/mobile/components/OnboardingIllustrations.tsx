import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Rect, Circle, Ellipse, Path, G, Line } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const { width: W } = Dimensions.get('window');
const SCENE_W = W * 0.85;
const SCENE_H = 220;

// ─── 1. Welcome / Building scene ────────────────────────────
export function IllustrationWelcome() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        {/* Sky */}
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E8F5E9" />

        {/* Sun */}
        <Circle cx={SCENE_W * 0.8} cy={35} r={22} fill="#FFD54F" opacity={0.9} />

        {/* Cloud */}
        <Ellipse cx={SCENE_W * 0.25} cy={30} rx={30} ry={12} fill="white" opacity={0.8} />
        <Ellipse cx={SCENE_W * 0.3} cy={28} rx={20} ry={10} fill="white" opacity={0.7} />

        {/* Ground */}
        <Rect x={0} y={175} width={SCENE_W} height={45} rx={0} fill="#A5D6A7" />
        <Rect x={0} y={172} width={SCENE_W} height={6} rx={0} fill="#C8E6C9" />

        {/* Building 1 - tall */}
        <Rect x={SCENE_W * 0.08} y={60} width={60} height={115} rx={4} fill={COLORS.primary} />
        {[0,1,2,3,4].map(row => [0,1,2].map(col => (
          <Rect key={`b1-${row}-${col}`} x={SCENE_W * 0.08 + 10 + col * 18} y={72 + row * 20} width={8} height={10} rx={1} fill="white" opacity={0.5} />
        )))}
        <Rect x={SCENE_W * 0.08 + 22} y={155} width={16} height={20} rx={8} fill="rgba(0,0,0,0.15)" />

        {/* Building 2 - short */}
        <Rect x={SCENE_W * 0.32} y={100} width={50} height={75} rx={4} fill="#1B7A6E" opacity={0.8} />
        {[0,1,2].map(row => [0,1].map(col => (
          <Rect key={`b2-${row}-${col}`} x={SCENE_W * 0.32 + 10 + col * 20} y={110 + row * 20} width={8} height={10} rx={1} fill="white" opacity={0.5} />
        )))}

        {/* Building 3 - medium */}
        <Rect x={SCENE_W * 0.55} y={80} width={55} height={95} rx={4} fill="#145C53" />
        {[0,1,2,3].map(row => [0,1,2].map(col => (
          <Rect key={`b3-${row}-${col}`} x={SCENE_W * 0.55 + 8 + col * 16} y={90 + row * 20} width={7} height={9} rx={1} fill="white" opacity={0.5} />
        )))}

        {/* Building 4 */}
        <Rect x={SCENE_W * 0.78} y={110} width={45} height={65} rx={4} fill={COLORS.primary} opacity={0.7} />
        {[0,1].map(row => [0,1].map(col => (
          <Rect key={`b4-${row}-${col}`} x={SCENE_W * 0.78 + 8 + col * 18} y={120 + row * 22} width={8} height={10} rx={1} fill="white" opacity={0.5} />
        )))}

        {/* Trees */}
        <Circle cx={SCENE_W * 0.28} cy={155} r={12} fill="#66BB6A" />
        <Rect x={SCENE_W * 0.28 - 3} y={164} width={6} height={11} rx={2} fill="#795548" />
        <Circle cx={SCENE_W * 0.50} cy={158} r={10} fill="#81C784" />
        <Rect x={SCENE_W * 0.50 - 2.5} y={166} width={5} height={9} rx={2} fill="#795548" />

        {/* Person with broom */}
        <Circle cx={SCENE_W * 0.18} cy={158} r={5} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.18 - 5} y={163} width={10} height={13} rx={3} fill="#42A5F5" />
        <Line x1={SCENE_W * 0.18 + 6} y1={160} x2={SCENE_W * 0.18 + 6} y2={178} stroke="#A1887F" strokeWidth={2} />

        {/* Person with mop */}
        <Circle cx={SCENE_W * 0.72} cy={158} r={5} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.72 - 5} y={163} width={10} height={13} rx={3} fill="#FF7043" />
        <Ellipse cx={SCENE_W * 0.72 + 10} cy={174} rx={5} ry={3} fill="#42A5F5" opacity={0.6} />
      </Svg>
    </View>
  );
}

// ─── 2. Register / CNPJ ─────────────────────────────────────
export function IllustrationRegister() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E0F2F1" />

        {/* Clipboard/document */}
        <Rect x={SCENE_W * 0.25} y={20} width={SCENE_W * 0.5} height={160} rx={12} fill="white" />
        <Rect x={SCENE_W * 0.35} y={10} width={SCENE_W * 0.3} height={20} rx={6} fill={COLORS.primary} />

        {/* Document lines */}
        <Rect x={SCENE_W * 0.32} y={50} width={SCENE_W * 0.36} height={6} rx={3} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.32} y={65} width={SCENE_W * 0.28} height={6} rx={3} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.32} y={80} width={SCENE_W * 0.32} height={6} rx={3} fill="#E0E0E0" />

        {/* CNPJ field highlighted */}
        <Rect x={SCENE_W * 0.30} y={100} width={SCENE_W * 0.40} height={30} rx={8} fill={COLORS.primary + '15'} />
        <Rect x={SCENE_W * 0.33} y={110} width={SCENE_W * 0.20} height={6} rx={3} fill={COLORS.primary} opacity={0.5} />

        {/* Check mark */}
        <Circle cx={SCENE_W * 0.63} cy={115} r={10} fill={COLORS.primary} />
        <Path d={`M${SCENE_W * 0.63 - 5} ${115} l3 4 l7 -8`} stroke="white" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Building icon on clipboard */}
        <Rect x={SCENE_W * 0.44} y={140} width={14} height={25} rx={2} fill={COLORS.primary} opacity={0.3} />
        <Rect x={SCENE_W * 0.44 + 18} y={132} width={14} height={33} rx={2} fill={COLORS.primary} opacity={0.4} />

        {/* Person filling form */}
        <Circle cx={SCENE_W * 0.12} cy={130} r={12} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.12 - 12} y={143} width={24} height={30} rx={6} fill="#42A5F5" />
        <Line x1={SCENE_W * 0.12 + 10} y1={143} x2={SCENE_W * 0.25} y2={110} stroke="#A1887F" strokeWidth={2} />
      </Svg>
    </View>
  );
}

// ─── 3. Wallet / PIX ────────────────────────────────────────
export function IllustrationWallet() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E8EAF6" />

        {/* Phone */}
        <Rect x={SCENE_W * 0.3} y={15} width={SCENE_W * 0.4} height={180} rx={16} fill="#263238" />
        <Rect x={SCENE_W * 0.3 + 6} y={30} width={SCENE_W * 0.4 - 12} height={150} rx={4} fill="white" />

        {/* Wallet content on phone */}
        <Rect x={SCENE_W * 0.33} y={40} width={SCENE_W * 0.34} height={40} rx={8} fill={COLORS.primary} />
        <Circle cx={SCENE_W * 0.40} cy={55} r={6} fill="white" opacity={0.3} />
        <Rect x={SCENE_W * 0.47} y={50} width={40} height={5} rx={2} fill="white" opacity={0.7} />
        <Rect x={SCENE_W * 0.47} y={58} width={25} height={4} rx={2} fill="white" opacity={0.4} />

        {/* PIX symbol */}
        <G transform={`translate(${SCENE_W * 0.45}, 95)`}>
          <Rect x={0} y={0} width={40} height={35} rx={8} fill="#00BCD4" opacity={0.15} />
          <Path d="M12 8 L20 16 L12 24 M28 8 L20 16 L28 24" stroke="#00BCD4" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>

        {/* Transaction lines */}
        <Rect x={SCENE_W * 0.33} y={140} width={SCENE_W * 0.24} height={4} rx={2} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.33} y={150} width={SCENE_W * 0.18} height={4} rx={2} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.58} y={140} width={20} height={4} rx={2} fill="#66BB6A" />
        <Rect x={SCENE_W * 0.58} y={150} width={15} height={4} rx={2} fill="#66BB6A" />

        {/* Coins floating */}
        <Circle cx={SCENE_W * 0.15} cy={60} r={15} fill="#FFD54F" />
        <Circle cx={SCENE_W * 0.15} cy={60} r={10} fill="#FFC107" />
        <Rect x={SCENE_W * 0.14} y={56} width={4} height={8} rx={2} fill="#FFD54F" />

        <Circle cx={SCENE_W * 0.82} cy={80} r={12} fill="#FFD54F" opacity={0.8} />
        <Circle cx={SCENE_W * 0.82} cy={80} r={8} fill="#FFC107" opacity={0.8} />

        <Circle cx={SCENE_W * 0.20} cy={140} r={10} fill="#FFD54F" opacity={0.6} />
      </Svg>
    </View>
  );
}

// ─── 4. Search / Professionals ──────────────────────────────
export function IllustrationSearch() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#FFF3E0" />

        {/* Search bar */}
        <Rect x={SCENE_W * 0.15} y={15} width={SCENE_W * 0.7} height={36} rx={18} fill="white" />
        <Circle cx={SCENE_W * 0.22} cy={33} r={8} fill="none" stroke="#9E9E9E" strokeWidth={2} />
        <Line x1={SCENE_W * 0.22 + 6} y1={39} x2={SCENE_W * 0.22 + 10} y2={43} stroke="#9E9E9E" strokeWidth={2} />
        <Rect x={SCENE_W * 0.32} y={29} width={60} height={5} rx={2} fill="#BDBDBD" />

        {/* Professional cards */}
        {[0, 1, 2].map(i => {
          const y = 65 + i * 52;
          const colors = ['#42A5F5', '#66BB6A', '#FF7043'];
          const stars = [5, 4, 5];
          return (
            <G key={i}>
              <Rect x={SCENE_W * 0.1} y={y} width={SCENE_W * 0.8} height={44} rx={10} fill="white" />
              {/* Avatar */}
              <Circle cx={SCENE_W * 0.1 + 25} cy={y + 22} r={14} fill={colors[i]} opacity={0.2} />
              <Circle cx={SCENE_W * 0.1 + 25} cy={y + 17} r={5} fill={colors[i]} />
              <Rect x={SCENE_W * 0.1 + 19} y={y + 24} width={12} height={8} rx={3} fill={colors[i]} />
              {/* Name */}
              <Rect x={SCENE_W * 0.1 + 48} y={y + 12} width={70} height={5} rx={2} fill="#424242" opacity={0.6} />
              <Rect x={SCENE_W * 0.1 + 48} y={y + 22} width={45} height={4} rx={2} fill="#9E9E9E" />
              {/* Stars */}
              {Array.from({ length: stars[i] }).map((_, s) => (
                <Circle key={s} cx={SCENE_W * 0.1 + 48 + s * 10} cy={y + 34} r={3} fill="#FFD54F" />
              ))}
              {/* Price */}
              <Rect x={SCENE_W * 0.75} y={y + 16} width={30} height={12} rx={4} fill={COLORS.primary} opacity={0.15} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── 5. Schedule / Calendar ─────────────────────────────────
export function IllustrationSchedule() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E3F2FD" />

        {/* Calendar */}
        <Rect x={SCENE_W * 0.15} y={20} width={SCENE_W * 0.7} height={140} rx={12} fill="white" />
        <Rect x={SCENE_W * 0.15} y={20} width={SCENE_W * 0.7} height={35} rx={12} fill={COLORS.primary} />
        <Rect x={SCENE_W * 0.15} y={43} width={SCENE_W * 0.7} height={12} fill={COLORS.primary} />

        {/* Month text */}
        <Rect x={SCENE_W * 0.37} y={30} width={60} height={6} rx={3} fill="white" opacity={0.8} />

        {/* Calendar grid */}
        {[0, 1, 2, 3].map(row =>
          [0, 1, 2, 3, 4, 5, 6].map(col => {
            const x = SCENE_W * 0.18 + col * (SCENE_W * 0.66 / 7);
            const y = 65 + row * 22;
            const isSelected = row === 1 && col === 3;
            const isToday = row === 1 && col === 1;
            return (
              <G key={`${row}-${col}`}>
                {isSelected && <Circle cx={x + 6} cy={y + 4} r={10} fill={COLORS.primary} />}
                {isToday && <Circle cx={x + 6} cy={y + 4} r={10} fill={COLORS.primary} opacity={0.15} />}
                <Rect x={x} y={y} width={12} height={5} rx={2} fill={isSelected ? 'white' : '#757575'} opacity={isSelected ? 1 : 0.4} />
              </G>
            );
          })
        )}

        {/* Clock */}
        <Circle cx={SCENE_W * 0.5} cy={185} r={22} fill="white" />
        <Circle cx={SCENE_W * 0.5} cy={185} r={20} fill="none" stroke={COLORS.primary} strokeWidth={2} />
        <Line x1={SCENE_W * 0.5} y1={185} x2={SCENE_W * 0.5} y2={172} stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
        <Line x1={SCENE_W * 0.5} y1={185} x2={SCENE_W * 0.5 + 10} y2={185} stroke={COLORS.secondary} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={SCENE_W * 0.5} cy={185} r={2.5} fill={COLORS.primary} />

        {/* Person pointing at calendar */}
        <Circle cx={SCENE_W * 0.88} cy={130} r={10} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.88 - 10} y={141} width={20} height={26} rx={5} fill="#42A5F5" />
        <Line x1={SCENE_W * 0.88 - 8} y1={145} x2={SCENE_W * 0.85} y2={120} stroke="#FFB74D" strokeWidth={3} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// ─── 6. Insurance / Shield ──────────────────────────────────
export function IllustrationInsurance() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E8F5E9" />

        {/* Shield */}
        <Path
          d={`M${SCENE_W * 0.5} 15 L${SCENE_W * 0.5 + 60} 40 L${SCENE_W * 0.5 + 55} 120 Q${SCENE_W * 0.5} 160 ${SCENE_W * 0.5 - 55} 120 L${SCENE_W * 0.5 - 60} 40 Z`}
          fill={COLORS.primary}
          opacity={0.9}
        />
        <Path
          d={`M${SCENE_W * 0.5} 25 L${SCENE_W * 0.5 + 50} 46 L${SCENE_W * 0.5 + 46} 112 Q${SCENE_W * 0.5} 148 ${SCENE_W * 0.5 - 46} 112 L${SCENE_W * 0.5 - 50} 46 Z`}
          fill={COLORS.primary}
        />

        {/* Check on shield */}
        <Path
          d={`M${SCENE_W * 0.5 - 18} 80 L${SCENE_W * 0.5 - 5} 98 L${SCENE_W * 0.5 + 22} 62`}
          stroke="white"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Building on left */}
        <Rect x={SCENE_W * 0.05} y={130} width={40} height={70} rx={4} fill={COLORS.primary} opacity={0.3} />
        {[0,1,2].map(row => [0,1].map(col => (
          <Rect key={`l-${row}-${col}`} x={SCENE_W * 0.05 + 6 + col * 16} y={140 + row * 18} width={6} height={8} rx={1} fill="white" opacity={0.4} />
        )))}

        {/* Person on right */}
        <Circle cx={SCENE_W * 0.88} cy={148} r={10} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.88 - 10} y={159} width={20} height={26} rx={5} fill="#66BB6A" />

        {/* Sparkles around shield */}
        <Path d={`M${SCENE_W * 0.5 + 70} 50 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z`} fill="#FFD54F" />
        <Path d={`M${SCENE_W * 0.5 - 70} 60 l1.5 5 l5 1.5 l-5 1.5 l-1.5 5 l-1.5 -5 l-5 -1.5 l5 -1.5 Z`} fill="#FFD54F" />
        <Path d={`M${SCENE_W * 0.5 + 50} 130 l1 4 l4 1 l-4 1 l-1 4 l-1 -4 l-4 -1 l4 -1 Z`} fill="#FFD54F" opacity={0.7} />

        {/* Ground */}
        <Rect x={0} y={200} width={SCENE_W} height={20} fill="#A5D6A7" />
      </Svg>
    </View>
  );
}

// ─── 7. Rating / Stars ──────────────────────────────────────
export function IllustrationRating() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#FFF8E1" />

        {/* Big star */}
        <Path
          d={`M${SCENE_W * 0.5} 20 L${SCENE_W * 0.5 + 15} 55 L${SCENE_W * 0.5 + 48} 60 L${SCENE_W * 0.5 + 22} 82 L${SCENE_W * 0.5 + 30} 115 L${SCENE_W * 0.5} 95 L${SCENE_W * 0.5 - 30} 115 L${SCENE_W * 0.5 - 22} 82 L${SCENE_W * 0.5 - 48} 60 L${SCENE_W * 0.5 - 15} 55 Z`}
          fill="#FFD54F"
        />
        <Path
          d={`M${SCENE_W * 0.5} 30 L${SCENE_W * 0.5 + 12} 58 L${SCENE_W * 0.5 + 38} 62 L${SCENE_W * 0.5 + 18} 80 L${SCENE_W * 0.5 + 24} 106 L${SCENE_W * 0.5} 90 L${SCENE_W * 0.5 - 24} 106 L${SCENE_W * 0.5 - 18} 80 L${SCENE_W * 0.5 - 38} 62 L${SCENE_W * 0.5 - 12} 58 Z`}
          fill="#FFC107"
        />

        {/* Small stars */}
        <Path d={`M${SCENE_W * 0.15} 45 l4 12 l12 2 l-10 8 l3 12 l-9 -7 l-9 7 l3 -12 l-10 -8 l12 -2 Z`} fill="#FFD54F" opacity={0.6} />
        <Path d={`M${SCENE_W * 0.85} 35 l3 10 l10 2 l-8 6 l2 10 l-7 -6 l-7 6 l2 -10 l-8 -6 l10 -2 Z`} fill="#FFD54F" opacity={0.5} />

        {/* Review card */}
        <Rect x={SCENE_W * 0.15} y={125} width={SCENE_W * 0.7} height={70} rx={12} fill="white" />

        {/* Avatar in card */}
        <Circle cx={SCENE_W * 0.15 + 30} cy={155} r={16} fill="#42A5F5" opacity={0.2} />
        <Circle cx={SCENE_W * 0.15 + 30} cy={150} r={6} fill="#42A5F5" />
        <Rect x={SCENE_W * 0.15 + 22} y={158} width={16} height={10} rx={4} fill="#42A5F5" />

        {/* Review text */}
        <Rect x={SCENE_W * 0.15 + 55} y={138} width={80} height={5} rx={2} fill="#424242" opacity={0.5} />
        <Rect x={SCENE_W * 0.15 + 55} y={148} width={100} height={4} rx={2} fill="#9E9E9E" opacity={0.4} />
        <Rect x={SCENE_W * 0.15 + 55} y={157} width={70} height={4} rx={2} fill="#9E9E9E" opacity={0.4} />

        {/* 5 stars in review */}
        {[0,1,2,3,4].map(i => (
          <Path key={i} d={`M${SCENE_W * 0.15 + 55 + i * 16} 170 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1 Z`} fill="#FFD54F" />
        ))}

        {/* Thumbs up */}
        <Circle cx={SCENE_W * 0.85} cy={160} r={16} fill={COLORS.primary} opacity={0.15} />
        <Path d={`M${SCENE_W * 0.85 - 6} 162 l0 -10 l6 -8 l2 0 l-1 8 l8 0 l-2 12 l-10 0 Z`} fill={COLORS.primary} opacity={0.6} />
      </Svg>
    </View>
  );
}

// ─── Pro 1: Quiz ────────────────────────────────────────────
export function IllustrationQuiz() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#FFF3E0" />

        {/* Quiz paper */}
        <Rect x={SCENE_W * 0.2} y={15} width={SCENE_W * 0.6} height={170} rx={12} fill="white" />

        {/* Title bar */}
        <Rect x={SCENE_W * 0.2} y={15} width={SCENE_W * 0.6} height={30} rx={12} fill={COLORS.secondary} />
        <Rect x={SCENE_W * 0.2} y={33} width={SCENE_W * 0.6} height={12} fill={COLORS.secondary} />
        <Rect x={SCENE_W * 0.35} y={24} width={60} height={5} rx={2} fill="white" opacity={0.8} />

        {/* Questions with checkboxes */}
        {[0, 1, 2, 3].map(i => {
          const y = 58 + i * 32;
          const checked = i < 3;
          return (
            <G key={i}>
              <Rect x={SCENE_W * 0.26} y={y} width={14} height={14} rx={3} fill={checked ? COLORS.primary : '#E0E0E0'} />
              {checked && <Path d={`M${SCENE_W * 0.26 + 3} ${y + 7} l3 3 l5 -6`} stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" />}
              <Rect x={SCENE_W * 0.26 + 22} y={y + 2} width={80} height={5} rx={2} fill="#757575" opacity={0.4} />
              <Rect x={SCENE_W * 0.26 + 22} y={y + 10} width={50} height={4} rx={2} fill="#BDBDBD" />
            </G>
          );
        })}

        {/* Progress bar */}
        <Rect x={SCENE_W * 0.26} y={192} width={SCENE_W * 0.48} height={6} rx={3} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.26} y={192} width={SCENE_W * 0.36} height={6} rx={3} fill={COLORS.secondary} />

        {/* Person thinking */}
        <Circle cx={SCENE_W * 0.88} cy={90} r={14} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.88 - 12} y={105} width={24} height={30} rx={6} fill={COLORS.secondary} />

        {/* Thought bubble */}
        <Circle cx={SCENE_W * 0.88 - 18} cy={75} r={3} fill="#E0E0E0" />
        <Circle cx={SCENE_W * 0.88 - 25} cy={65} r={5} fill="#E0E0E0" />
        <Ellipse cx={SCENE_W * 0.88 - 32} cy={50} rx={12} ry={8} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.88 - 40} y={47} width={10} height={3} rx={1} fill="#BDBDBD" />
      </Svg>
    </View>
  );
}

// ─── Pro 5: Check-in/Check-out ──────────────────────────────
export function IllustrationCheckin() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E3F2FD" />

        {/* Map / location background */}
        <Rect x={SCENE_W * 0.1} y={15} width={SCENE_W * 0.8} height={130} rx={12} fill="#C8E6C9" opacity={0.5} />

        {/* Roads */}
        <Rect x={SCENE_W * 0.1} y={70} width={SCENE_W * 0.8} height={8} fill="#E0E0E0" />
        <Rect x={SCENE_W * 0.45} y={15} width={8} height={130} fill="#E0E0E0" />

        {/* Building block */}
        <Rect x={SCENE_W * 0.15} y={25} width={50} height={40} rx={4} fill={COLORS.primary} opacity={0.4} />
        <Rect x={SCENE_W * 0.55} y={85} width={60} height={50} rx={4} fill={COLORS.primary} opacity={0.3} />

        {/* Location pin */}
        <G transform={`translate(${SCENE_W * 0.5 - 15}, 30)`}>
          <Path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 40 15 40 C15 40 30 26 30 15 C30 6.7 23.3 0 15 0 Z" fill="#EF5350" />
          <Circle cx={15} cy={14} r={7} fill="white" />
        </G>

        {/* Check-in button */}
        <Rect x={SCENE_W * 0.2} y={155} width={SCENE_W * 0.28} height={36} rx={18} fill={COLORS.primary} />
        <Rect x={SCENE_W * 0.28} y={168} width={40} height={5} rx={2} fill="white" opacity={0.8} />

        {/* Check-out button */}
        <Rect x={SCENE_W * 0.52} y={155} width={SCENE_W * 0.28} height={36} rx={18} fill="#EF5350" opacity={0.8} />
        <Rect x={SCENE_W * 0.60} y={168} width={40} height={5} rx={2} fill="white" opacity={0.8} />

        {/* Person with phone */}
        <Circle cx={SCENE_W * 0.5} cy={110} r={8} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.5 - 7} y={119} width={14} height={18} rx={4} fill="#42A5F5" />
        <Rect x={SCENE_W * 0.5 + 7} y={115} width={8} height={14} rx={2} fill="#263238" />
      </Svg>
    </View>
  );
}

// ─── Pro 6: Earnings / Money ────────────────────────────────
export function IllustrationEarnings() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#E8F5E9" />

        {/* Chart */}
        <Rect x={SCENE_W * 0.1} y={20} width={SCENE_W * 0.8} height={130} rx={12} fill="white" />

        {/* Chart bars */}
        {[0,1,2,3,4,5,6].map(i => {
          const heights = [40, 55, 35, 70, 60, 80, 90];
          const x = SCENE_W * 0.15 + i * (SCENE_W * 0.68 / 7);
          return (
            <Rect key={i} x={x} y={135 - heights[i]} width={SCENE_W * 0.06} height={heights[i]} rx={4} fill={COLORS.primary} opacity={0.3 + i * 0.08} />
          );
        })}

        {/* Trend line */}
        <Path d={`M${SCENE_W * 0.17} 100 Q${SCENE_W * 0.35} 80 ${SCENE_W * 0.5} 75 Q${SCENE_W * 0.65} 70 ${SCENE_W * 0.83} 48`} stroke={COLORS.secondary} strokeWidth={3} fill="none" strokeLinecap="round" />

        {/* Coins stack */}
        <G transform={`translate(${SCENE_W * 0.15}, 160)`}>
          {[0,1,2].map(i => (
            <G key={i}>
              <Ellipse cx={20} cy={35 - i * 10} rx={18} ry={6} fill="#FFC107" />
              <Rect x={2} y={29 - i * 10} width={36} height={6} fill="#FFD54F" />
              <Ellipse cx={20} cy={29 - i * 10} rx={18} ry={6} fill="#FFD54F" />
            </G>
          ))}
        </G>

        {/* Money bag */}
        <G transform={`translate(${SCENE_W * 0.65}, 155)`}>
          <Ellipse cx={25} cy={35} rx={22} ry={18} fill="#66BB6A" />
          <Rect x={15} y={10} width={20} height={15} rx={4} fill="#66BB6A" />
          <Circle cx={25} cy={32} r={8} fill="white" opacity={0.3} />
          <Rect x={23} y={27} width={4} height={10} rx={2} fill="white" opacity={0.5} />
        </G>

        {/* Happy person */}
        <Circle cx={SCENE_W * 0.5} cy={170} r={12} fill="#FFB74D" />
        <Rect x={SCENE_W * 0.5 - 11} y={183} width={22} height={28} rx={6} fill="#FF7043" />
        {/* Arms up */}
        <Line x1={SCENE_W * 0.5 - 11} y1={188} x2={SCENE_W * 0.5 - 22} y2={178} stroke="#FFB74D" strokeWidth={3} strokeLinecap="round" />
        <Line x1={SCENE_W * 0.5 + 11} y1={188} x2={SCENE_W * 0.5 + 22} y2={178} stroke="#FFB74D" strokeWidth={3} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// ─── Pro 7: Level up / Trophy ───────────────────────────────
export function IllustrationTrophy() {
  return (
    <View style={{ width: SCENE_W, height: SCENE_H, alignItems: 'center' }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} rx={20} fill="#FFF8E1" />

        {/* Trophy */}
        <G transform={`translate(${SCENE_W * 0.5 - 35}, 15)`}>
          {/* Cup */}
          <Path d="M15 0 L55 0 L50 50 Q35 70 20 50 Z" fill="#FFD54F" />
          <Path d="M20 5 L50 5 L46 45 Q35 60 24 45 Z" fill="#FFC107" />
          {/* Handles */}
          <Path d="M15 8 Q0 8 0 25 Q0 40 15 40" stroke="#FFD54F" strokeWidth={5} fill="none" />
          <Path d="M55 8 Q70 8 70 25 Q70 40 55 40" stroke="#FFD54F" strokeWidth={5} fill="none" />
          {/* Base */}
          <Rect x={25} y={62} width={20} height={10} rx={2} fill="#FFD54F" />
          <Rect x={18} y={70} width={34} height={8} rx={3} fill="#FFC107" />
          {/* Star on trophy */}
          <Path d="M35 20 l4 10 l10 2 l-8 6 l2 10 l-8 -6 l-8 6 l2 -10 l-8 -6 l10 -2 Z" fill="white" opacity={0.6} />
        </G>

        {/* Confetti */}
        <Circle cx={SCENE_W * 0.15} cy={30} r={4} fill="#EF5350" />
        <Circle cx={SCENE_W * 0.82} cy={45} r={3} fill="#42A5F5" />
        <Rect x={SCENE_W * 0.1} y={60} width={8} height={4} rx={2} fill={COLORS.secondary} transform={`rotate(30, ${SCENE_W * 0.1 + 4}, 62)`} />
        <Rect x={SCENE_W * 0.88} y={25} width={6} height={3} rx={1.5} fill="#66BB6A" transform={`rotate(-20, ${SCENE_W * 0.88 + 3}, 26.5)`} />
        <Circle cx={SCENE_W * 0.2} cy={90} r={3} fill="#AB47BC" opacity={0.6} />
        <Circle cx={SCENE_W * 0.78} cy={80} r={2.5} fill="#FFD54F" />

        {/* Level badges */}
        <G transform={`translate(${SCENE_W * 0.1}, 110)`}>
          {[1, 2, 3, 4, 5].map(i => {
            const x = (i - 1) * (SCENE_W * 0.16);
            const active = i <= 3;
            return (
              <G key={i}>
                <Circle cx={x + SCENE_W * 0.08} cy={25} r={18} fill={active ? COLORS.primary : '#E0E0E0'} opacity={active ? 0.3 + i * 0.15 : 0.3} />
                <Circle cx={x + SCENE_W * 0.08} cy={25} r={12} fill={active ? COLORS.primary : '#E0E0E0'} opacity={active ? 0.5 + i * 0.1 : 0.2} />
                <Rect x={x + SCENE_W * 0.08 - 4} y={22} width={8} height={4} rx={2} fill="white" opacity={active ? 0.8 : 0.3} />
              </G>
            );
          })}
        </G>

        {/* "Nível 3" text placeholder */}
        <Rect x={SCENE_W * 0.35} y={170} width={SCENE_W * 0.3} height={24} rx={12} fill={COLORS.primary} />
        <Rect x={SCENE_W * 0.40} y={178} width={40} height={5} rx={2} fill="white" opacity={0.8} />

        {/* Sparkles */}
        <Path d={`M${SCENE_W * 0.5 - 60} 15 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z`} fill="#FFD54F" />
        <Path d={`M${SCENE_W * 0.5 + 60} 10 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z`} fill="#FFD54F" />
      </Svg>
    </View>
  );
}

// ─── Export mapping for easy use ────────────────────────────
export const CONTRATANTE_ILLUSTRATIONS = [
  IllustrationWelcome,    // 1. Bem-vindo
  IllustrationRegister,   // 2. Cadastre seu Condomínio
  IllustrationWallet,     // 3. Deposite na CondoWallet
  IllustrationSearch,     // 4. Busque Profissionais
  IllustrationSchedule,   // 5. Agende a Diária
  IllustrationInsurance,  // 6. Seguro Automático
  IllustrationRating,     // 7. Avalie o Serviço
];

export const PROFISSIONAL_ILLUSTRATIONS = [
  IllustrationWelcome,    // 1. Bem-vindo
  IllustrationQuiz,       // 2. Quiz de Ética
  IllustrationSearch,     // 3. Configure Perfil (reuse search)
  IllustrationSchedule,   // 4. Receba Solicitações (reuse schedule)
  IllustrationCheckin,    // 5. Check-in/Check-out
  IllustrationEarnings,   // 6. Receba seus Ganhos
  IllustrationTrophy,     // 7. Cresça na Plataforma
];
