import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GOURMET_AVATAR_PRESETS, type AvatarPresetId } from '@/constants/gourmet-avatars';
import { GastroColors } from '@/constants/theme';
import { checkNickname, updateGourmetProfile, uploadUserAvatar } from '@/lib/api';
import { useSession } from '@/context/session-context';

type Props = {
  visible: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
};

export function GourmetProfileSetupModal({
  visible,
  onComplete,
  onDismiss,
  dismissible = false,
}: Props) {
  const { user, refreshProfile } = useSession();
  const [nickname, setNickname] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<AvatarPresetId>('chef');
  const [avatarMode, setAvatarMode] = useState<'preset' | 'photo'>('preset');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [localPhotoMime, setLocalPhotoMime] = useState('image/jpeg');
  const [localPhotoName, setLocalPhotoName] = useState('avatar.jpg');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nicknameHint, setNicknameHint] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNickname('');
    setSelectedPreset('chef');
    setAvatarMode('preset');
    setLocalPhotoUri(null);
    setError(null);
    setNicknameHint(null);
  }, [visible]);

  const runNicknameCheck = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < 3) {
        setNicknameHint(null);
        return;
      }
      setChecking(true);
      try {
        const result = await checkNickname(trimmed, user?.email);
        setNicknameHint(result.available ? 'Uygun takma ad' : result.message ?? 'Uygun degil');
      } catch {
        setNicknameHint(null);
      } finally {
        setChecking(false);
      }
    },
    [user?.email],
  );

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => void runNicknameCheck(nickname), 400);
    return () => clearTimeout(timer);
  }, [nickname, visible, runNicknameCheck]);

  async function pickPhoto() {
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
    setLocalPhotoUri(asset.uri);
    setLocalPhotoMime(asset.mimeType ?? 'image/jpeg');
    setLocalPhotoName(asset.fileName ?? 'avatar.jpg');
    setAvatarMode('photo');
    setError(null);
  }

  async function onSave() {
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

      if (avatarMode === 'photo' && localPhotoUri) {
        await uploadUserAvatar(user.email, localPhotoUri, localPhotoMime, localPhotoName);
        await updateGourmetProfile({
          user_email: user.email,
          nickname: trimmed,
        });
      } else {
        await updateGourmetProfile({
          user_email: user.email,
          nickname: trimmed,
          avatar_preset: selectedPreset,
          use_preset_avatar: true,
        });
      }

      await refreshProfile();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Gurme profilin</Text>
            <Text style={styles.sub}>
              Gurme Sohbetler ve toplulukta seni taniyacak takma ad ve avatar sec.
            </Text>

            <Text style={styles.label}>Takma ad</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={21}
              placeholder="ornek: DonerciAyse"
              placeholderTextColor={GastroColors.placeholder}
              style={styles.input}
            />
            {checking ? <Text style={styles.hint}>Kontrol ediliyor...</Text> : null}
            {nicknameHint ? (
              <Text
                style={[
                  styles.hint,
                  nicknameHint === 'Uygun takma ad' ? styles.hintOk : styles.hintBad,
                ]}>
                {nicknameHint}
              </Text>
            ) : null}

            <Text style={styles.label}>Avatar</Text>
            <View style={styles.previewRow}>
              <UserAvatar
                avatarUrl={avatarMode === 'photo' ? localPhotoUri : null}
                avatarPreset={avatarMode === 'preset' ? selectedPreset : null}
                size={56}
                fallbackLabel={nickname || user?.email || '?'}
              />
              <Pressable style={styles.photoBtn} onPress={() => void pickPhoto()}>
                <Text style={styles.photoBtnText}>Kendi fotografim</Text>
              </Pressable>
            </View>

            <View style={styles.presetGrid}>
              {GOURMET_AVATAR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={[
                    styles.presetChip,
                    avatarMode === 'preset' && selectedPreset === preset.id && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    setAvatarMode('preset');
                    setSelectedPreset(preset.id);
                    setLocalPhotoUri(null);
                  }}>
                  <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={styles.btn}
              onPress={() => void onSave()}
              disabled={
                busy ||
                nickname.trim().length < 3 ||
                nicknameHint !== 'Uygun takma ad'
              }>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Kaydet ve devam et</Text>
              )}
            </Pressable>

            {dismissible && onDismiss ? (
              <Pressable style={styles.skipBtn} onPress={onDismiss}>
                <Text style={styles.skipText}>Simdilik atla</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: GastroColors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  content: { padding: 20, gap: 10, paddingBottom: 32 },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 19 },
  label: { color: GastroColors.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GastroColors.text,
    backgroundColor: GastroColors.input,
    fontSize: 16,
  },
  hint: { color: GastroColors.muted, fontSize: 12 },
  hintOk: { color: '#6ee7a0' },
  hintBad: { color: GastroColors.bad },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  photoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: GastroColors.accentSoft,
  },
  photoBtnText: { color: GastroColors.accent, fontWeight: '700', fontSize: 13 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  presetChip: {
    width: '30%',
    minWidth: 96,
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    backgroundColor: GastroColors.input,
  },
  presetChipActive: {
    borderColor: GastroColors.gold,
    backgroundColor: 'rgba(255, 183, 3, 0.12)',
  },
  presetEmoji: { fontSize: 24 },
  presetLabel: { color: GastroColors.muted, fontSize: 11, fontWeight: '600' },
  error: { color: GastroColors.bad, fontSize: 13 },
  btn: {
    marginTop: 8,
    backgroundColor: GastroColors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: GastroColors.muted, fontSize: 13 },
});
