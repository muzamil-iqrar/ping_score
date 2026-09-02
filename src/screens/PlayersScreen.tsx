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
  TouchableOpacity,
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
    fetchPlayers().then(setPlayers).catch((e) => Alert.alert('Error', e.message));
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
      Alert.alert('Error', e.message);
    }
  }

  function handleRemove(player: Player) {
    Alert.alert('Remove player', `Remove ${player.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePlayer(player.id);
            load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Add Player</Text>
      </TouchableOpacity>

      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No players yet. Add one above.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowIcon}>{item.icon}</Text>
            <Text style={styles.rowName}>{item.name}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemove(item)}>
              <Text style={styles.deleteButtonIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Player</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#6b7280"
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View style={styles.iconGrid}>
                {PLAYER_ICONS.map((i) => (
                  <TouchableOpacity
                    key={i}
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
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  rowIcon: { fontSize: 28, marginRight: 14 },
  rowName: { fontSize: 18, fontWeight: '500', flex: 1 },
  deleteButton: { paddingVertical: 6, paddingHorizontal: 10 },
  deleteButtonIcon: { fontSize: 20 },
  addButton: { backgroundColor: '#e63946', padding: 16, alignItems: 'center', margin: 16, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, fontSize: 16, color: '#1d3557', marginBottom: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: { borderColor: '#e63946', backgroundColor: '#fdeeee' },
  iconOptionText: { fontSize: 22 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#888' },
  saveButton: { backgroundColor: '#e63946', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
