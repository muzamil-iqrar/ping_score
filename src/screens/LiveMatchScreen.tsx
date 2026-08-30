import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { recordMatch } from '../lib/api';
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
    };
  };
};

export default function LiveMatchScreen({ navigation, route }: any) {
  const { mode, pointTarget, serveInterval, teamA, teamB, players }: Props['route']['params'] = route.params;
  const [match, setMatch] = useState(() => createMatch(mode, pointTarget, serveInterval));
  const [saving, setSaving] = useState(false);
  const sounds = useMatchSounds();

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const server = currentServer(match);
  const prevServerKey = useRef(`${server.team}${server.slot}`);

  const scoreAScale = useRef(new Animated.Value(1)).current;
  const scoreBScale = useRef(new Animated.Value(1)).current;
  const serveBannerScale = useRef(new Animated.Value(1)).current;

  function bump(anim: Animated.Value) {
    anim.setValue(1.3);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }

  useEffect(() => {
    const key = `${server.team}${server.slot}`;
    if (key !== prevServerKey.current) {
      prevServerKey.current = key;
      Animated.sequence([
        Animated.timing(serveBannerScale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.spring(serveBannerScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
      sounds.playServeSwitch();
    }
  }, [server.team, server.slot]);

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
      </View>
    );
  }

  const servingTeamLabel = teamLabel(server.team === 'a' ? teamA : teamB);
  const servingPlayerName = mode === 'doubles' ? nameFor((server.team === 'a' ? teamA : teamB)[server.slot]) : servingTeamLabel;
  const servingIcon = mode === 'doubles' ? iconFor((server.team === 'a' ? teamA : teamB)[server.slot]) : iconFor((server.team === 'a' ? teamA : teamB)[0]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.serveBanner,
          server.team === 'a' ? styles.serveBannerA : styles.serveBannerB,
          { transform: [{ scale: serveBannerScale }] },
        ]}
      >
        <Text style={styles.serveBannerLabel}>NOW SERVING</Text>
        <View style={styles.serveBannerRow}>
          <Text style={styles.serveBannerIcon}>{servingIcon}</Text>
          <Text style={styles.serveBannerName}>{servingPlayerName}</Text>
          <View style={styles.serveBall} />
        </View>
      </Animated.View>

      <View style={styles.scoreRow}>
        <TouchableOpacity style={[styles.scoreCard, styles.cardA]} onPress={() => handlePoint('a')} disabled={saving}>
          {teamA.map((id, i) => renderTeamPlayer(id, 'a', i))}
          <Animated.Text style={[styles.score, { transform: [{ scale: scoreAScale }] }]}>{match.scoreA}</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.scoreCard, styles.cardB]} onPress={() => handlePoint('b')} disabled={saving}>
          {teamB.map((id, i) => renderTeamPlayer(id, 'b', i))}
          <Animated.Text style={[styles.score, { transform: [{ scale: scoreBScale }] }]}>{match.scoreB}</Animated.Text>
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
  serveBanner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderWidth: 2,
  },
  serveBannerA: { backgroundColor: '#fdeeee', borderColor: '#e63946' },
  serveBannerB: { backgroundColor: '#eef2f7', borderColor: '#1d3557' },
  serveBannerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: '#888', textAlign: 'center' },
  serveBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, gap: 8 },
  serveBannerIcon: { fontSize: 26 },
  serveBannerName: { fontSize: 22, fontWeight: '800', color: '#222' },
  serveBall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ff8c00',
  },
  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', minHeight: 260, justifyContent: 'center' },
  cardA: { backgroundColor: '#fdeeee' },
  cardB: { backgroundColor: '#eef2f7' },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  playerIcon: { fontSize: 18, marginRight: 4 },
  playerName: { fontSize: 15, fontWeight: '600' },
  score: { fontSize: 64, fontWeight: '800', marginTop: 16 },
  hint: { textAlign: 'center', color: '#888', marginTop: 20 },
  undoButton: { alignSelf: 'center', marginTop: 20, padding: 12 },
  undoText: { color: '#888', fontSize: 15, textDecorationLine: 'underline' },
});
