import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';
import { addPanelMenuItem, deletePanelMenuItem, getPanelMenu } from '@/lib/api';
import type { RestaurantMenuItem } from '@/lib/types';

type Props = { userEmail: string; subscriptionActive: boolean };

export function PanelMenuSection({ userEmail, subscriptionActive }: Props) {
  const [items, setItems] = useState<RestaurantMenuItem[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    getPanelMenu(userEmail).then((data) => setItems(data.items));
  }

  useEffect(() => {
    reload();
  }, [userEmail]);

  async function onAdd() {
    const priceNum = Number(price.replace(',', '.'));
    if (!name.trim() || Number.isNaN(priceNum)) return;
    setBusy(true);
    try {
      await addPanelMenuItem({ user_email: userEmail, name: name.trim(), price_tl: priceNum });
      setName('');
      setPrice('');
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    await deletePanelMenuItem(userEmail, id);
    reload();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Menu ve fiyatlar</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={styles.itemName}>
            {item.name} · {item.price_tl.toLocaleString('tr-TR')} TL
          </Text>
          <Pressable onPress={() => onDelete(item.id)} disabled={!subscriptionActive}>
            <Text style={styles.delete}>Sil</Text>
          </Pressable>
        </View>
      ))}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Urun adi"
        placeholderTextColor={GastroColors.muted}
        style={styles.input}
      />
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Fiyat TL"
        keyboardType="decimal-pad"
        placeholderTextColor={GastroColors.muted}
        style={styles.input}
      />
      <Pressable style={styles.btn} onPress={onAdd} disabled={!subscriptionActive || busy}>
        <Text style={styles.btnText}>Urun ekle</Text>
      </Pressable>
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
    gap: 8,
  },
  title: { color: GastroColors.text, fontWeight: '700', fontSize: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { ...GastroStyles.bodyText, flex: 1 },
  delete: { ...GastroStyles.errorText, fontSize: 12 },
  input: {
    ...GastroStyles.input,
    ...GastroStyles.inputSm,
  },
  btn: {
    ...GastroStyles.btnPrimary,
    borderRadius: 10,
  },
  btnText: GastroStyles.btnPrimaryText,
});
