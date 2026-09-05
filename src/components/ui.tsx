import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export const colors = {
  background: '#0B100F', surface: '#151D1A', raised: '#1E2923', border: '#2B3931',
  text: '#F4F7EE', muted: '#9CAA9E', lime: '#D4F77D', limeSoft: '#263820',
  blue: '#A8D8EE', blueSoft: '#1C3038', ink: '#13200D', danger: '#FF9C91',
};

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); };
  }, []);
  return reduced;
}

export function Reveal({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const value = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, duration: 440, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, delay, value]);
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

export function Touch({ children, style, disabled, ...props }: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const AnimatedPressable = animatedPressable;
  function animate(toValue: number) {
    if (reduced) return;
    Animated.spring(scale, { toValue, speed: 35, bounciness: 3, useNativeDriver: true }).start();
  }
  return <AnimatedPressable accessibilityRole="button" {...props} disabled={disabled} accessibilityState={{ ...props.accessibilityState, disabled: Boolean(disabled) }} onPressIn={event => { animate(0.975); props.onPressIn?.(event); }} onPressOut={event => { animate(1); props.onPressOut?.(event); }} style={[style, { transform: [{ scale }] }]}>{children}</AnimatedPressable>;
}
const animatedPressable = Animated.createAnimatedComponent(Pressable);

export function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <Reveal style={ui.heading}><Text style={ui.eyebrow}>{eyebrow}</Text><Text style={ui.title}>{title}</Text>{subtitle && <Text style={ui.subtitle}>{subtitle}</Text>}</Reveal>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Reveal style={ui.empty}><View style={ui.emptyMark}><Text style={{ color: colors.lime, fontSize: 30 }}>◎</Text></View><Text style={ui.emptyTitle}>{title}</Text><Text style={ui.emptyDetail}>{detail}</Text></Reveal>;
}

export function Court({ compact = false }: { compact?: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { progress.setValue(0.5); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [reduced, progress]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[court.scene, compact && { height: 164 }]}>
    <View style={court.orbit} />
    <View style={court.table}><View style={court.centerLine} /><View style={court.net} /><View style={[court.paddle, { left: 18, top: 24, backgroundColor: colors.lime, transform: [{ rotate: '-35deg' }] }]} /><View style={[court.paddle, { right: 18, bottom: 24, backgroundColor: colors.blue, transform: [{ rotate: '145deg' }] }]} /><Animated.View style={[court.ball, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-65, 65] }) }, { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-25, -48, 25] }) }, { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] }) }] }]} /></View>
  </View>;
}

export const ui = StyleSheet.create({
  heading: { marginBottom: 26, marginTop: 12 },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 2.8, marginBottom: 10 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.3 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 9 },
  content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  primary: { backgroundColor: colors.lime, borderRadius: 16, minHeight: 56, padding: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  empty: { paddingVertical: 42, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 22, marginTop: 8 },
  emptyMark: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.limeSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyDetail: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 8, maxWidth: 300 },
});
const court = StyleSheet.create({
  scene: { height: 230, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbit: { position: 'absolute', width: 265, height: 265, borderRadius: 140, borderWidth: 1, borderColor: '#314231' },
  table: { width: 236, height: 138, borderRadius: 7, borderWidth: 2, borderColor: '#71876A', backgroundColor: '#21382A', transform: [{ rotate: '-12deg' }] },
  centerLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#71876A' },
  net: { position: 'absolute', left: '50%', top: -9, bottom: -9, width: 2, backgroundColor: '#CADABB' },
  paddle: { position: 'absolute', width: 40, height: 47, borderRadius: 20, borderBottomWidth: 10, borderBottomColor: '#A08B66' },
  ball: { position: 'absolute', left: '50%', top: '50%', width: 13, height: 13, borderRadius: 7, backgroundColor: '#FFFFFF', shadowColor: '#D4F77D', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
});
