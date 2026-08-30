import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchPlayers } from '../lib/api';
import { MatchMode, Player } from '../lib/types';

export default function NewMatchScreen({ navigation }: any) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<MatchMode>('singles');
  const [pointTarget, setPointTarget] = useState<10 | 20>(20);
  const [serveInterval, setServeInterval] = useState(2);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchPlayers().then(setPlayers).catch((e) => Alert.alert('Error', e.message));
    }, [])
  );

  const slotsPerTeam = mode === 'singles' ? 1 : 2;

  function togglePlayer(id: string, team: 'a' | 'b') {
    const [team_, setTeam, other, setOther] = team === 'a' ? [teamA, setTeamA, teamB, setTeamB] : [teamB, setTeamB, teamA, setTeamA];
    if (team_.includes(id)) {
      setTeam(team_.filter((p) => p !== id));
      return;
    }
    if (other.includes(id)) return; // already on the other team
    if (team_.length >= slotsPerTeam) return; // team full
    setTeam([...team_, id]);
  }

  function handleModeChange(newMode: MatchMode) {
    setMode(newMode);
    setTeamA([]);
    setTeamB([]);
  }

  const ready = teamA.length === slotsPerTeam && teamB.length === slotsPerTeam;

  function handleStart() {
    navigation.navigate('LiveMatch', { mode, pointTarget, serveInterval, teamA, teamB, players });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>Mode</Text>
      <View style={styles.rowOptions}>
        {(['singles', 'doubles'] as MatchMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.option, mode === m && styles.optionSelected]}
            onPress={() => handleModeChange(m)}
          >
            <Text style={[styles.optionText, mode === m && styles.optionTextSelected]}>
              {m === 'singles' ? 'Singles' : 'Doubles'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Play to</Text>
      <View style={styles.rowOptions}>
        {[10, 20].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.option, pointTarget === n && styles.optionSelected]}
            onPress={() => setPointTarget(n as 10 | 20)}
          >
            <Text style={[styles.optionText, pointTarget === n && styles.optionTextSelected]}>{n} points</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Switch serve every</Text>
      <View style={styles.rowOptions}>
        {[1, 2, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.option, serveInterval === n && styles.optionSelected]}
            onPress={() => setServeInterval(n)}
          >
            <Text style={[styles.optionText, serveInterval === n && styles.optionTextSelected]}>
              {n} {n === 1 ? 'point' : 'points'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Team A {mode === 'doubles' ? `(${teamA.length}/2)` : ''}</Text>
      <View style={styles.playerGrid}>
        {players.map((p) => (
          <TouchableOpacity
            key={`a-${p.id}`}
            style={[styles.playerChip, teamA.includes(p.id) && styles.playerChipSelectedA]}
            onPress={() => togglePlayer(p.id, 'a')}
          >
            <Text style={styles.playerChipIcon}>{p.icon}</Text>
            <Text style={styles.playerChipText}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Team B {mode === 'doubles' ? `(${teamB.length}/2)` : ''}</Text>
      <View style={styles.playerGrid}>
        {players.map((p) => (
          <TouchableOpacity
            key={`b-${p.id}`}
            style={[styles.playerChip, teamB.includes(p.id) && styles.playerChipSelectedB]}
            onPress={() => togglePlayer(p.id, 'b')}
          >
            <Text style={styles.playerChipIcon}>{p.icon}</Text>
            <Text style={styles.playerChipText}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.startButton, !ready && styles.startButtonDisabled]}
        onPress={handleStart}
        disabled={!ready}
      >
        <Text style={styles.startButtonText}>Start Match</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  rowOptions: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, borderWidth: 2, borderColor: '#eee', borderRadius: 10, padding: 14, alignItems: 'center' },
  optionSelected: { borderColor: '#e63946', backgroundColor: '#fdeeee' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextSelected: { color: '#e63946', fontWeight: '700' },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  playerChipSelectedA: { borderColor: '#e63946', backgroundColor: '#fdeeee' },
  playerChipSelectedB: { borderColor: '#1d3557', backgroundColor: '#eef2f7' },
  playerChipIcon: { fontSize: 18, marginRight: 6 },
  playerChipText: { fontSize: 15, fontWeight: '500' },
  startButton: { backgroundColor: '#e63946', padding: 16, alignItems: 'center', borderRadius: 8, marginTop: 30, marginBottom: 20 },
  startButtonDisabled: { backgroundColor: '#ccc' },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
