import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, Court, Reveal, Touch, ui } from '../components/ui';

export default function HomeScreen({ navigation }: { navigation: any }) {
  const wide = useWindowDimensions().width > 680;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Reveal style={styles.topline}><Text style={ui.eyebrow}>YOUR TABLE. YOUR GAME.</Text><View style={styles.status}><View style={styles.dot} /><Text style={styles.statusText}>LET'S PLAY</Text></View></Reveal>
    <Reveal delay={60} style={[styles.hero, wide && styles.heroWide]}>
      <View style={styles.heroCopy}><Text style={styles.kicker}>THE NEXT POINT IS YOURS</Text><Text style={[styles.title, wide && { fontSize: 64, lineHeight: 66 }]}>Less counting.{ '\n' }More <Text style={styles.titleAccent}>playing.</Text></Text><Text style={styles.description}>From the first serve to match point.{ '\n' }Keep every rally in the game.</Text><Touch style={styles.start} onPress={() => navigation.navigate('NewMatch')}><Text style={ui.primaryText}>Start a match</Text><Text style={styles.startArrow}>↗</Text></Touch></View>
      <View style={wide ? { width: 300 } : undefined}><Court /><View style={styles.courtCaption}><Text style={styles.caption}>SINGLES / DOUBLES</Text><Text style={styles.caption}>01 — ∞</Text></View></View>
    </Reveal>
    <Reveal delay={130} style={styles.sectionRow}><Text style={styles.sectionTitle}>Beyond the rally</Text><Text style={styles.sectionAside}>MAKE IT A MATCH DAY</Text></Reveal>
    <View style={[styles.cards, wide && { flexDirection: 'row' }]}>
      <Reveal delay={180} style={{ flex: 1 }}><Touch style={styles.tournament} onPress={() => navigation.navigate('Tournaments')}><View style={styles.cardTop}><Text style={styles.cardIcon}>♜</Text><Text style={styles.arrow}>↗</Text></View><Text style={styles.cardTitle}>Raise the stakes.</Text><Text style={styles.cardDescription}>Round robins. Rivalries. One champion.</Text><Text style={styles.cardLink}>Tournaments  →</Text></Touch></Reveal>
      <View style={styles.smallCards}>
        <Reveal delay={240} style={{ flex: 1 }}><Touch style={styles.smallCard} onPress={() => navigation.navigate('Players')}><View style={[styles.iconBox, { backgroundColor: colors.blueSoft }]}><Text style={[styles.smallIcon, { color: colors.blue }]}>♟</Text></View><View style={{ flex: 1 }}><Text style={styles.smallTitle}>Your players</Text><Text style={styles.smallDescription}>Get the crew together</Text></View><Text style={styles.arrow}>↗</Text></Touch></Reveal>
        <Reveal delay={300} style={{ flex: 1 }}><Touch style={styles.smallCard} onPress={() => navigation.navigate('History')}><View style={styles.iconBox}><Text style={styles.smallIcon}>↺</Text></View><View style={{ flex: 1 }}><Text style={styles.smallTitle}>Match history</Text><Text style={styles.smallDescription}>Every result, remembered</Text></View><Text style={styles.arrow}>↗</Text></Touch></Reveal>
      </View>
    </View>
    <View style={styles.footer}><Text style={styles.footerText}>KEEP THE RALLY GOING.</Text><Touch onPress={() => supabase.auth.signOut()} style={{ padding: 12 }}><Text style={styles.signOut}>Sign out ↗</Text></Touch></View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingTop: 30, maxWidth: 1080, alignSelf: 'center', width: '100%' },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 },
  status: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 10 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime }, statusText: { color: colors.muted, fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  hero: { borderRadius: 28, borderWidth: 1, borderColor: '#354630', backgroundColor: '#18231A', overflow: 'hidden', padding: 25 }, heroWide: { flexDirection: 'row', alignItems: 'center', padding: 36, minHeight: 350 }, heroCopy: { flex: 1 },
  kicker: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 20 }, title: { color: colors.text, fontSize: 43, lineHeight: 47, letterSpacing: -2.4, fontWeight: '800' }, titleAccent: { color: colors.lime },
  description: { color: '#B0BBAA', fontSize: 14, lineHeight: 23, marginTop: 17 }, start: { ...ui.primary, flexDirection: 'row', justifyContent: 'space-between', marginTop: 27, maxWidth: 280, width: '100%' }, startArrow: { color: colors.ink, fontSize: 23 },
  courtCaption: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }, caption: { color: '#92A18B', fontSize: 9, letterSpacing: 1.7 },
  sectionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 34, marginBottom: 17 }, sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '700', letterSpacing: -0.5 }, sectionAside: { color: colors.muted, fontSize: 8, letterSpacing: 1.5 },
  cards: { gap: 14 }, tournament: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 24, borderRadius: 23, flex: 1 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, cardIcon: { color: colors.lime, fontSize: 32 }, arrow: { color: colors.muted, fontSize: 22 }, cardTitle: { color: colors.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 }, cardDescription: { color: colors.muted, fontSize: 13, marginTop: 8, lineHeight: 20 }, cardLink: { color: colors.lime, fontSize: 13, fontWeight: '700', marginTop: 24 },
  smallCards: { flex: 1, gap: 14 }, smallCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, minHeight: 104, backgroundColor: colors.surface, borderRadius: 23, borderWidth: 1, borderColor: colors.border }, iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }, smallIcon: { color: colors.lime, fontSize: 28 }, smallTitle: { color: colors.text, fontSize: 17, fontWeight: '700' }, smallDescription: { color: colors.muted, fontSize: 12, marginTop: 5 },
  footer: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, footerText: { color: colors.muted, fontSize: 8, letterSpacing: 2 }, signOut: { color: colors.muted, fontSize: 12 },
});
