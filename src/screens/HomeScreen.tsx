import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchPlayers, fetchRecentMatches } from '../lib/api';
import { ActiveMatchSnapshot, loadActiveMatch } from '../lib/activeMatch';
import { Match, Player } from '../lib/types';
import { useAuth } from '../state/AuthContext';
import { AppIcon, colors, Reveal, Touch } from '../components/ui';

export default function HomeScreen({ navigation }: { navigation: any }) {
  const wide = useWindowDimensions().width > 680;
  const { session } = useAuth();
  const firstName = session?.user?.email?.split('@')[0] ?? 'Player';
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [activeMatch, setActiveMatch] = useState<ActiveMatchSnapshot | null>(null);

  const loadRecentGames = useCallback(() => {
    setLoadingGames(true);
    if (session?.user.id) {
      loadActiveMatch(session.user.id).then(setActiveMatch).catch(() => setActiveMatch(null));
    } else {
      setActiveMatch(null);
    }
    Promise.all([fetchRecentMatches(3), fetchPlayers()])
      .then(([loadedMatches, loadedPlayers]) => {
        setMatches(loadedMatches);
        setPlayers(loadedPlayers);
      })
      .catch((error) => Alert.alert('Could not load recent games', error.message))
      .finally(() => setLoadingGames(false));
  }, [session?.user.id]);

  useFocusEffect(loadRecentGames);

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  function teamLabel(ids: string[]) {
    return ids.map((id) => playerById.get(id)?.name ?? 'Unknown player').join(' & ');
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Could not sign out', error.message);
  }

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Reveal style={styles.greetingRow}>
      <View><Text style={styles.greeting}>Hello,</Text><Text style={styles.name}>{firstName}!</Text><Text style={styles.tagline}>Ready for a game?</Text></View>
      <Touch accessibilityLabel="Sign out" style={styles.signOutButton} onPress={handleSignOut}>
        <AppIcon name="logout" size={23} color={colors.text} />
      </Touch>
    </Reveal>
    <View style={[styles.cards, wide && { flexDirection: 'row' }]}>
      <Reveal delay={60} style={{ flex: 1 }}>
        <Touch style={[styles.card, styles.cardGreen]} onPress={() => navigation.navigate('NewMatch')}>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconBox, { backgroundColor: colors.surface }]}><AppIcon name="table-tennis" size={28} color={colors.green} /></View>
            <View style={[styles.cardArrowCircle, { backgroundColor: colors.green }]}><AppIcon name="arrow-right" size={19} color={colors.ink} /></View>
          </View>
          <View><Text style={styles.cardTitle}>Quick Match</Text><Text style={styles.cardDescription}>Pick two sides and start scoring.</Text></View>
        </Touch>
      </Reveal>
      <Reveal delay={110} style={{ flex: 1 }}>
        <Touch style={[styles.card, styles.cardPurple]} onPress={() => navigation.navigate('Tournaments')}>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconBox, { backgroundColor: colors.surface }]}><AppIcon name="trophy-outline" size={28} color={colors.purple} /></View>
            <View style={[styles.cardArrowCircle, { backgroundColor: colors.purple }]}><AppIcon name="arrow-right" size={19} color={colors.ink} /></View>
          </View>
          <View><Text style={styles.cardTitle}>Round Robin</Text><Text style={styles.cardDescription}>Build a lineup and track every result.</Text></View>
        </Touch>
      </Reveal>
    </View>
    {activeMatch && (
      <Reveal delay={145}>
        <Touch style={styles.resumeCard} onPress={() => navigation.navigate('LiveMatch', { ...activeMatch.params, restoredMatch: activeMatch.match })}>
          <View style={styles.resumeIcon}><AppIcon name="play" size={22} color={colors.ink} /></View>
          <View style={styles.resumeDetails}>
            <Text style={styles.resumeTitle}>{activeMatch.match.winner ? 'Finish saved match' : 'Resume match'}</Text>
            <Text style={styles.resumeMeta}>{activeMatch.params.mode === 'singles' ? 'Singles' : 'Doubles'} · {activeMatch.match.scoreA} - {activeMatch.match.scoreB}</Text>
          </View>
          <AppIcon name="chevron-right" size={22} color={colors.green} />
        </Touch>
      </Reveal>
    )}
    <Reveal delay={160} style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent Games</Text><Touch onPress={() => navigation.navigate('Games')}><Text style={styles.seeAll}>See All</Text></Touch></Reveal>
    {loadingGames ? (
      <ActivityIndicator style={styles.gamesLoader} color={colors.green} />
    ) : matches.length === 0 ? (
      <Reveal delay={200}><Touch style={styles.emptyRow} onPress={() => navigation.navigate('NewMatch')}><Text style={styles.emptyRowText}>Play your first match to see it here</Text><AppIcon name="arrow-right" size={18} color={colors.muted} /></Touch></Reveal>
    ) : (
      matches.slice(0, 3).map((match, index) => {
        const teamAWon = match.winner === 'a';
        return (
          <Reveal key={match.id} delay={200 + index * 45}>
            <Touch style={styles.gameCard} onPress={() => navigation.navigate('Games')}>
              <View style={styles.gameIconBox}><AppIcon name="scoreboard-outline" size={23} color={colors.green} /></View>
              <View style={styles.gameDetails}>
                <Text style={styles.gameMatchup} numberOfLines={1}>
                  <Text style={teamAWon ? styles.gameWinner : undefined}>{teamLabel(match.team_a_player_ids)}</Text>
                  <Text style={styles.gameVs}> vs </Text>
                  <Text style={!teamAWon ? styles.gameWinner : undefined}>{teamLabel(match.team_b_player_ids)}</Text>
                </Text>
                <Text style={styles.gameMeta}>{new Date(match.played_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.gameScore}>{match.team_a_score} - {match.team_b_score}</Text>
              <AppIcon name="chevron-right" size={20} color={colors.muted} />
            </Touch>
          </Reveal>
        );
      })
    )}
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingTop: 20, maxWidth: 1080, alignSelf: 'center', width: '100%' },
  greetingRow: { marginBottom: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  greeting: { color: colors.muted, fontSize: 20, fontWeight: '500' }, name: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 }, tagline: { color: colors.muted, fontSize: 14, marginTop: 4 },
  signOutButton: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cards: { gap: 14, marginBottom: 30 },
  card: { flex: 1, borderRadius: 24, padding: 20, minHeight: 176, justifyContent: 'space-between' },
  cardGreen: { backgroundColor: colors.greenSoft }, cardPurple: { backgroundColor: colors.purpleSoft },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIconBox: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }, cardDescription: { color: colors.muted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  cardArrowCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  resumeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#BFE4CD', backgroundColor: colors.greenSoft, borderRadius: 18, padding: 13, marginBottom: 24 },
  resumeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  resumeDetails: { flex: 1 },
  resumeTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  resumeMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }, seeAll: { color: colors.green, fontSize: 13, fontWeight: '700' },
  gamesLoader: { height: 72 },
  emptyRow: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 18, padding: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: colors.surface },
  emptyRowText: { color: colors.muted, fontSize: 13.5 },
  gameCard: { minHeight: 68, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 11 },
  gameIconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  gameDetails: { flex: 1, minWidth: 0 },
  gameMatchup: { color: colors.text, fontSize: 14, fontWeight: '500' },
  gameWinner: { fontWeight: '800' },
  gameVs: { color: colors.muted, fontWeight: '400' },
  gameMeta: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
  gameScore: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
