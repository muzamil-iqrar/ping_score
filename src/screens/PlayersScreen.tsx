import { AppIcon, colors, confirmDestructive, EmptyState, errorMessage, PageHeading, Reveal, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addPlayer, fetchPlayers, removePlayer } from '../lib/api';
import { PLAYER_ICONS, Player } from '../lib/types';

export default function PlayersScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(PLAYER_ICONS[0]);

  const load = useCallback(() => {
    fetchPlayers().then(setPlayers).catch((e) => Alert.alert('Error', errorMessage(e)));
  }, []);

  useFocusEffect(load);

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      await addPlayer(name.trim(), icon);
      setName('');
      setIcon(PLAYER_ICONS[0]);
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', errorMessage(e));
    }
  }

  function handleRemove(player: Player) {
    confirmDestructive('Remove player', `Remove ${player.name}?`, 'Remove', async () => {
      try {
        await removePlayer(player.id);
        load();
      } catch (e: any) {
        Alert.alert('Error', errorMessage(e));
      }
    });
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={<><PageHeading eyebrow="THE CLUB" title="Your starting lineup." subtitle={`${players.length} ${players.length === 1 ? 'player' : 'players'}. Always room for one more.`} /><TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}><AppIcon name="plus" size={21} color={colors.ink} /><Text style={styles.addButtonText}>Add player</Text></TouchableOpacity></>}
        data={players}
        keyExtractor={(p) => p.id}
        contentContainerStyle={ui.content}
        ListEmptyComponent={<EmptyState title="Who’s up for a game?" detail="Add your first player with a name and an avatar. Your lineup will appear here." />}
        renderItem={({ item }) => (
          <Reveal style={styles.row}>
            <Text style={styles.rowIcon}>{item.icon}</Text>
            <Text style={styles.rowName}>{item.name}</Text>
            <TouchableOpacity accessibilityLabel={`Remove ${item.name}`} style={styles.deleteButton} onPress={() => handleRemove(item)}>
              <AppIcon name="delete-outline" size={22} color={colors.muted} />
            </TouchableOpacity>
          </Reveal>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Player</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View style={styles.iconGrid}>
                {PLAYER_ICONS.map((i) => (
                  <TouchableOpacity
                    key={i}
                    accessibilityLabel={`Choose ${i} avatar`}
                    accessibilityState={{ selected: icon === i }}
                    style={[styles.iconOption, icon === i && styles.iconOptionSelected]}
                    onPress={() => setIcon(i)}
                  >
                    <Text style={styles.iconOptionText}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 10,
  },
  rowIcon: { fontSize: 28, marginRight: 14 },
  rowName: { color: colors.text, fontSize: 18, fontWeight: '500', flex: 1 },
  deleteButton: { paddingVertical: 6, paddingHorizontal: 10 },
  addButton: { backgroundColor: colors.text, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginBottom: 22, borderRadius: 14 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 16, color: colors.text, marginBottom: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  iconOptionText: { fontSize: 22 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  cancelText: { fontSize: 16, color: colors.muted },
  saveButton: { backgroundColor: colors.text, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
