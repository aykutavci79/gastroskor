import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GOURMET_AVATAR_PRESETS, type AvatarPresetId } from '@/constants/gourmet-avatars';
import { GastroColors } from '@/constants/theme';
import { checkNickname, updateGourmetProfile, uploadUserAvatar } from '@/lib/api';
import { useSession } from '@/context/session-context';

export function GourmetProfileSection() {
  const { user, refreshProfile } = useSession();
  const [editOpen, setEditOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<AvatarPresetId>('chef');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const openEdit = useCallback(() => {
    setNickname(user?.nickname ?? '');
    setSelectedPreset((user?.avatarPreset as AvatarPresetId) ?? 'chef');
    setError(null);
    setMessage(null);
    setEditOpen(true);
  }, [user?.avatarPreset, user?.nickname]);

  if (!user) return null;

  async function saveInline() {
    if (!user?.email) return;
    const trimmed = nickname.trim();
    if (trimmed.length < 3) {
      setError('Takma ad en az 3 karakter olmali.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const check = await checkNickname(trimmed, user.email);
      if (!check.available) {
        setError(check.message ?? 'Takma ad uygun degil.');
        return;
      }
      await updateGourmetProfile({
        user_email: user.email,
        nickname: trimmed,
        avatar_preset: selectedPreset,
        use_preset_avatar: true,
      });
      await refreshProfile();
      setEditOpen(false);
      setMessage('Gurme profili guncellendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    if (!user?.email) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    setError(null);
    try {
      await uploadUserAvatar(
        user.email,
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        asset.fileName ?? 'avatar.jpg',
      );
      await refreshProfile();
      setMessage('Profil fotografi guncellendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yukleme basarisiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Gurme profili</Text>
        <Text style={styles.sub}>Gurme Sohbetler ve toplulukta gorunecek kimligin.</Text>

        <View style={styles.row}>
          <UserAvatar
            avatarUrl={user.avatarUrl}
            avatarPreset={user.avatarPreset}
            size={52}
            fallbackLabel={user.nickname ?? user.fullName ?? user.email}
          />
          <View style={styles.meta}>
            <Text style={styles.nickname}>{user.nickname ?? 'Takma ad secilmedi'}</Text>
            <Text style={styles.muted}>{user.email}</Text>
          </View>
        </View>

        {message ? <Text style={styles.ok}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Pressable style={styles.btnOutline} onPress={openEdit} disabled={busy}>
            <Text style={styles.btnOutlineText}>Duzenle</Text>
          </Pressable>
          <Pressable style={styles.btnOutline} onPress={() => void pickPhoto()} disabled={busy}>
            <Text style={styles.btnOutlineText}>Foto yukle</Text>
          </Pressable>
        </View>

        {editOpen ? (
          <View style={styles.editBox}>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              maxLength={24}
              placeholder="Takma ad"
              placeholderTextColor={GastroColors.placeholder}
              style={styles.input}
            />
            <View style={styles.presetRow}>
              {GOURMET_AVATAR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={[styles.presetChip, selectedPreset === preset.id && styles.presetChipActive]}
                  onPress={() => setSelectedPreset(preset.id)}>
                  <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.btn} onPress={() => void saveInline()} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Kaydet</Text>
                )}
              </Pressable>
              <Pressable style={styles.btnOutline} onPress={() => setEditOpen(false)}>
                <Text style={styles.btnOutlineText}>Iptal</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.gold,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
  title: { color: GastroColors.gold, fontSize: 16, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flex: 1, gap: 2 },
  nickname: { color: GastroColors.text, fontSize: 17, fontWeight: '800' },
  muted: { color: GastroColors.muted, fontSize: 12 },
  ok: { color: '#6ee7a0', fontSize: 12 },
  error: { color: GastroColors.bad, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnOutlineText: { color: GastroColors.muted, fontWeight: '700', fontSize: 13 },
  editBox: { gap: 10, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: GastroColors.text,
    backgroundColor: GastroColors.input,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
  },
  presetChipActive: { borderColor: GastroColors.gold },
  presetEmoji: { fontSize: 22 },
  btn: {
    flex: 1,
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
});
