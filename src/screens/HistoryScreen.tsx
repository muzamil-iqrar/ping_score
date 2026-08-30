import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { fetchMatches, fetchPlayers } from '../lib/api';
import { Match, Player } from '../lib/types';

export default function HistoryScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchMatches(), fetchPlayers()])
        .then(([m, p]) => {
          setMatches(m);
          setPlayers(p);
        })
        .catch((e) => Alert.alert('Error', e.message));
    }, [])
  );

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  function label(ids: string[]) {
    return ids.map((id) => playerById.get(id)?.name ?? '?').join(' & ');
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={matches}
      keyExtractor={(m) => m.id}
      ListEmptyComponent={<Text style={styles.empty}>No matches played yet.</Text>}
      renderItem={({ item }) => {
        const aWon = item.winner === 'a';
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.mode}>{item.mode === 'singles' ? 'Singles' : 'Doubles'} · to {item.point_target}</Text>
              <Text style={styles.date}>{new Date(item.played_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.matchup}>
              <Text style={[styles.team, aWon && styles.winnerText]}>
                {label(item.team_a_player_ids)} {aWon ? '🏆' : ''}
              </Text>
              <Text style={styles.score}>
                {item.team_a_score} - {item.team_b_score}
              </Text>
              <Text style={[styles.team, !aWon && styles.winnerText]}>
                {label(item.team_b_player_ids)} {!aWon ? '🏆' : ''}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  card: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  mode: { fontSize: 13, color: '#888', fontWeight: '600' },
  date: { fontSize: 13, color: '#888' },
  matchup: { alignItems: 'center' },
  team: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  winnerText: { fontWeight: '800', color: '#e63946' },
  score: { fontSize: 24, fontWeight: '800', marginVertical: 4 },
});
