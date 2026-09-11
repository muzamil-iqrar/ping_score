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
            <View style={styles.iconBox}><Text style={styles.icon}>🏓</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchup}>
                <Text style={aWon ? styles.winnerText : styles.team}>{label(item.team_a_player_ids)}</Text>
                <Text style={styles.vs}> vs </Text>
                <Text style={!aWon ? styles.winnerText : styles.team}>{label(item.team_b_player_ids)}</Text>
              </Text>
              <Text style={styles.score}>{item.team_a_score} - {item.team_b_score}</Text>
              <Text style={styles.date}>{new Date(item.played_at).toLocaleDateString()}</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, padding: 14, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  matchup: { fontSize: 14 },
  team: { color: colors.text, fontWeight: '500' },
  vs: { color: colors.muted },
  winnerText: { fontWeight: '800', color: colors.text },
  score: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  date: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
