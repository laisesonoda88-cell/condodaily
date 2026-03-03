import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Circle, Path, Ellipse } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// ─── Variants ───────────────────────────────────────────────
// "day"    — light sky, sun, bright buildings, green grass
// "night"  — dark sky, moon, stars, lit windows
// "sunset" — warm orange/pink sky, silhouette buildings

type CityVariant = 'day' | 'night' | 'sunset';

interface CityBackgroundProps {
  variant?: CityVariant;
  /** Opacity of the entire scene (0-1). Default 0.12 for subtle background */
  opacity?: number;
  /** Show only the skyline (buildings) without sky. Good for bottom decoration */
  skylineOnly?: boolean;
  /** Height of the background as fraction of screen. Default 0.35 */
  heightFraction?: number;
  /** Position: 'top' or 'bottom'. Default 'bottom' */
  position?: 'top' | 'bottom';
}

const PALETTES = {
  day: {
    sky: '#87CEEB',
    skyBottom: '#B3E5FC',
    building1: '#B0BEC5',
    building2: '#90A4AE',
    building3: '#78909C',
    window: 'rgba(255,255,255,0.5)',
    windowLit: 'rgba(255,255,255,0.5)',
    ground: '#81C784',
    sidewalk: '#E0E0E0',
    tree: '#66BB6A',
    celestial: '#FFD54F', // sun
  },
  night: {
    sky: '#0F1B3D',
    skyBottom: '#1A2540',
    building1: '#37474F',
    building2: '#263238',
    building3: '#1B3A4B',
    window: 'rgba(255,255,255,0.1)',
    windowLit: '#FFE082',
    ground: '#2E4A30',
    sidewalk: '#616161',
    tree: '#2E7D32',
    celestial: '#F5F5DC', // moon
  },
  sunset: {
    sky: '#FF8C42',
    skyBottom: '#E8587A',
    building1: '#455A64',
    building2: '#37474F',
    building3: '#263238',
    window: 'rgba(255,200,100,0.3)',
    windowLit: '#FFCC80',
    ground: '#4E7A51',
    sidewalk: '#9E9E9E',
    tree: '#388E3C',
    celestial: '#FFD54F', // setting sun
  },
};

// ─── Mini Building ──────────────────────────────────────────
function MiniBuilding({
  x, w, h, color, windowColor, windowLit,
}: {
  x: number; w: number; h: number; color: string;
  windowColor: string; windowLit: string;
}) {
  const rows = Math.max(1, Math.floor(h / 18));
  const cols = Math.max(2, Math.floor(w / 16));

  return (
    <View style={{
      position: 'absolute', left: x, bottom: 0,
      width: w, height: h,
      borderTopLeftRadius: 4, borderTopRightRadius: 4,
      backgroundColor: color, overflow: 'hidden',
    }}>
      <View style={{ flex: 1, paddingTop: 8 }}>
        {Array.from({ length: rows }).map((_, row) => (
          <View key={row} style={{
            flexDirection: 'row', justifyContent: 'space-evenly',
            marginBottom: 6, paddingHorizontal: 3,
          }}>
            {Array.from({ length: cols }).map((_, col) => {
              const isLit = (row + col) % 3 !== 0;
              return (
                <View key={col} style={{
                  width: 5, height: 6, borderRadius: 1,
                  backgroundColor: isLit ? windowLit : windowColor,
                }} />
              );
            })}
          </View>
        ))}
      </View>
      {/* Door */}
      <View style={{
        position: 'absolute', bottom: 0, left: w / 2 - 5,
        width: 10, height: 14,
        backgroundColor: 'rgba(0,0,0,0.12)',
        borderTopLeftRadius: 5, borderTopRightRadius: 5,
      }} />
    </View>
  );
}

// ─── Mini Tree ──────────────────────────────────────────────
function MiniTree({ x, color, scale = 1 }: { x: number; color: string; scale?: number }) {
  return (
    <View style={{ position: 'absolute', left: x, bottom: -1, alignItems: 'center' }}>
      <Svg width={16 * scale} height={28 * scale} viewBox="0 0 16 28">
        <Circle cx={8} cy={8} r={7} fill={color} />
        <Circle cx={5} cy={12} r={5} fill={color} opacity={0.8} />
        <Circle cx={11} cy={12} r={5} fill={color} opacity={0.8} />
        <Rect x={6} y={16} width={4} height={8} rx={1.5} fill="#795548" />
      </Svg>
    </View>
  );
}

// ─── Stars (for night variant) ──────────────────────────────
function Stars() {
  const positions = [
    { x: W * 0.08, y: 5 }, { x: W * 0.22, y: 12 },
    { x: W * 0.4, y: 4 }, { x: W * 0.55, y: 15 },
    { x: W * 0.7, y: 8 }, { x: W * 0.85, y: 3 },
    { x: W * 0.15, y: 22 }, { x: W * 0.6, y: 25 },
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: pos.x, top: pos.y,
            width: i % 3 === 0 ? 2.5 : 1.5,
            height: i % 3 === 0 ? 2.5 : 1.5,
            borderRadius: 1.5,
            backgroundColor: 'rgba(255,255,255,0.7)',
          }}
        />
      ))}
    </>
  );
}

