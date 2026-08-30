import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { recordMatch } from '../lib/api';
import { MatchMode, Player } from '../lib/types';
import { createMatch, currentServer, scorePoint, undoPoint } from '../state/matchEngine';

type Props = {
  navigation: any;
  route: {
    params: {
      mode: MatchMode;
      pointTarget: 10 | 20;
      teamA: string[];
      teamB: string[];
      players: Player[];
    };
  };
};

export default function LiveMatchScreen({ navigation, route }: any) {
  const { mode, pointTarget, teamA, teamB, players }: Props['route']['params'] = route.params;
  const [match, setMatch] = useState(() => createMatch(mode, pointTarget));
  const [saving, setSaving] = useState(false);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const server = currentServer(match);

  function nameFor(id: string) {
    return playerById.get(id)?.name ?? '?';
  }
  function iconFor(id: string) {
    return playerById.get(id)?.icon ?? '🏓';
  }

  function teamLabel(ids: string[]) {
    return ids.map(nameFor).join(' & ');
  }

  async function handlePoint(team: 'a' | 'b') {
    const next = scorePoint(match, team);
    setMatch(next);
    if (next.winner) {
      setSaving(true);
      try {
        await recordMatch({
          mode,
          point_target: pointTarget,
          team_a_player_ids: teamA,
          team_b_player_ids: teamB,
          team_a_score: next.scoreA,
          team_b_score: next.scoreB,
          winner: next.winner,
        });
        navigation.replace('MatchResult', {
          winnerLabel: teamLabel(next.winner === 'a' ? teamA : teamB),
          scoreA: next.scoreA,
          scoreB: next.scoreB,
        });
      } catch (e: any) {
        Alert.alert('Error saving match', e.message);
      } finally {
        setSaving(false);
      }
    }
  }

  function isServing(team: 'a' | 'b', slot: number) {
    return server.team === team && (mode === 'singles' || server.slot === slot);
  }

  function renderTeamPlayer(id: string, team: 'a' | 'b', slot: number) {
    return (
      <View key={id} style={styles.playerRow}>
        <Text style={styles.playerIcon}>{iconFor(id)}</Text>
        <Text style={styles.playerName}>{nameFor(id)}</Text>
        {isServing(team, slot) && <Text style={styles.serveDot}>🏓</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scoreRow}>
        <TouchableOpacity style={[styles.scoreCard, styles.cardA]} onPress={() => handlePoint('a')} disabled={saving}>
          {teamA.map((id, i) => renderTeamPlayer(id, 'a', i))}
          <Text style={styles.score}>{match.scoreA}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.scoreCard, styles.cardB]} onPress={() => handlePoint('b')} disabled={saving}>
          {teamB.map((id, i) => renderTeamPlayer(id, 'b', i))}
          <Text style={styles.score}>{match.scoreB}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Tap a side to award it a point · playing to {pointTarget}</Text>

      {match.lastScoringTeam && (
        <TouchableOpacity style={styles.undoButton} onPress={() => setMatch(undoPoint(match))}>
          <Text style={styles.undoText}>Undo last point</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', minHeight: 260, justifyContent: 'center' },
  cardA: { backgroundColor: '#fdeeee' },
  cardB: { backgroundColor: '#eef2f7' },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  playerIcon: { fontSize: 18, marginRight: 4 },
  playerName: { fontSize: 15, fontWeight: '600' },
  serveDot: { fontSize: 14, marginLeft: 4 },
  score: { fontSize: 64, fontWeight: '800', marginTop: 16 },
  hint: { textAlign: 'center', color: '#888', marginTop: 20 },
  undoButton: { alignSelf: 'center', marginTop: 20, padding: 12 },
  undoText: { color: '#888', fontSize: 15, textDecorationLine: 'underline' },
});
