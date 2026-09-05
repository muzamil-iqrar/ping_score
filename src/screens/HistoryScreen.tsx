import { colors, EmptyState, PageHeading, Reveal, Touch as TouchableOpacity, ui } from '../components/ui';
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
      contentContainerStyle={ui.content}
      ListHeaderComponent={<PageHeading eyebrow="THE ARCHIVE" title="Games worth keeping." subtitle="The close calls. The comebacks. Every final score." />}
      data={matches}
      keyExtractor={(m) => m.id}
      ListEmptyComponent={<EmptyState title="A fresh scorebook" detail="Finish your first match and the result will land right here." />}
      renderItem={({ item }) => {
        const aWon = item.winner === 'a';
        return (
          <Reveal style={styles.card}>
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
          </Reveal>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  mode: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  date: { fontSize: 13, color: colors.muted },
  matchup: { alignItems: 'center' },
  team: { color: colors.text, fontSize: 16, fontWeight: '500', marginBottom: 4 },
  winnerText: { fontWeight: '800', color: colors.lime },
  score: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'], marginVertical: 10 },
});
