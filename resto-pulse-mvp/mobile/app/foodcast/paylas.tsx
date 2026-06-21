import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FoodCastTitle } from '@/components/FoodCastTitle';
import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useSession } from '@/context/session-context';
import { useKeyboardFieldFocus } from '@/hooks/use-keyboard-field-focus';
import { useStackKeyboardOffset } from '@/lib/keyboard-layout';
import { searchLivePlaces, uploadFoodcastPhoto } from '@/lib/api';
import { formatApiError } from '@/lib/format-api-error';
import type { LivePlaceSearchItem } from '@/lib/types';

type PhotoAsset = { uri: string; fileName: string; mimeType: string };

export default function FoodcastShareScreen() {
  const { city, cityLabel } = useCity();
  const router = useRouter();
  const { user } = useSession();
  const keyboardOffset = useStackKeyboardOffset();
  const scrollRef = useRef<ScrollView>(null);
  const onFieldFocus = useKeyboardFieldFocus(scrollRef);
  const dishNameY = useRef(0);
  const captionY = useRef(0);
  const searchY = useRef(0);

  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [dishName, setDishName] = useState('');
  const [caption, setCaption] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LivePlaceSearchItem[]>([]);
  const [selected, setSelected] = useState<LivePlaceSearchItem | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <Screen scroll keyboardVerticalOffset={keyboardOffset}>
        <Text style={styles.muted}>Tabak paylaşmak için giriş yap.</Text>
        <Pressable onPress={() => router.push('/(tabs)/profil')}>
          <Text style={styles.link}>Hesap →</Text>
        </Pressable>
      </Screen>
    );
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Galeri', 'Fotoğraf seçmek için galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      fileName: asset.fileName ?? `foodcast-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  async function searchRestaurants() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      let origin_lat: number | undefined;
      let origin_lng: number | undefined;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        origin_lat = pos.coords.latitude;
        origin_lng = pos.coords.longitude;
      }
      const response = await searchLivePlaces({
        q,
        city,
        limit: 8,
        origin_lat,
        origin_lng,
      });
      setResults(response.items.slice(0, 8));
    } catch (err) {
      Alert.alert('Arama', formatApiError(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    if (!user?.email) {
      Alert.alert('Giriş', 'Paylaşmak için giriş yap.');
      return;
    }
    if (!photo) {
      Alert.alert('FoodCast', 'Tabak fotoğrafı seç.');
      return;
    }
    if (!dishName.trim()) {
      Alert.alert('FoodCast', 'Yemek adı zorunlu (ör. İskender, cantık).');
      return;
    }
    if (!selected?.place_id) {
      Alert.alert('FoodCast', 'Restoran seç.');
      return;
    }

    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum', 'Tabak paylaşmak için konum izni gerekli (restorana yakın olmalısın).');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await uploadFoodcastPhoto({
        author_email: user.email,
        restaurant_id: selected.restaurant_id ?? undefined,
        google_place_id: selected.restaurant_id ? undefined : selected.place_id,
        city,
        dish_name: dishName.trim(),
        caption: caption.trim() || undefined,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        localUri: photo.uri,
        mimeType: photo.mimeType,
        fileName: photo.fileName,
      });
      Alert.alert('FoodCast', 'Tabak paylaşıldı!', [
        { text: 'Tamam', onPress: () => router.replace('/foodcast') },
      ]);
    } catch (err) {
      Alert.alert('FoodCast', formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll scrollRef={scrollRef} keyboardVerticalOffset={keyboardOffset} style={styles.gap}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Geri</Text>
      </Pressable>

      <FoodCastTitle size="md" />
      <Text style={styles.sub}>
        Yorumdan ayrı — sadece iştah açan tabak fotoğrafları. Restorana yakın olmalısın (~200 m).
      </Text>

      <Pressable style={styles.photoBox} onPress={() => void pickPhoto()}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
        ) : (
          <Text style={styles.photoPlaceholder}>📸 Tabak fotoğrafı seç</Text>
        )}
      </Pressable>

      <View
        onLayout={(event) => {
          dishNameY.current = event.nativeEvent.layout.y;
        }}>
        <TextInput
          value={dishName}
          onChangeText={setDishName}
          onFocus={() => onFieldFocus(dishNameY.current)}
          placeholder="Yemek adı (ör. İskender)"
          placeholderTextColor={GastroColors.placeholder}
          style={styles.input}
        />
      </View>

      <View
        onLayout={(event) => {
          captionY.current = event.nativeEvent.layout.y;
        }}>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          onFocus={() => onFieldFocus(captionY.current)}
          placeholder="Kısa not (opsiyonel)"
          placeholderTextColor={GastroColors.placeholder}
          style={styles.input}
          maxLength={200}
        />
      </View>

      <Text style={styles.label}>Restoran</Text>
      <View
        style={styles.searchRow}
        onLayout={(event) => {
          searchY.current = event.nativeEvent.layout.y;
        }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => onFieldFocus(searchY.current)}
          placeholder="Restoran ara (canlı Google)"
          placeholderTextColor={GastroColors.placeholder}
          style={[styles.input, styles.searchInput]}
          onSubmitEditing={() => void searchRestaurants()}
        />
        <Pressable style={styles.searchBtn} onPress={() => void searchRestaurants()} disabled={searching}>
          <Text style={styles.searchBtnText}>{searching ? '…' : 'Ara'}</Text>
        </Pressable>
      </View>

      {selected ? (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedTitle}>{selected.name}</Text>
          <Text style={styles.selectedSub}>{selected.address ?? cityLabel}</Text>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.clear}>Seçimi temizle</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.results}>
        {results.map((row) => (
          <Pressable key={row.place_id} style={styles.resultRow} onPress={() => setSelected(row)}>
            <Text style={styles.resultName}>{row.name}</Text>
            <Text style={styles.resultSub}>{row.address ?? ''}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[styles.submitBtn, busy && styles.submitDisabled]} disabled={busy} onPress={() => void submit()}>
        {busy ? (
          <ActivityIndicator color={GastroColors.text} />
        ) : (
          <Text style={styles.submitText}>FoodCast&apos;e paylaş</Text>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  back: { color: GastroColors.muted, fontSize: 14 },
  sub: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  photoBox: {
    minHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: 220 },
  photoPlaceholder: { color: GastroColors.muted, fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 10,
    backgroundColor: GastroColors.input,
    color: GastroColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  label: { color: GastroColors.text, fontSize: 13, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1 },
  searchBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBtnText: { color: GastroColors.accent, fontWeight: '700' },
  selectedBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
    padding: 10,
    gap: 2,
  },
  selectedTitle: { color: GastroColors.text, fontWeight: '800' },
  selectedSub: { color: GastroColors.muted, fontSize: 12 },
  clear: { color: GastroColors.accent, fontSize: 12, marginTop: 4, fontWeight: '600' },
  results: { gap: 8 },
  resultRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 10,
  },
  resultName: { color: GastroColors.text, fontWeight: '700' },
  resultSub: { color: GastroColors.muted, fontSize: 12 },
  submitBtn: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: GastroColors.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: GastroColors.text, fontSize: 15, fontWeight: '800' },
  muted: { color: GastroColors.muted },
  link: { color: GastroColors.accent, marginTop: 8, fontWeight: '700' },
});
