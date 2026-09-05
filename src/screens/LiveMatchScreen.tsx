import { colors, Reveal, Touch as TouchableOpacity, ui, useReducedMotion } from '../components/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { recordMatch, recordTournamentMatchResult } from '../lib/api';
import { useMatchSounds } from '../lib/sounds';
import { MatchMode, Player } from '../lib/types';
import { createMatch, currentServer, scorePoint, undoPoint } from '../state/matchEngine';

type Props = {
  navigation: any;
  route: {
    params: {
      mode: MatchMode;
      pointTarget: 10 | 20;
      serveInterval: number;
      teamA: string[];
      teamB: string[];
      players: Player[];
      tournamentId?: string;
      tournamentMatchId?: string;
      teamAEntryId?: string;
      teamBEntryId?: string;
    };
  };
};

export default function LiveMatchScreen({ navigation, route }: any) {
  const { mode, pointTarget, serveInterval, teamA, teamB, players, tournamentId, tournamentMatchId, teamAEntryId, teamBEntryId }: Props['route']['params'] = route.params;
  const [match, setMatch] = useState(() => createMatch(mode, pointTarget, serveInterval));
  const [saving, setSaving] = useState(false);
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

  async function handlePoint(team: 'a' | 'b') {
    if (match.winner || saving) return;
    const next = scorePoint(match, team);
    setMatch(next);
    bump(team === 'a' ? scoreAScale : scoreBScale);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sounds.playPoint();

    if (next.winner) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sounds.playWin();
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
        if (tournamentMatchId && teamAEntryId && teamBEntryId) {
          await recordTournamentMatchResult(tournamentMatchId, {
            team_a_score: next.scoreA,
            team_b_score: next.scoreB,
            winner_entry_id: next.winner === 'a' ? teamAEntryId : teamBEntryId,
          });
        }
        navigation.replace('MatchResult', {
          winnerLabel: teamLabel(next.winner === 'a' ? teamA : teamB),
          scoreA: next.scoreA,
          scoreB: next.scoreB,
          tournamentId,
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
        {isServing(team, slot) && <View style={[styles.serverDot, { backgroundColor: team === 'a' ? colors.lime : colors.blue }]} />}
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
          const accent = team === 'a' ? colors.lime : colors.blue;
          return <TouchableOpacity key={team} style={[styles.scoreCard, team === 'a' ? styles.cardA : styles.cardB, wide && { minHeight: 350 }]} onPress={() => handlePoint(team)} disabled={saving || Boolean(match.winner)} accessibilityLabel={`Add point to ${teamLabel(ids)}. Current score ${value}`}>
            <Text style={[styles.teamLabel, { color: accent }]}>TEAM {team.toUpperCase()}</Text>
            <View style={styles.playerList}>{ids.map((id, i) => renderTeamPlayer(id, team, i))}</View>
            <Animated.Text adjustsFontSizeToFit numberOfLines={1} style={[styles.score, wide && { fontSize: 120 }, { color: accent, transform: [{ scale: team === 'a' ? scoreAScale : scoreBScale }] }]}>{String(value).padStart(2, '0')}</Animated.Text>
            <View style={[styles.addPoint, { borderColor: team === 'a' ? '#4A6334' : '#375967' }]}><Text style={[styles.addPointText, { color: accent }]}>+1</Text></View><Text style={styles.tapHint}>TAP TO SCORE</Text>
          </TouchableOpacity>;
        })}
      </View>
      <View style={styles.matchStatus}>{saving ? <ActivityIndicator color={colors.lime} /> : <Text style={[styles.hint, (deuce || matchPoint) && { color: colors.lime }]}>{match.winner ? 'Match complete' : matchPoint ? 'MATCH POINT · One more could do it.' : deuce ? 'DEUCE · Two clear points to win.' : 'Keep your eyes on the ball. Tap a side to score.'}</Text>}</View>
      <TouchableOpacity style={[styles.undoButton, (!match.lastScoringTeam || saving) && { opacity: 0.35 }]} disabled={!match.lastScoringTeam || saving} onPress={() => setMatch(undoPoint(match))}><Text style={styles.undoText}>↶  Undo last point</Text></TouchableOpacity>
      <Text style={styles.bottomNote}>{deuce ? 'SERVE CHANGES EVERY POINT AT DEUCE' : `SERVE CHANGES EVERY ${serveInterval} ${serveInterval === 1 ? 'POINT' : 'POINTS'}`}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, justifyContent: 'center', padding: 22, width: '100%', maxWidth: 920, alignSelf: 'center', paddingBottom: 35 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }, title: { color: colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -1 }, liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.limeSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 }, liveText: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', gap: 15, marginTop: 18, marginBottom: 24, flexWrap: 'wrap' }, meta: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  serveBanner: { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }, serveBannerA: { backgroundColor: colors.limeSoft, borderColor: '#405632' }, serveBannerB: { backgroundColor: colors.blueSoft, borderColor: '#365260' }, serveBannerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: colors.muted }, serveBannerName: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6 }, serveBall: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.text, marginRight: 6 },
  scoreRow: { flexDirection: 'row', gap: 12 }, scoreCard: { flex: 1, minWidth: 0, borderRadius: 24, borderWidth: 1, padding: 16, alignItems: 'center', minHeight: 290, justifyContent: 'center' }, cardA: { backgroundColor: '#1B291C', borderColor: '#3C5130' }, cardB: { backgroundColor: '#17272D', borderColor: '#314C58' }, teamLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 17 }, playerList: { minHeight: 44, justifyContent: 'center', width: '100%' }, playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, gap: 4 }, playerIcon: { fontSize: 16 }, playerName: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'center' }, serverDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime },
  score: { fontSize: 76, lineHeight: 135, fontWeight: '800', letterSpacing: -4, fontVariant: ['tabular-nums'], width: '100%', textAlign: 'center' }, addPoint: { borderWidth: 1, borderRadius: 15, paddingVertical: 6, paddingHorizontal: 17 }, addPointText: { fontSize: 18, fontWeight: '700' }, tapHint: { color: colors.muted, fontSize: 8, letterSpacing: 1.7, marginTop: 14 },
  matchStatus: { minHeight: 64, justifyContent: 'center' }, hint: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 20 }, undoButton: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 25, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, undoText: { color: colors.text, fontSize: 13, fontWeight: '600' }, bottomNote: { color: colors.muted, fontSize: 8, textAlign: 'center', letterSpacing: 1.5, marginTop: 27 },
});
