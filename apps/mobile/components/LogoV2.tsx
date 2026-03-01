import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { COLORS } from '../constants/theme';

interface LogoV2Props {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'horizontal' | 'vertical';
}

const SIZES = {
  small: { icon: 40, fontSize: 20, gap: 8 },
  medium: { icon: 64, fontSize: 32, gap: 12 },
  large: { icon: 88, fontSize: 42, gap: 16 },
};

export function LogoV2({ size = 'medium', showText = true, variant = 'horizontal' }: LogoV2Props) {
  const s = SIZES[size];

  return (
    <View style={[styles.container, variant === 'vertical' && styles.vertical]}>
      <View style={{ width: s.icon, height: s.icon }}>
        <Svg viewBox="0 0 48 48" width={s.icon} height={s.icon}>
          {/* Building 1 (shorter) */}
          <Rect x="8" y="16" width="14" height="24" rx={2} fill={COLORS.primary} />
          {/* Building 2 (taller) */}
          <Rect x="26" y="8" width="14" height="32" rx={2} fill={COLORS.primaryDark} />
          {/* Windows building 1 */}
          <Rect x="12" y="20" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="17" y="20" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="12" y="26" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="17" y="26" width="3" height="3" rx={0.5} fill="white" />
          {/* Windows building 2 */}
          <Rect x="30" y="12" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="35" y="12" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="30" y="18" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="35" y="18" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="30" y="24" width="3" height="3" rx={0.5} fill="white" />
          <Rect x="35" y="24" width="3" height="3" rx={0.5} fill="white" />
          {/* Orange dots (people/services) */}
          <Circle cx="15" cy="36" r={3} fill={COLORS.secondary} />
          <Circle cx="33" cy="36" r={3} fill={COLORS.secondary} />
        </Svg>
      </View>
      {showText && (
        <Text style={[styles.wordmark, { fontSize: s.fontSize, marginLeft: variant === 'horizontal' ? s.gap : 0, marginTop: variant === 'vertical' ? s.gap : 0 }]}>
          Condo<Text style={styles.daily}>Daily</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vertical: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -1,
  },
  daily: {
    color: COLORS.secondary,
  },
});
