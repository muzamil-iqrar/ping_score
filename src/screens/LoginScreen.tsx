import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import HeaderLogo from '../components/HeaderLogo';
import { AppIcon, colors, Reveal, Touch, ui } from '../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <Image source={require('../../assets/login-table-tennis-3d.png')} resizeMode="cover" accessible={false} style={styles.backgroundArt} />
    <View style={styles.backdrop} />
    <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={styles.header}><HeaderLogo /><Text style={styles.headerNote}>FOR THE LOVE OF THE GAME</Text></View>
        <Text style={styles.heroTitle}>Bring your{'\n'}<Text style={{ color: colors.lime }}>game face.</Text></Text>
        <Text style={styles.description}>Your players. Your rivalries. Your next win.{'\n'}Keep it all at the table.</Text>
        <View style={styles.formSlot}><Reveal delay={100} style={styles.form}>
        <Text style={styles.label}>Email address</Text><TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" accessibilityLabel="Email address" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text><View style={styles.passwordRow}><TextInput style={styles.passwordInput} placeholder="Your password" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" accessibilityLabel="Password" value={password} onChangeText={setPassword} onSubmitEditing={signIn} returnKeyType="go" /><Touch style={styles.eyeButton} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(v => !v)}><Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text></Touch></View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Touch style={[ui.primary, styles.signInButton, { opacity: loading ? 0.6 : 1 }]} onPress={signIn} disabled={loading}>{loading ? <ActivityIndicator color={colors.ink} /> : <><Text style={ui.primaryText}>Sign in</Text><AppIcon name="arrow-right" size={20} color={colors.ink} /></>}</Touch>
      </Reveal></View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backgroundArt: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0.5 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(247, 248, 246, 0.38)' },
  keyboardView: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 20 },
  headerNote: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, maxWidth: 110, textAlign: 'right', lineHeight: 15 },
  heroTitle: { color: colors.text, fontSize: 40, lineHeight: 43, fontWeight: '800', letterSpacing: -2, marginTop: 24, marginBottom: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  formSlot: { flex: 1, justifyContent: 'center', paddingVertical: 14 },
  form: { alignSelf: 'center', width: '100%', maxWidth: 420, backgroundColor: 'rgba(255, 255, 255, 0.94)', borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 22 },
  label: { color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 14, marginBottom: 16, fontSize: 15, color: colors.text }, passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 13 }, passwordInput: { flex: 1, minWidth: 0, padding: 14, fontSize: 15, color: colors.text }, eyeButton: { padding: 14 }, eyeText: { fontSize: 11, color: colors.lime, fontWeight: '700' }, error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginTop: 12 },
  signInButton: { marginTop: 20, flexDirection: 'row', gap: 8 },
});
