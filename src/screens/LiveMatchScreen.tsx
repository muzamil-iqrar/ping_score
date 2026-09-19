import { AppIcon, colors, confirmDestructive, errorMessage, Reveal, Touch as TouchableOpacity, ui, useReducedMotion } from '../components/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { recordMatch, recordTournamentMatchResult } from '../lib/api';
import { ActiveMatchParams, ActiveMatchSnapshot, clearActiveMatch, saveActiveMatch } from '../lib/activeMatch';
import { useMatchSounds } from '../lib/sounds';
import { createMatch, currentServer, MatchState, resetGame, scorePoint, swapMatchSides, undoPoint } from '../state/matchEngine';
import { useAuth } from '../state/AuthContext';

type Props = {
  navigation: any;
  route: {
    params: ActiveMatchParams & { restoredMatch?: MatchState };
  };
};

export default function LiveMatchScreen({ navigation, route }: any) {
  const { mode, pointTarget, serveInterval, players, tournamentId, tournamentMatchId, teamAEntryId, teamBEntryId, firstServerRotationIndex, restoredMatch }: Props['route']['params'] = route.params;
  const { session } = useAuth();
  const userId = session?.user.id;
  const [match, setMatch] = useState(() => restoredMatch ?? createMatch(mode, pointTarget, serveInterval, firstServerRotationIndex));
  const [teamA, setTeamA] = useState<string[]>(route.params.teamA);
  const [teamB, setTeamB] = useState<string[]>(route.params.teamB);
  // True when the on-screen sides are reversed relative to the tournament fixture's A/B entries.
  const [sidesSwapped, setSidesSwapped] = useState(Boolean(route.params.sidesSwapped));
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const sounds = useMatchSounds();
  const reducedMotion = useReducedMotion();
  const wide = useWindowDimensions().width > 680;

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const server = currentServer(match);
  const prevServerKey = useRef(`${server.team}${server.slot}`);

  const scoreAScale = useRef(new Animated.Value(1)).current;
  const scoreBScale = useRef(new Animated.Value(1)).current;
  const serveBannerScale = useRef(new Animated.Value(1)).current;

  function bump(anim: Animated.Value) {
    if (reducedMotion) return;
    anim.setValue(1.18);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }

  useEffect(() => {
    const key = `${server.team}${server.slot}`;
    if (key !== prevServerKey.current) {
      prevServerKey.current = key;
      if (!reducedMotion) Animated.sequence([
        Animated.timing(serveBannerScale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.spring(serveBannerScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
      sounds.playServeSwitch();
    }
  }, [server.team, server.slot, reducedMotion]);

  function nameFor(id: string) {
    return playerById.get(id)?.name ?? '?';
  }
  function iconFor(id: string) {
    return playerById.get(id)?.icon ?? '🏓';
  }

  function teamLabel(ids: string[]) {
    return ids.map(nameFor).join(' & ');
  }

  function activeSnapshot(matchState: MatchState): ActiveMatchSnapshot {
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      match: matchState,
      params: {
        mode,
        pointTarget,
        serveInterval,
        teamA,
        teamB,
        players,
        tournamentId,
        tournamentMatchId,
        teamAEntryId,
        teamBEntryId,
        firstServerRotationIndex,
        sidesSwapped,
      },
    };
  }

  useEffect(() => {
    if (!userId || match.winner) return;
    saveActiveMatch(userId, activeSnapshot(match)).catch((error) => console.warn('Could not autosave match', error));
  }, [userId, match, teamA, teamB, sidesSwapped]);

  async function finishMatch(completedMatch: MatchState) {
    if (!completedMatch.winner || savingRef.current) return;
    savingRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    sounds.playWin();
    setSaving(true);
    try {
      await recordMatch({
        mode,
        point_target: pointTarget,
        team_a_player_ids: teamA,
        team_b_player_ids: teamB,
        team_a_score: completedMatch.scoreA,
        team_b_score: completedMatch.scoreB,
        winner: completedMatch.winner,
      });
      if (tournamentMatchId && teamAEntryId && teamBEntryId) {
        // On-screen side A may be the fixture's team B after a swap, so map scores and the
        // winner back onto the fixture's own entries before recording the result.
        const screenAEntryId = sidesSwapped ? teamBEntryId : teamAEntryId;
        const screenBEntryId = sidesSwapped ? teamAEntryId : teamBEntryId;
        await recordTournamentMatchResult(tournamentMatchId, {
          team_a_score: sidesSwapped ? completedMatch.scoreB : completedMatch.scoreA,
          team_b_score: sidesSwapped ? completedMatch.scoreA : completedMatch.scoreB,
          winner_entry_id: completedMatch.winner === 'a' ? screenAEntryId : screenBEntryId,
        });
      }
      if (userId) await clearActiveMatch(userId).catch((error) => console.warn('Could not clear saved match', error));
      navigation.replace('MatchResult', {
        winnerLabel: teamLabel(completedMatch.winner === 'a' ? teamA : teamB),
        teamALabel: teamLabel(teamA),
        teamBLabel: teamLabel(teamB),
        scoreA: completedMatch.scoreA,
        scoreB: completedMatch.scoreB,
        tournamentId,
      });
    } catch (e: any) {
      Alert.alert('Error saving match', errorMessage(e));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  async function handlePoint(team: 'a' | 'b') {
    if (match.winner || saving || savingRef.current) return;
    const next = scorePoint(match, team);
    setMatch(next);
    bump(team === 'a' ? scoreAScale : scoreBScale);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    sounds.playPoint();

    if (next.winner) {
      if (userId) await saveActiveMatch(userId, activeSnapshot(next)).catch((error) => console.warn('Could not autosave match', error));
      await finishMatch(next);
    }
  }

  // Swaps which side of the screen each team occupies. Scores, serve order and history
  // travel with the teams, so a mid-match swap changes only the layout, never the game.
  function handleSwapSides() {
    setTeamA(teamB);
    setTeamB(teamA);
    setSidesSwapped((swapped) => !swapped);
    setMatch((m) => swapMatchSides(m));
  }

  function handleResetGame() {
    confirmDestructive('Reset game', 'Restart the current game at 0-0?', 'Reset', () => setMatch((m) => resetGame(m)));
  }

  function isServing(team: 'a' | 'b', slot: number) {
    return server.team === team && (mode === 'singles' || server.slot === slot);
  }

  function renderTeamPlayer(id: string, team: 'a' | 'b', slot: number) {
    return (
      <View key={id} style={styles.playerRow}>
        <Text style={styles.playerIcon}>{iconFor(id)}</Text>
        <Text style={styles.playerName}>{nameFor(id)}</Text>
        {isServing(team, slot) && <View style={[styles.serverDot, { backgroundColor: team === 'a' ? colors.green : colors.red }]} />}
      </View>
    );
  }

  const servingTeamLabel = teamLabel(server.team === 'a' ? teamA : teamB);
  const servingPlayerName = mode === 'doubles' ? nameFor((server.team === 'a' ? teamA : teamB)[server.slot]) : servingTeamLabel;
  const servingIcon = mode === 'doubles' ? iconFor((server.team === 'a' ? teamA : teamB)[server.slot]) : iconFor((server.team === 'a' ? teamA : teamB)[0]);

  const deuce = match.scoreA >= pointTarget - 1 && match.scoreB >= pointTarget - 1;
  const matchPoint = !match.winner && Math.max(match.scoreA, match.scoreB) >= pointTarget - 1 && match.scoreA !== match.scoreB;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Reveal style={styles.topRow}><View><Text style={ui.eyebrow}>LIVE AT THE TABLE</Text><Text style={styles.title}>Make it count.</Text></View><View style={styles.liveBadge}><View style={styles.serverDot} /><Text style={styles.liveText}>{saving ? 'SAVING' : match.winner ? 'FINISHED' : 'LIVE'}</Text></View></Reveal>
      <View style={styles.metaRow}><Text style={styles.meta}>{mode.toUpperCase()}</Text><Text style={styles.meta}>FIRST TO {pointTarget}</Text><Text style={styles.meta}>WIN BY 2</Text></View>
      <Animated.View style={[styles.serveBanner, server.team === 'a' ? styles.serveBannerA : styles.serveBannerB, { transform: [{ scale: serveBannerScale }] }]}>
        <View style={{ flex: 1 }}><Text style={styles.serveBannerLabel}>NOW SERVING</Text><Text style={styles.serveBannerName}>{servingIcon} {servingPlayerName}</Text></View><View style={styles.serveBall} />
      </Animated.View>
      <View style={styles.scoreRow}>
        {(['a', 'b'] as const).map(team => {
          const ids = team === 'a' ? teamA : teamB;
          const value = team === 'a' ? match.scoreA : match.scoreB;
          const accent = team === 'a' ? colors.green : colors.red;
          return <TouchableOpacity key={team} style={[styles.scoreCard, team === 'a' ? styles.cardA : styles.cardB, wide && { minHeight: 350 }]} onPress={() => handlePoint(team)} disabled={saving || Boolean(match.winner)} accessibilityLabel={`Add point to ${teamLabel(ids)}. Current score ${value}`}>
            <Text style={[styles.teamLabel, { color: accent }]}>TEAM {team.toUpperCase()}</Text>
            <View style={styles.playerList}>{ids.map((id, i) => renderTeamPlayer(id, team, i))}</View>
            <Animated.Text adjustsFontSizeToFit numberOfLines={1} style={[styles.score, wide && { fontSize: 120 }, { color: accent, transform: [{ scale: team === 'a' ? scoreAScale : scoreBScale }] }]}>{String(value).padStart(2, '0')}</Animated.Text>
            <View style={[styles.addPoint, { borderColor: accent }]}><Text style={[styles.addPointText, { color: accent }]}>+1</Text></View><Text style={styles.tapHint}>TAP TO SCORE</Text>
          </TouchableOpacity>;
        })}
      </View>
      <View style={styles.matchStatus}>{saving ? <ActivityIndicator color={colors.green} /> : match.winner ? <TouchableOpacity style={styles.saveResultButton} onPress={() => finishMatch(match)}><AppIcon name="content-save-outline" size={19} color={colors.ink} /><Text style={styles.saveResultText}>Save result</Text></TouchableOpacity> : <Text style={[styles.hint, (deuce || matchPoint) && { color: colors.green }]}>{matchPoint ? 'MATCH POINT · One more could do it.' : deuce ? 'DEUCE · Two clear points to win.' : 'Keep your eyes on the ball. Tap a side to score.'}</Text>}</View>
      <View style={styles.controlsRow}>
        <TouchableOpacity style={[styles.controlButton, (match.pointHistory.length === 0 || saving) && { opacity: 0.35 }]} disabled={match.pointHistory.length === 0 || saving} onPress={() => setMatch(undoPoint(match))}><AppIcon name="undo-variant" size={22} color={colors.text} /><Text style={styles.controlText}>Undo</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, saving && { opacity: 0.35 }]} disabled={saving} onPress={handleResetGame}><AppIcon name="restart" size={22} color={colors.text} /><Text style={styles.controlText}>Reset Game</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, saving && { opacity: 0.35 }]} disabled={saving} onPress={handleSwapSides}><AppIcon name="swap-horizontal" size={22} color={colors.text} /><Text style={styles.controlText}>Swap Sides</Text></TouchableOpacity>
      </View>
      <Text style={styles.bottomNote}>{deuce ? 'SERVE CHANGES EVERY POINT AT DEUCE' : `SERVE CHANGES EVERY ${serveInterval} ${serveInterval === 1 ? 'POINT' : 'POINTS'}`}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, justifyContent: 'center', padding: 22, width: '100%', maxWidth: 920, alignSelf: 'center', paddingBottom: 35 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }, title: { color: colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -1 }, liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.greenSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 }, liveText: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', gap: 15, marginTop: 18, marginBottom: 24, flexWrap: 'wrap' }, meta: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  serveBanner: { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }, serveBannerA: { backgroundColor: colors.greenSoft, borderColor: '#BFE4CD' }, serveBannerB: { backgroundColor: colors.redSoft, borderColor: '#F5C4C0' }, serveBannerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: colors.muted }, serveBannerName: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6 }, serveBall: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.text, marginRight: 6 },
  scoreRow: { flexDirection: 'row', gap: 12 }, scoreCard: { flex: 1, minWidth: 0, borderRadius: 24, borderWidth: 1, padding: 16, alignItems: 'center', minHeight: 290, justifyContent: 'center' }, cardA: { backgroundColor: colors.greenSoft, borderColor: '#BFE4CD' }, cardB: { backgroundColor: colors.redSoft, borderColor: '#F5C4C0' }, teamLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8, marginBottom: 15 }, playerList: { minHeight: 52, justifyContent: 'center', width: '100%' }, playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, gap: 5 }, playerIcon: { fontSize: 19 }, playerName: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'center' }, serverDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  score: { fontSize: 76, lineHeight: 135, fontWeight: '800', letterSpacing: -4, fontVariant: ['tabular-nums'], width: '100%', textAlign: 'center' }, addPoint: { borderWidth: 1, borderRadius: 15, paddingVertical: 6, paddingHorizontal: 17 }, addPointText: { fontSize: 18, fontWeight: '700' }, tapHint: { color: colors.muted, fontSize: 8, letterSpacing: 1.7, marginTop: 14 },
  matchStatus: { minHeight: 64, justifyContent: 'center', alignItems: 'center' }, hint: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 20 },
  saveResultButton: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  saveResultText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  controlsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  controlButton: { flex: 1, minHeight: 69, gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  controlText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  bottomNote: { color: colors.muted, fontSize: 8, textAlign: 'center', letterSpacing: 1.5, marginTop: 20 },
});
