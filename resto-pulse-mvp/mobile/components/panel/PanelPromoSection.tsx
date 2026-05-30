import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';
import { getPanelPromo, updatePanelPromo, uploadPanelMenuImage } from '@/lib/api';

type Props = { userEmail: string; subscriptionActive: boolean };

export function PanelPromoSection({ userEmail, subscriptionActive }: Props) {
  const [hasCourier, setHasCourier] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPanelPromo(userEmail).then((data) => {
      setHasCourier(data.has_own_courier);
      setOfferText(data.direct_order_text ?? '');
      setPhone(data.direct_order_phone ?? '');
      setWhatsapp(data.direct_order_whatsapp ?? '');
      setWebsite(data.direct_order_url ?? '');
      setInstagram(data.instagram ?? '');
      setMenuImageUrl(data.menu_image_url);
    });
  }, [userEmail]);

  async function onSave() {
    setBusy(true);
    setMessage(null);
    try {
      await updatePanelPromo({
        user_email: userEmail,
        has_own_courier: hasCourier,
        direct_order_text: offerText.trim() || null,
        direct_order_phone: phone.trim() || null,
        direct_order_whatsapp: whatsapp.trim() || null,
        direct_order_url: website.trim() || null,
        instagram: instagram.trim() || null,
        menu_image_url: menuImageUrl,
      });
      setMessage('Kaydedildi');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Hata');
    } finally {
      setBusy(false);
    }
  }

  async function onPickMenuPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const mime = asset.mimeType ?? 'image/jpeg';
      const name = asset.fileName ?? 'menu.jpg';
      const uploaded = await uploadPanelMenuImage(userEmail, asset.uri, mime, name);
      setMenuImageUrl(uploaded.menu_image_url);
      setMessage('Menu fotografi yuklendi');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Yukleme hatasi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Musteri karti rozetleri</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Kendi kurye</Text>
        <Switch value={hasCourier} onValueChange={setHasCourier} disabled={!subscriptionActive} />
      </View>
      <Field label="Teklif metni" value={offerText} onChange={setOfferText} />
      <Field label="Telefon" value={phone} onChange={setPhone} />
      <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
      <Field label="Web sitesi" value={website} onChange={setWebsite} />
      <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@mekan" />
      {menuImageUrl ? (
        <Image source={{ uri: menuImageUrl }} style={styles.preview} resizeMode="contain" />
      ) : null}
      <Pressable style={styles.btnOutline} onPress={onPickMenuPhoto} disabled={!subscriptionActive || busy}>
        <Text style={styles.btnOutlineText}>Menu fotografi yukle</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={onSave} disabled={!subscriptionActive || busy}>
        <Text style={styles.btnText}>{busy ? '...' : 'Kaydet'}</Text>
      </Pressable>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={GastroColors.placeholder}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    gap: 10,
  },
  title: { color: GastroColors.text, fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: GastroColors.muted, fontSize: 12 },
  input: {
    ...GastroStyles.input,
    ...GastroStyles.inputSm,
  },
  preview: { width: '100%', height: 120, ...GastroStyles.previewSurface },
  btn: GastroStyles.btnPrimary,
  btnText: GastroStyles.btnPrimaryText,
  btnOutline: {
    ...GastroStyles.btnOutline,
    borderRadius: 10,
    padding: 10,
  },
  btnOutlineText: { ...GastroStyles.btnOutlineText, fontSize: 13 },
  msg: { color: GastroColors.accent, fontSize: 12 },
});
