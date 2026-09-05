import { colors, EmptyState, PageHeading, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <ScrollView style={styles.container} contentContainerStyle={ui.content}>
      <PageHeading eyebrow="MATCH DAY / SETUP" title="Set the table." subtitle="Pick your format, choose your sides, and play." />
      <Text style={styles.sectionTitle}>01 / Match format</Text>
      <View style={styles.rowOptions}>
        {(['singles', 'doubles'] as MatchMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.option, mode === m && styles.optionSelected]}
            accessibilityState={{ selected: mode === m }}
            onPress={() => handleModeChange(m)}
          >
            <Text style={[styles.optionText, mode === m && styles.optionTextSelected]}>
              {m === 'singles' ? 'Singles' : 'Doubles'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>02 / Points to win</Text>
      <View style={styles.rowOptions}>
        {[10, 20].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.option, pointTarget === n && styles.optionSelected]}
            accessibilityState={{ selected: pointTarget === n }}
            onPress={() => setPointTarget(n as 10 | 20)}
          >
            <Text style={[styles.optionText, pointTarget === n && styles.optionTextSelected]}>{n} points</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>03 / Service rotation</Text>
      <View style={styles.rowOptions}>
        {[1, 2, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.option, serveInterval === n && styles.optionSelected]}
            accessibilityState={{ selected: serveInterval === n }}
            onPress={() => setServeInterval(n)}
          >
            <Text style={[styles.optionText, serveInterval === n && styles.optionTextSelected]}>
              {n} {n === 1 ? 'point' : 'points'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.lime }]}>04 / Team A {mode === 'doubles' ? `(${teamA.length}/2)` : ''}</Text>
      {players.length === 0 && <TouchableOpacity onPress={() => navigation.navigate('Players')}><EmptyState title="Your table needs players" detail="Tap here to add players, then come back to pick your sides." /></TouchableOpacity>}
      <View style={styles.playerGrid}>
        {players.map((p) => (
          <TouchableOpacity
            key={`a-${p.id}`}
            style={[styles.playerChip, teamA.includes(p.id) && styles.playerChipSelectedA, teamB.includes(p.id) && { opacity: 0.3 }]}
            onPress={() => togglePlayer(p.id, 'a')}
            disabled={teamB.includes(p.id)}
            accessibilityState={{ selected: teamA.includes(p.id) }}
          >
            <Text style={styles.playerChipIcon}>{p.icon}</Text>
            <Text style={styles.playerChipText}>{p.name}{teamA.includes(p.id) ? ' ✓' : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.blue }]}>05 / Team B {mode === 'doubles' ? `(${teamB.length}/2)` : ''}</Text>
      <View style={styles.playerGrid}>
        {players.map((p) => (
          <TouchableOpacity
            key={`b-${p.id}`}
            style={[styles.playerChip, teamB.includes(p.id) && styles.playerChipSelectedB, teamA.includes(p.id) && { opacity: 0.3 }]}
            onPress={() => togglePlayer(p.id, 'b')}
            disabled={teamA.includes(p.id)}
            accessibilityState={{ selected: teamB.includes(p.id) }}
          >
            <Text style={styles.playerChipIcon}>{p.icon}</Text>
            <Text style={styles.playerChipText}>{p.name}{teamB.includes(p.id) ? ' ✓' : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.startButton, !ready && styles.startButtonDisabled]}
        onPress={handleStart}
        disabled={!ready}
      >
        <Text style={styles.startButtonText}>{ready ? 'Start match  →' : 'Choose both sides to start'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  rowOptions: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, alignItems: 'center' },
  optionSelected: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  optionText: { fontSize: 16, color: colors.text },
  optionTextSelected: { color: colors.lime, fontWeight: '700' },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  playerChipSelectedA: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  playerChipSelectedB: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  playerChipIcon: { fontSize: 18, marginRight: 6 },
  playerChipText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  startButton: { backgroundColor: colors.lime, padding: 16, alignItems: 'center', borderRadius: 14, marginTop: 30, marginBottom: 20 },
  startButtonDisabled: { backgroundColor: colors.border },
  startButtonText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
});
