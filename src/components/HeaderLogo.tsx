import { StyleSheet, Text, View } from 'react-native';

export default function HeaderLogo() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        Ping<Text style={styles.logoAccent}>Score</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 20, fontWeight: '800', fontStyle: 'italic', color: '#1d3557', letterSpacing: 0.5 },
  logoAccent: { color: '#e63946' },
});
