import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import HeaderLogo from '../components/HeaderLogo';
import { colors, Court, Reveal, Touch, ui } from '../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wide = useWindowDimensions().width > 760;

  async function signIn() {
    if (loading) return;
    if (!email.trim() || !password) { setError('Enter your email and password to sign in.'); return; }
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
    } catch (error: any) {
      setError(error.message || 'Could not sign in. Please try again.');
    } finally { setLoading(false); }
  }

  return <SafeAreaView style={styles.container} edges={['top']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.header}><HeaderLogo /><Text style={styles.headerNote}>FOR THE LOVE OF THE GAME</Text></View>
    <View style={[styles.layout, wide && { flexDirection: 'row', gap: 64 }]}>
      <Reveal style={styles.intro}><Text style={ui.eyebrow}>EVERY POINT COUNTS</Text><Text style={[styles.heroTitle, wide && { fontSize: 68, lineHeight: 70 }]}>Bring your{ '\n' }<Text style={{ color: colors.lime }}>game face.</Text></Text><Text style={styles.description}>Your players. Your rivalries. Your next win.{ '\n' }Keep it all at the table.</Text><Court compact={!wide} /></Reveal>
      <Reveal delay={160} style={styles.form}><Text style={styles.formEyebrow}>BACK AT THE TABLE</Text><Text style={styles.title}>Welcome back.</Text><Text style={styles.subtitle}>Sign in and get the next rally started.</Text>
        <Text style={styles.label}>Email address</Text><TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" accessibilityLabel="Email address" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text><View style={styles.passwordRow}><TextInput style={styles.passwordInput} placeholder="Your password" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" accessibilityLabel="Password" value={password} onChangeText={setPassword} onSubmitEditing={signIn} returnKeyType="go" /><Touch style={styles.eyeButton} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(v => !v)}><Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text></Touch></View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Touch style={[ui.primary, { marginTop: 24, opacity: loading ? 0.6 : 1 }]} onPress={signIn} disabled={loading}>{loading ? <ActivityIndicator color={colors.ink} /> : <Text style={ui.primaryText}>Let's play  →</Text>}</Touch>
        <View style={styles.formFooter}><View style={styles.dot} /><Text style={styles.footerText}>A little competition. A lot of good games.</Text></View>
      </Reveal>
    </View><Text style={styles.bottomNote}>PING SCORE  /  KEEP THE RALLY GOING.</Text>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 24, maxWidth: 1120, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 44 }, headerNote: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, maxWidth: 110, textAlign: 'right', lineHeight: 15 },
  layout: { flex: 1, justifyContent: 'center' }, intro: { flex: 1, justifyContent: 'center' }, heroTitle: { color: colors.text, fontSize: 48, lineHeight: 51, fontWeight: '800', letterSpacing: -2.5, marginTop: 8 }, description: { color: colors.muted, fontSize: 14, lineHeight: 23, marginTop: 18 },
  form: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 440, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 26, padding: 26 }, formEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 14 }, title: { fontSize: 29, fontWeight: '700', color: colors.text, letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 8, marginBottom: 25 }, label: { color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 9 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 15, marginBottom: 20, fontSize: 15, color: colors.text }, passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 13 }, passwordInput: { flex: 1, minWidth: 0, padding: 15, fontSize: 15, color: colors.text }, eyeButton: { padding: 14 }, eyeText: { fontSize: 11, color: colors.lime, fontWeight: '700' }, error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginTop: 12 },
  formFooter: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 23 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.lime }, footerText: { color: colors.muted, fontSize: 10, flexShrink: 1 }, bottomNote: { textAlign: 'center', color: colors.muted, fontSize: 8, letterSpacing: 2, marginTop: 38, marginBottom: 10 },
});
