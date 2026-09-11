import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { colors, Reveal, Touch, ui } from '../components/ui';

export default function HomeScreen({ navigation }: { navigation: any }) {
  const wide = useWindowDimensions().width > 680;
  const { session } = useAuth();
  const firstName = session?.user?.email?.split('@')[0] ?? 'Player';

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Reveal style={styles.greetingRow}>
      <View><Text style={styles.greeting}>Hello,</Text><Text style={styles.name}>{firstName}!</Text><Text style={styles.tagline}>Ready for a game?</Text></View>
    </Reveal>
    <View style={[styles.cards, wide && { flexDirection: 'row' }]}>
      <Reveal delay={60} style={{ flex: 1 }}><Touch style={[styles.card, styles.cardGreen]} onPress={() => navigation.navigate('NewMatch')}><Text style={styles.cardIcon}>🏓</Text><Text style={styles.cardTitle}>Quick Match</Text><Text style={styles.cardDescription}>Keep score for a casual game</Text><View style={[styles.cardArrowCircle, { backgroundColor: colors.green }]}><Text style={styles.cardArrow}>→</Text></View></Touch></Reveal>
      <Reveal delay={110} style={{ flex: 1 }}><Touch style={[styles.card, styles.cardPurple]} onPress={() => navigation.navigate('Tournaments')}><Text style={styles.cardIcon}>🏆</Text><Text style={styles.cardTitle}>Round Robin</Text><Text style={styles.cardDescription}>Create a tournament and let the games begin</Text><View style={[styles.cardArrowCircle, { backgroundColor: colors.purple }]}><Text style={styles.cardArrow}>→</Text></View></Touch></Reveal>
    </View>
    <Reveal delay={160} style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent Games</Text><Touch onPress={() => navigation.navigate('Games')}><Text style={styles.seeAll}>See All</Text></Touch></Reveal>
    <Reveal delay={200}><Touch style={styles.emptyRow} onPress={() => navigation.navigate('NewMatch')}><Text style={styles.emptyRowText}>Play your first match to see it here →</Text></Touch></Reveal>
    <View style={styles.footer}><Touch onPress={() => supabase.auth.signOut()} style={{ padding: 12 }}><Text style={styles.signOut}>Sign out</Text></Touch></View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingTop: 20, maxWidth: 1080, alignSelf: 'center', width: '100%' },
  greetingRow: { marginBottom: 24 },
  greeting: { color: colors.muted, fontSize: 20, fontWeight: '500' }, name: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 }, tagline: { color: colors.muted, fontSize: 14, marginTop: 4 },
  cards: { gap: 14, marginBottom: 30 },
  card: { flex: 1, borderRadius: 24, padding: 20, minHeight: 150, justifyContent: 'space-between' },
  cardGreen: { backgroundColor: colors.greenSoft }, cardPurple: { backgroundColor: colors.purpleSoft },
  cardIcon: { fontSize: 30, marginBottom: 8 }, cardTitle: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 }, cardDescription: { color: colors.muted, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  cardArrowCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginTop: 14 }, cardArrow: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }, seeAll: { color: colors.green, fontSize: 13, fontWeight: '700' },
  emptyRow: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 18, padding: 20, alignItems: 'center', backgroundColor: colors.surface },
  emptyRowText: { color: colors.muted, fontSize: 13.5 },
  footer: { marginTop: 30, alignItems: 'center' }, signOut: { color: colors.muted, fontSize: 13 },
});
