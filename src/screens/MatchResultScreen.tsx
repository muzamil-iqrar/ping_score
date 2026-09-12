import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon, colors, Reveal, Touch, ui, useReducedMotion } from '../components/ui';

type Props = { navigation: any; route: { params: { winnerLabel: string; teamALabel?: string; teamBLabel?: string; scoreA: number; scoreB: number; tournamentId?: string } } };

export default function MatchResultScreen({ navigation, route }: any) {
  const { winnerLabel, teamALabel = 'Team A', teamBLabel = 'Team B', scoreA, scoreB, tournamentId }: Props['route']['params'] = route.params;
  const teamAWon = scoreA > scoreB;
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, progress]);
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Reveal><Text style={[ui.eyebrow, { textAlign: 'center' }]}>THAT'S A WRAP</Text></Reveal>
    <View style={styles.celebration} accessible={false}>
      <View style={styles.outerRing} /><View style={styles.innerRing} />
      {Array.from({ length: 12 }, (_, i) => { const angle = i * Math.PI / 6; return <Animated.View key={i} style={[styles.confetti, { backgroundColor: i % 2 ? colors.purple : colors.green, opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 145] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 125] }) }, { rotate: `${i * 33}deg` }] }]} />; })}
      <Reveal delay={100} style={styles.trophyCircle}><AppIcon name="trophy-variant-outline" size={58} color={colors.green} /></Reveal>
    </View>
    <Reveal delay={200}><Text style={styles.winner}>{winnerLabel}</Text><Text style={styles.winnerSubtitle}>takes the win.</Text><Text style={styles.description}>Good game. Great finish.</Text></Reveal>
    <Reveal delay={320} style={styles.scoreboard}><View style={styles.scoreSide}><Text style={styles.teamLabel}>TEAM A</Text><Text style={[styles.score, { color: colors.green }]}>{scoreA}</Text></View><Text style={styles.scoreDivider}>:</Text><View style={styles.scoreSide}><Text style={styles.teamLabel}>TEAM B</Text><Text style={[styles.score, { color: colors.red }]}>{scoreB}</Text></View><Text style={styles.finalLabel}>FINAL SCORE</Text></Reveal>
    {tournamentId && <Reveal delay={380} style={styles.impactCard}>
      <Text style={styles.impactHeading}>TOURNAMENT POINTS</Text>
      <View style={styles.impactRow}>
        <View style={styles.impactTeam}><Text style={styles.impactName} numberOfLines={1}>{teamALabel}</Text><Text style={styles.impactOutcome}>{teamAWon ? 'Win recorded' : 'Played loss recorded'}</Text></View>
        <Text style={[styles.impactValue, { color: teamAWon ? colors.green : colors.purple }]}>{teamAWon ? '+2 tournament points' : '+1 tournament point'}</Text>
      </View>
      <View style={[styles.impactRow, styles.impactRowBorder]}>
        <View style={styles.impactTeam}><Text style={styles.impactName} numberOfLines={1}>{teamBLabel}</Text><Text style={styles.impactOutcome}>{teamAWon ? 'Played loss recorded' : 'Win recorded'}</Text></View>
        <Text style={[styles.impactValue, { color: teamAWon ? colors.purple : colors.green }]}>{teamAWon ? '+1 tournament point' : '+2 tournament points'}</Text>
      </View>
    </Reveal>}
    <Reveal delay={420} style={{ width: '100%' }}><Touch style={[ui.primary, styles.primaryAction]} onPress={() => navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, tournamentId ? { name: 'Tournament', params: { tournamentId } } : { name: 'NewMatch' }] })}><Text style={ui.primaryText}>{tournamentId ? 'Back to tournament' : 'Run it back'}</Text><AppIcon name="arrow-right" size={20} color={colors.ink} /></Touch><Touch style={styles.homeButton} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}><Text style={styles.homeText}>Back to home</Text></Touch></Reveal>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28, maxWidth: 540, width: '100%', alignSelf: 'center' },
  celebration: { width: 290, height: 200, justifyContent: 'center', alignItems: 'center', marginTop: 8 }, outerRing: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: colors.border }, innerRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: '#35492C' }, trophyCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.limeSoft, justifyContent: 'center', alignItems: 'center' }, confetti: { position: 'absolute', width: 7, height: 12, borderRadius: 2 },
  winner: { fontSize: 36, fontWeight: '800', letterSpacing: -1, color: colors.text, textAlign: 'center', marginTop: 12 }, winnerSubtitle: { fontSize: 33, fontWeight: '700', color: colors.lime, textAlign: 'center', letterSpacing: -1 }, description: { color: colors.muted, textAlign: 'center', fontSize: 14, marginTop: 14 },
  scoreboard: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 23, paddingTop: 22, paddingBottom: 43, marginTop: 30, marginBottom: 18 }, scoreSide: { flex: 1, alignItems: 'center' }, teamLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.8, fontWeight: '800' }, score: { fontSize: 58, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'], marginTop: 4 }, scoreDivider: { color: colors.muted, fontSize: 28 }, finalLabel: { position: 'absolute', bottom: 16, color: colors.muted, fontSize: 8, letterSpacing: 2 },
  impactCard: { width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, marginBottom: 24 },
  impactHeading: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  impactRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  impactTeam: { flex: 1, minWidth: 0 },
  impactName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  impactOutcome: { color: colors.muted, fontSize: 12, marginTop: 3 },
  impactValue: { fontSize: 13, fontWeight: '800' },
  primaryAction: { flexDirection: 'row', gap: 8 }, homeButton: { alignItems: 'center', padding: 18, marginTop: 4 }, homeText: { color: colors.muted, fontSize: 13 },
});