// ─── Mini Person ────────────────────────────────────────────
function MiniPerson({ x, bodyColor, headColor }: { x: number; bodyColor: string; headColor: string }) {
  return (
    <View style={{ position: 'absolute', left: x, bottom: 2, alignItems: 'center', width: 16 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: headColor }} />
      <View style={{ width: 8, height: 10, borderRadius: 2, backgroundColor: bodyColor, marginTop: 1 }} />
      <View style={{ flexDirection: 'row', gap: 1.5 }}>
        <View style={{ width: 3, height: 7, borderRadius: 1, backgroundColor: bodyColor, opacity: 0.7 }} />
        <View style={{ width: 3, height: 7, borderRadius: 1, backgroundColor: bodyColor, opacity: 0.7 }} />
      </View>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function CityBackground({
  variant = 'day',
  opacity = 0.12,
  skylineOnly = false,
  heightFraction = 0.35,
  position = 'bottom',
}: CityBackgroundProps) {
  const palette = PALETTES[variant];
  const sceneH = H * heightFraction;
  const buildingBase = sceneH * 0.6;

  return (
    <View
      style={[
        styles.container,
        position === 'bottom' ? { bottom: 0 } : { top: 0 },
        { height: sceneH, opacity },
      ]}
      pointerEvents="none"
    >
      {/* Sky (only if not skylineOnly) */}
      {!skylineOnly && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.sky }]}>
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: sceneH * 0.3, backgroundColor: palette.skyBottom, opacity: 0.5,
          }} />

          {/* Celestial body */}
          {variant === 'night' ? (
            <View style={{ position: 'absolute', top: sceneH * 0.08, right: W * 0.15 }}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle cx={12} cy={12} r={10} fill={palette.celestial} />
                <Circle cx={8} cy={9} r={2} fill="rgba(200,200,180,0.3)" />
                <Circle cx={14} cy={15} r={1.5} fill="rgba(200,200,180,0.25)" />
              </Svg>
            </View>
          ) : (
            <View style={{
              position: 'absolute', top: sceneH * 0.1,
              right: variant === 'sunset' ? W * 0.1 : W * 0.2,
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: palette.celestial,
            }} />
          )}

          {/* Stars for night */}
          {variant === 'night' && <Stars />}

          {/* Clouds for day/sunset */}
          {variant !== 'night' && (
            <>
              <Svg width={50} height={20} viewBox="0 0 50 20" style={{ position: 'absolute', left: W * 0.05, top: sceneH * 0.12 }}>
                <Ellipse cx={20} cy={12} rx={18} ry={8} fill="rgba(255,255,255,0.6)" />
                <Ellipse cx={32} cy={10} rx={12} ry={7} fill="rgba(255,255,255,0.5)" />
              </Svg>
              <Svg width={40} height={16} viewBox="0 0 40 16" style={{ position: 'absolute', right: W * 0.15, top: sceneH * 0.18 }}>
                <Ellipse cx={16} cy={9} rx={14} ry={6} fill="rgba(255,255,255,0.5)" />
                <Ellipse cx={28} cy={8} rx={10} ry={5} fill="rgba(255,255,255,0.4)" />
              </Svg>
            </>
          )}
        </View>
      )}

      {/* Ground */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: sceneH * 0.4,
      }}>
        <View style={{ height: 3, backgroundColor: palette.sidewalk }} />
        <View style={{ flex: 1, backgroundColor: palette.ground }} />
      </View>

      {/* Buildings */}
      <View style={{
        position: 'absolute', bottom: sceneH * 0.4 - 1,
        left: 0, right: 0, height: buildingBase,
      }}>
        <MiniBuilding x={W * 0.00} w={W * 0.14} h={buildingBase * 0.65} color={palette.building1} windowColor={palette.window} windowLit={palette.windowLit} />
        <MiniBuilding x={W * 0.16} w={W * 0.18} h={buildingBase * 1.0} color={palette.building2} windowColor={palette.window} windowLit={palette.windowLit} />
        <MiniBuilding x={W * 0.36} w={W * 0.13} h={buildingBase * 0.55} color={palette.building1} windowColor={palette.window} windowLit={palette.windowLit} />
        <MiniBuilding x={W * 0.51} w={W * 0.19} h={buildingBase * 0.85} color={palette.building3} windowColor={palette.window} windowLit={palette.windowLit} />
        <MiniBuilding x={W * 0.72} w={W * 0.13} h={buildingBase * 0.7} color={palette.building2} windowColor={palette.window} windowLit={palette.windowLit} />
        <MiniBuilding x={W * 0.87} w={W * 0.14} h={buildingBase * 0.75} color={palette.building1} windowColor={palette.window} windowLit={palette.windowLit} />
      </View>

      {/* Trees */}
      <View style={{ position: 'absolute', bottom: sceneH * 0.4 - 2, left: 0, right: 0 }}>
        <MiniTree x={W * 0.33} color={palette.tree} />
        <MiniTree x={W * 0.48} color={palette.tree} scale={0.8} />
        <MiniTree x={W * 0.69} color={palette.tree} scale={0.9} />
      </View>

      {/* People */}
      <View style={{ position: 'absolute', bottom: sceneH * 0.4, left: 0, right: 0 }}>
        <MiniPerson x={W * 0.06} bodyColor="#42A5F5" headColor="#FFB74D" />
        <MiniPerson x={W * 0.42} bodyColor="#66BB6A" headColor="#FFB74D" />
        <MiniPerson x={W * 0.62} bodyColor="#FF7043" headColor="#FFB74D" />
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
