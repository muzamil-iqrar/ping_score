import { ComponentProps, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/**
 * Destructive confirm dialog. react-native-web's Alert.alert() is a no-op, so on web this
 * falls back to window.confirm — otherwise Cancel/Delete buttons silently do nothing in a browser.
 */
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Message text for a caught value. Supabase/network rejections are not always Error
 * instances, and Alert.alert() throws on an undefined message — so never read .message directly.
 */
export function errorMessage(error: unknown): string {
  if (typeof error === 'string' && error) return error;
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message ? message : 'Something went wrong. Please try again.';
}

export const colors = {
  background: '#F7F8F6', surface: '#FFFFFF', raised: '#FFFFFF', border: '#E7EAE4',
  text: '#15201C', muted: '#828E86', green: '#1F9254', greenSoft: '#E3F5EA', red: '#E0453C', redSoft: '#FCE7E5',
  purple: '#6C5CE7', purpleSoft: '#EEEBFC', blue: '#2E86C1', blueSoft: '#E5F1F9', ink: '#FFFFFF', danger: '#E0453C',
  lime: '#1F9254', limeSoft: '#E3F5EA',
};

type AppIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function AppIcon({ name, size = 24, color = colors.text, style }: { name: AppIconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}

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
  return <Reveal style={ui.empty}><View style={ui.emptyMark}><AppIcon name="table-tennis" size={30} color={colors.green} /></View><Text style={ui.emptyTitle}>{title}</Text><Text style={ui.emptyDetail}>{detail}</Text></Reveal>;
}

export const ui = StyleSheet.create({
  heading: { marginBottom: 26, marginTop: 12 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 2.8, marginBottom: 10 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.3 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 9 },
  content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  primary: { backgroundColor: colors.text, borderRadius: 16, minHeight: 56, padding: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  empty: { paddingVertical: 42, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 22, marginTop: 8 },
  emptyMark: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.greenSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyDetail: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 8, maxWidth: 300 },
});
