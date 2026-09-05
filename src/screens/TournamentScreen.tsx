import { colors, Reveal, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchPlayers, fetchTournament } from '../lib/api';
import { Player, Tournament, TournamentEntry, TournamentMatch } from '../lib/types';
import { calculateStandings } from '../state/tournamentEngine';

type TournamentData = {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
};

export default function TournamentScreen({ navigation, route }: any) {
  const tournamentId: string = route.params.tournamentId;
  const [data, setData] = useState<TournamentData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesVisible, setRulesVisible] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
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
    if (!data || fixture.winner_entry_id) return;
    const teamA = entryById.get(fixture.team_a_entry_id);
    const teamB = entryById.get(fixture.team_b_entry_id);
    if (!teamA || !teamB) return;
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

  if (loading && !data) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.lime} /></View>;
  }
  if (!data) return null;

  const pendingFixture = data.matches.find((match) => !match.winner_entry_id);
  const complete = !pendingFixture;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal style={styles.header}>
        <Text style={ui.eyebrow}>THE COMPETITION / ROUND ROBIN</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{data.tournament.name}</Text>
          <TouchableOpacity style={styles.rulesButton} onPress={() => setRulesVisible(true)}>
            <Text style={styles.rulesButtonText}>Rules</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>
          {data.tournament.mode === 'singles' ? 'Singles' : 'Doubles'} · Round robin · First to {data.tournament.point_target}
        </Text>
        <Text style={styles.meta}>Each pair plays {data.tournament.matches_per_opponent === 1 ? 'once' : `${data.tournament.matches_per_opponent} times`}</Text>
        <Text style={styles.meta}>Serve switches every {data.tournament.serve_interval} {data.tournament.serve_interval === 1 ? 'point' : 'points'}</Text>
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

      <Text style={styles.sectionTitle}>Standings</Text>
      <View style={styles.standingsCard}>
        <View style={[styles.standingRow, styles.standingHeader]}>
          <Text style={[styles.rank, styles.headerText]}>#</Text>
          <Text style={[styles.team, styles.headerText]}>Team</Text>
          <Text style={[styles.stat, styles.headerText]}>P</Text>
          <Text style={[styles.stat, styles.headerText]}>W</Text>
          <Text style={[styles.stat, styles.headerText]}>Diff</Text>
        </View>
        {standings.map((standing, index) => (
          <View key={standing.entryId} style={styles.standingRow}>
            <Text style={styles.rank}>{standing.rank}</Text>
            <Text style={styles.team} numberOfLines={1}>{entryLabel(standing.entryId)}</Text>
            <Text style={styles.stat}>{standing.played}</Text>
            <Text style={styles.stat}>{standing.wins}</Text>
            <Text style={styles.stat}>{standing.pointDifference > 0 ? '+' : ''}{standing.pointDifference}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.tieBreakText}>P = matches played. W = wins. Diff = points scored minus points conceded. A 20 - 15 win adds +5.</Text>

      <Text style={styles.sectionTitle}>Fixtures</Text>
      {rounds.map(({ round, matches }) => (
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
  header: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, letterSpacing: -0.8, color: colors.text, fontSize: 28, fontWeight: '800' },
  rulesButton: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 12 },
  rulesButtonText: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 14, marginTop: 4 },
  championCard: { backgroundColor: colors.limeSoft, borderColor: colors.lime, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18, alignItems: 'center' },
  championLabel: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  championName: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  tiedCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18 },
  tiedTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  tiedText: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  nextButton: { backgroundColor: colors.lime, borderRadius: 20, padding: 16, marginBottom: 22 },
  nextButtonText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  nextMatchText: { color: colors.ink, marginTop: 4, opacity: 0.9 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
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
  fixture: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  fixtureComplete: { backgroundColor: colors.surface },
  fixtureTeams: { flex: 1 },
  fixtureTeam: { color: colors.text, fontSize: 14, marginVertical: 2 },
  fixtureWinner: { color: colors.lime, fontWeight: '800' },
  fixtureRight: { marginLeft: 10, alignItems: 'flex-end' },
  fixtureScore: { color: colors.text, fontWeight: '800', fontSize: 16 },
  playLabel: { color: colors.lime, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', padding: 24 },
  rulesModal: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: colors.background, borderRadius: 16, padding: 22 },
  rulesTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  rulesText: { color: colors.text, lineHeight: 21, marginBottom: 12 },
  closeButton: { backgroundColor: colors.lime, borderRadius: 14, alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  closeButtonText: { color: colors.ink, fontWeight: '800' },
});
