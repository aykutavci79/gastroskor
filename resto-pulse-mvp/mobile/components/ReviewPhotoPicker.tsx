import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

export type ReviewPhotoAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

type Props = {
  photos: ReviewPhotoAsset[];
  onChange: (photos: ReviewPhotoAsset[]) => void;
};

export function ReviewPhotoPicker({ photos, onChange }: Props) {
  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 4 - photos.length),
      quality: 0.8,
    });
    if (result.canceled) return;
    const next = [
      ...photos,
      ...result.assets.map((asset, index) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      })),
    ].slice(0, 4);
    onChange(next);
  }

  function removePhoto(uri: string) {
    onChange(photos.filter((p) => p.uri !== uri));
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.addBtn} onPress={() => void pickPhotos()}>
        <Text style={styles.addBtnText}>📸 Fotoğraf Ekle</Text>
      </Pressable>
      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photos.map((photo) => (
            <View key={photo.uri} style={styles.thumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
              <Pressable style={styles.removeBtn} onPress={() => removePhoto(photo.uri)}>
                <Text style={styles.removeText}>❌</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  addBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: { color: GastroColors.text, fontSize: 13, fontWeight: '600' },
  thumbs: { gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: GastroColors.input },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: GastroColors.panel,
    borderRadius: 999,
  },
  removeText: { fontSize: 12 },
});
