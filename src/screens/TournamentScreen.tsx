import { colors, Reveal, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { fetchPlayers, fetchTournament } from '../lib/api';
import { Player, Tournament, TournamentEntry, TournamentMatch } from '../lib/types';
import { calculateStandings } from '../state/tournamentEngine';

type TournamentData = {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
};

type SubTab = 'standings' | 'matches' | 'players';

export default function TournamentScreen({ navigation, route }: any) {
  const tournamentId: string = route.params.tournamentId;
  const [data, setData] = useState<TournamentData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [tab, setTab] = useState<SubTab>('standings');
  const navigatingFixtureId = useRef<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    navigatingFixtureId.current = null;
    Promise.all([fetchTournament(tournamentId), fetchPlayers()])
      .then(([tournamentData, loadedPlayers]) => {
        setData(tournamentData);
        setPlayers(loadedPlayers);
      })
      .catch((error) => Alert.alert('Could not load tournament', error.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  useFocusEffect(load);

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const entryById = useMemo(() => new Map(data?.entries.map((entry) => [entry.id, entry]) ?? []), [data]);
  const standings = useMemo(
    () => calculateStandings(data?.entries.map((entry) => entry.id) ?? [], data?.matches ?? []),
    [data]
  );
  const rounds = useMemo(() => {
    const grouped = new Map<number, TournamentMatch[]>();
    data?.matches.forEach((match) => {
      grouped.set(match.round_number, [...(grouped.get(match.round_number) ?? []), match]);
    });
    return Array.from(grouped.entries()).map(([round, matches]) => ({ round, matches }));
  }, [data]);

  function entryLabel(entryId: string) {
    const entry = entryById.get(entryId);
    if (!entry) return '?';
    return entry.player_ids.map((playerId) => playerById.get(playerId)?.name ?? '?').join(' & ');
  }

  function playFixture(fixture: TournamentMatch) {
    if (!data || fixture.winner_entry_id || navigatingFixtureId.current === fixture.id) return;
    const teamA = entryById.get(fixture.team_a_entry_id);
    const teamB = entryById.get(fixture.team_b_entry_id);
    if (!teamA || !teamB) return;
    navigatingFixtureId.current = fixture.id;
    navigation.navigate('LiveMatch', {
      mode: data.tournament.mode,
      pointTarget: data.tournament.point_target,
      serveInterval: data.tournament.serve_interval,
      teamA: teamA.player_ids,
      teamB: teamB.player_ids,
      players,
      tournamentId,
      tournamentMatchId: fixture.id,
      teamAEntryId: fixture.team_a_entry_id,
      teamBEntryId: fixture.team_b_entry_id,
    });
  }

  function shareTournament() {
    if (!data) return;
    const lines = standings.map((s) => `${s.rank}. ${entryLabel(s.entryId)} — ${s.wins}W ${s.played - s.wins}L`);
    Share.share({
      message: `${data.tournament.name}\n${data.tournament.mode === 'singles' ? 'Singles' : 'Doubles'} · Round robin\n\n${lines.join('\n')}`,
    }).catch((error) => Alert.alert('Could not share tournament', error.message));
  }

  if (loading && !data) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.green} /></View>;
  }
  if (!data) return null;

  const pendingFixture = data.matches.find((match) => !match.winner_entry_id);
  const complete = !pendingFixture;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}><Text style={styles.cardIcon}>🏆</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.tournament.name}</Text>
            <Text style={styles.meta}>
              {data.entries.length} players · {data.tournament.mode === 'singles' ? 'Singles' : 'Doubles'} · Round robin
            </Text>
          </View>
          <TouchableOpacity style={styles.rulesButton} onPress={() => setRulesVisible(true)}>
            <Text style={styles.rulesButtonText}>✎</Text>
          </TouchableOpacity>
        </View>
      </Reveal>

      {complete && standings[0] && standings[0].rank === 1 && standings[1]?.rank !== 1 && (
        <View style={styles.championCard}>
          <Text style={styles.championLabel}>TOURNAMENT WINNER</Text>
          <Text style={styles.championName}>🏆 {entryLabel(standings[0].entryId)}</Text>
        </View>
      )}

      {complete && standings[0] && standings[1]?.rank === 1 && (
        <View style={styles.tiedCard}>
          <Text style={styles.tiedTitle}>Tournament tied</Text>
          <Text style={styles.tiedText}>The top teams have the same wins, point difference, and points scored.</Text>
        </View>
      )}

      {pendingFixture && (
        <TouchableOpacity style={styles.nextButton} onPress={() => playFixture(pendingFixture)}>
          <Text style={styles.nextButtonText}>Play next match</Text>
          <Text style={styles.nextMatchText}>{entryLabel(pendingFixture.team_a_entry_id)} vs {entryLabel(pendingFixture.team_b_entry_id)}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.tabBar}>
        {(['standings', 'matches', 'players'] as SubTab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabButton, tab === t && styles.tabButtonActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabButtonText, tab === t && styles.tabButtonTextActive]}>{t === 'standings' ? 'Standings' : t === 'matches' ? 'Matches' : 'Players'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'standings' && (
        <>
          <View style={styles.standingsCard}>
            <View style={[styles.standingRow, styles.standingHeader]}>
              <Text style={[styles.rank, styles.headerText]}>#</Text>
              <Text style={[styles.team, styles.headerText]}>Player</Text>
              <Text style={[styles.stat, styles.headerText]}>W</Text>
              <Text style={[styles.stat, styles.headerText]}>L</Text>
              <Text style={[styles.stat, styles.headerText]}>Pts</Text>
            </View>
            {standings.map((standing) => (
              <View key={standing.entryId} style={styles.standingRow}>
                <Text style={styles.rank}>{standing.rank}</Text>
                <Text style={styles.team} numberOfLines={1}>{entryLabel(standing.entryId)}</Text>
                <Text style={styles.stat}>{standing.wins}</Text>
                <Text style={styles.stat}>{standing.losses}</Text>
                <Text style={styles.stat}>{standing.pointsFor}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.tieBreakText}>W = wins. L = losses. Pts = total points scored. Ties are broken by point difference.</Text>
        </>
      )}

      {tab === 'matches' && rounds.map(({ round, matches }) => (
        <View key={round} style={styles.round}>
          <Text style={styles.roundTitle}>Round {round}</Text>
          {matches.map((fixture) => {
            const completeFixture = Boolean(fixture.winner_entry_id);
            const teamAWon = fixture.winner_entry_id === fixture.team_a_entry_id;
            return (
              <TouchableOpacity
                key={fixture.id}
                style={[styles.fixture, completeFixture && styles.fixtureComplete]}
                onPress={() => playFixture(fixture)}
                disabled={completeFixture}
              >
                <View style={styles.fixtureTeams}>
                  <Text style={[styles.fixtureTeam, teamAWon && styles.fixtureWinner]}>{entryLabel(fixture.team_a_entry_id)}</Text>
                  <Text style={[styles.fixtureTeam, !teamAWon && completeFixture && styles.fixtureWinner]}>{entryLabel(fixture.team_b_entry_id)}</Text>
                </View>
                <View style={styles.fixtureRight}>
                  {completeFixture ? (
                    <Text style={styles.fixtureScore}>{fixture.team_a_score} - {fixture.team_b_score}</Text>
                  ) : (
                    <Text style={styles.playLabel}>Play</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {tab === 'players' && (
        <View style={styles.standingsCard}>
          {data.entries.map((entry) => (
            <View key={entry.id} style={styles.playerRow}>
              <Text style={styles.playerRowIcon}>{playerById.get(entry.player_ids[0])?.icon ?? '🏓'}</Text>
              <Text style={styles.playerRowName}>{entryLabel(entry.id)}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.shareButton} onPress={shareTournament}>
        <Text style={styles.shareButtonText}>⤴ Share Tournament</Text>
      </TouchableOpacity>

      <Modal visible={rulesVisible} transparent animationType="fade" onRequestClose={() => setRulesVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.rulesModal}>
            <Text style={styles.rulesTitle}>Tournament rules</Text>
            <Text style={styles.rulesText}>Every pair plays {data.tournament.matches_per_opponent === 1 ? 'one match' : `${data.tournament.matches_per_opponent} matches`}.</Text>
            <Text style={styles.rulesText}>A match is first to {data.tournament.point_target} points, with a two-point lead needed to win. Serve changes every {data.tournament.serve_interval} {data.tournament.serve_interval === 1 ? 'point' : 'points'}.</Text>
            <Text style={styles.rulesText}>Standings use wins first, then point difference, then total points scored. Teams that remain equal share the same position.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setRulesVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { ...ui.content },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.purpleSoft, borderRadius: 20, padding: 16, marginBottom: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 24 },
  title: { letterSpacing: -0.4, color: colors.text, fontSize: 18, fontWeight: '800' },
  rulesButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  rulesButtonText: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12.5, marginTop: 4 },
  championCard: { backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18, alignItems: 'center' },
  championLabel: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  championName: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  tiedCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18 },
  tiedTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  tiedText: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  nextButton: { backgroundColor: colors.text, borderRadius: 20, padding: 16, marginBottom: 22 },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  nextMatchText: { color: '#FFFFFF', marginTop: 4, opacity: 0.85 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 4, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: colors.background },
  tabButtonText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabButtonTextActive: { color: colors.green },
  standingsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' },
  standingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  standingHeader: { borderTopWidth: 0, backgroundColor: colors.surface },
  headerText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  rank: { color: colors.text, width: 28, fontWeight: '700', textAlign: 'center' },
  team: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '600', marginHorizontal: 8 },
  stat: { color: colors.text, width: 34, textAlign: 'center', fontWeight: '700' },
  tieBreakText: { color: colors.muted, fontSize: 12, marginTop: 6, marginBottom: 22 },
  round: { marginBottom: 18 },
  roundTitle: { color: colors.muted, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7 },
  fixture: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  fixtureComplete: { backgroundColor: colors.surface },
  fixtureTeams: { flex: 1 },
  fixtureTeam: { color: colors.text, fontSize: 14, marginVertical: 2 },
  fixtureWinner: { color: colors.green, fontWeight: '800' },
  fixtureRight: { marginLeft: 10, alignItems: 'flex-end' },
  fixtureScore: { color: colors.text, fontWeight: '800', fontSize: 16 },
  playLabel: { color: colors.green, fontWeight: '800' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  playerRowIcon: { fontSize: 22 },
  playerRowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  shareButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, alignItems: 'center', padding: 16, marginTop: 22 },
  shareButtonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', padding: 24 },
  rulesModal: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 22 },
  rulesTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  rulesText: { color: colors.text, lineHeight: 21, marginBottom: 12 },
  closeButton: { backgroundColor: colors.text, borderRadius: 14, alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  closeButtonText: { color: '#FFFFFF', fontWeight: '800' },
});
