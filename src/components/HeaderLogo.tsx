import { StyleSheet, Text, View } from 'react-native';
import { colors } from './ui';

export default function HeaderLogo() {
  return <View style={styles.container}><View style={styles.mark}><Text style={styles.symbol}>↗</Text></View><Text style={styles.logo}>ping<Text style={styles.accent}>score</Text><Text style={styles.dot}>.</Text></Text></View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  mark: { width: 27, height: 27, borderRadius: 9, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  symbol: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  logo: { color: colors.text, fontWeight: '800', fontSize: 23, letterSpacing: -1 },
  accent: { fontWeight: '400' },
  dot: { color: colors.lime },
});
