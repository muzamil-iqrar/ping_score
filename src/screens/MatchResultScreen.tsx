import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  navigation: any;
  route: { params: { winnerLabel: string; scoreA: number; scoreB: number } };
};

export default function MatchResultScreen({ navigation, route }: any) {
  const { winnerLabel, scoreA, scoreB }: Props['route']['params'] = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.winner}>{winnerLabel} wins!</Text>
      <Text style={styles.score}>
        {scoreA} - {scoreB}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'NewMatch' }] })}
      >
        <Text style={styles.buttonText}>New Match</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  trophy: { fontSize: 72, marginBottom: 16 },
  winner: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  score: { fontSize: 20, color: '#666', marginBottom: 32 },
  button: { backgroundColor: '#e63946', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  homeButton: { marginTop: 16, padding: 8 },
  homeButtonText: { color: '#888', fontSize: 15, textDecorationLine: 'underline' },
});
