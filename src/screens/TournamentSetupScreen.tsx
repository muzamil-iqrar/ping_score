import { colors, EmptyState, PageHeading, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createTournament, fetchPlayers } from '../lib/api';
import { MatchMode, Player } from '../lib/types';

export default function TournamentSetupScreen({ navigation }: any) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('Round Robin');
  const [mode, setMode] = useState<MatchMode>('singles');
  const [pointTarget, setPointTarget] = useState<10 | 20>(20);
  const [serveInterval, setServeInterval] = useState(2);
  const [matchesPerOpponent, setMatchesPerOpponent] = useState<1 | 2 | 3>(1);
  const [singlesPlayers, setSinglesPlayers] = useState<string[]>([]);
  const [doublesSelection, setDoublesSelection] = useState<string[]>([]);
  const [doublesTeams, setDoublesTeams] = useState<string[][]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPlayers().then(setPlayers).catch((error) => Alert.alert('Error', error.message));
    }, [])
  );

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const assignedDoublesPlayers = useMemo(() => new Set(doublesTeams.flat()), [doublesTeams]);
  const entries = mode === 'singles' ? singlesPlayers.map((id) => [id]) : doublesTeams;
  const canCreate = entries.length >= 2 && name.trim().length > 0;

  function changeMode(nextMode: MatchMode) {
    setMode(nextMode);
    setSinglesPlayers([]);
    setDoublesSelection([]);
    setDoublesTeams([]);
  }

  function toggleSinglesPlayer(id: string) {
    setSinglesPlayers((selected) => (selected.includes(id) ? selected.filter((playerId) => playerId !== id) : [...selected, id]));
  }

  function toggleDoublesPlayer(id: string) {
    if (assignedDoublesPlayers.has(id)) return;
    setDoublesSelection((selected) => {
      if (selected.includes(id)) return selected.filter((playerId) => playerId !== id);
      return selected.length === 2 ? selected : [...selected, id];
    });
  }

  function addDoublesTeam() {
    if (doublesSelection.length !== 2) return;
    setDoublesTeams((teams) => [...teams, doublesSelection]);
    setDoublesSelection([]);
  }

  function playerLabel(playerIds: string[]) {
    return playerIds.map((id) => playerById.get(id)?.name ?? '?').join(' & ');
  }

  async function handleCreate() {
    if (!canCreate || saving) return;
    setSaving(true);
    try {
      const tournament = await createTournament(
        { name: name.trim(), mode, point_target: pointTarget, serve_interval: serveInterval, matches_per_opponent: matchesPerOpponent },
        entries
      );
      navigation.replace('Tournament', { tournamentId: tournament.id });
    } catch (error: any) {
      Alert.alert('Could not create tournament', error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PageHeading eyebrow="THE NEXT COMPETITION" title="Make it a tournament." subtitle="Your lineup. Your format. A full day of table tennis." />
      <Text style={styles.sectionTitle}>Tournament name</Text>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Friday night league"
        placeholderTextColor={colors.muted}
        maxLength={60}
      />

      <Text style={styles.sectionTitle}>Format</Text>
      <View style={styles.rowOptions}>
        {(['singles', 'doubles'] as MatchMode[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.option, mode === option && styles.optionSelected]}
            accessibilityState={{ selected: mode === option }}
            onPress={() => changeMode(option)}
          >
            <Text style={[styles.optionText, mode === option && styles.optionTextSelected]}>
              {option === 'singles' ? 'Singles' : 'Doubles'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.sectionTitle}>Matches per opponent</Text>
      <View style={styles.rowOptions}>
        {([1, 2, 3] as const).map((count) => (
          <TouchableOpacity
            key={count}
            style={[styles.option, matchesPerOpponent === count && styles.optionSelected]}
            onPress={() => setMatchesPerOpponent(count)}
          >
            <Text style={[styles.optionText, matchesPerOpponent === count && styles.optionTextSelected]}>{count} {count === 1 ? 'match' : 'matches'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.helpText}>Each pair will play {matchesPerOpponent === 1 ? 'once' : `${matchesPerOpponent} times`}.</Text>

      <Text style={styles.sectionTitle}>Play to</Text>
      <View style={styles.rowOptions}>
        {[10, 20].map((target) => (
          <TouchableOpacity
            key={target}
            style={[styles.option, pointTarget === target && styles.optionSelected]}
            onPress={() => setPointTarget(target as 10 | 20)}
          >
            <Text style={[styles.optionText, pointTarget === target && styles.optionTextSelected]}>{target} points</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Switch serve every</Text>
      <View style={styles.rowOptions}>
        {[1, 2, 5].map((interval) => (
          <TouchableOpacity
            key={interval}
            style={[styles.option, serveInterval === interval && styles.optionSelected]}
            onPress={() => setServeInterval(interval)}
          >
            <Text style={[styles.optionText, serveInterval === interval && styles.optionTextSelected]}>
              {interval} {interval === 1 ? 'point' : 'points'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {players.length === 0 && <TouchableOpacity onPress={() => navigation.navigate('Players')}><EmptyState title="Build your lineup first" detail="Tap to add players, then return to create your tournament." /></TouchableOpacity>}
      {mode === 'singles' ? (
        <>
          <Text style={styles.sectionTitle}>Players ({singlesPlayers.length} selected)</Text>
          <Text style={styles.helpText}>Choose at least two players.</Text>
          <View style={styles.playerGrid}>
            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[styles.playerChip, singlesPlayers.includes(player.id) && styles.playerChipSelected]}
                onPress={() => toggleSinglesPlayer(player.id)}
              >
                <Text style={styles.playerChipIcon}>{player.icon}</Text>
                <Text style={styles.playerChipText}>{player.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Create teams ({doublesTeams.length} created)</Text>
          <Text style={styles.helpText}>Choose two players, then add the team. You need at least two teams.</Text>
          <View style={styles.playerGrid}>
            {players.map((player) => {
              const assigned = assignedDoublesPlayers.has(player.id);
              const selected = doublesSelection.includes(player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerChip, selected && styles.playerChipSelected, assigned && styles.playerChipAssigned]}
                  onPress={() => toggleDoublesPlayer(player.id)}
                  disabled={assigned}
                >
                  <Text style={styles.playerChipIcon}>{player.icon}</Text>
                  <Text style={styles.playerChipText}>{player.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.addTeamButton, doublesSelection.length !== 2 && styles.addTeamButtonDisabled]}
            disabled={doublesSelection.length !== 2}
            onPress={addDoublesTeam}
          >
            <Text style={styles.addTeamText}>Add team</Text>
          </TouchableOpacity>
          {doublesTeams.map((team, index) => (
            <View key={team.join('-')} style={styles.teamRow}>
              <Text style={styles.teamName}>Team {index + 1}: {playerLabel(team)}</Text>
              <TouchableOpacity onPress={() => setDoublesTeams((teams) => teams.filter((_, teamIndex) => teamIndex !== index))}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity
        style={[styles.createButton, (!canCreate || saving) && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={!canCreate || saving}
      >
        <Text style={styles.createButtonText}>{saving ? 'Creating…' : 'Create tournament'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { ...ui.content },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  nameInput: { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, fontSize: 16 },
  rowOptions: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, alignItems: 'center' },
  optionSelected: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  optionText: { fontSize: 16, color: colors.text },
  optionTextSelected: { color: colors.lime, fontWeight: '700' },
  helpText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  playerChipSelected: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  playerChipAssigned: { opacity: 0.45, backgroundColor: colors.surface },
  playerChipIcon: { fontSize: 18, marginRight: 6 },
  playerChipText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  addTeamButton: { alignSelf: 'flex-start', backgroundColor: colors.blue, borderRadius: 14, marginTop: 14, paddingHorizontal: 16, paddingVertical: 11 },
  addTeamButtonDisabled: { backgroundColor: colors.border },
  addTeamText: { color: colors.ink, fontWeight: '700' },
  teamRow: { backgroundColor: colors.surface, borderRadius: 16, marginTop: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { color: colors.text, fontWeight: '600', flex: 1, marginRight: 12 },
  removeText: { color: colors.lime, fontWeight: '700' },
  createButton: { backgroundColor: colors.lime, borderRadius: 14, alignItems: 'center', marginTop: 30, padding: 16 },
  createButtonDisabled: { backgroundColor: colors.border },
  createButtonText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
});
