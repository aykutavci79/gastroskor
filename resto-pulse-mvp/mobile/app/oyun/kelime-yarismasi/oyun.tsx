import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KelimeYarismasiHarfKutulari } from '@/components/kelime-yarismasi/KelimeYarismasiHarfKutulari';
import {
  CEVAP_SURE_MS,
  JOKER_MAX_TOPLAM_SURE_MS,
  JOKER_SURE_BONUS_MS,
} from '@/constants/kelime-yarismasi';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import { notifyFriendsEglenceActivity } from '@/lib/eglence-friend-activity';
import { kelimeIstatistikYukle, turSonucuKaydet } from '@/lib/kelime-yarismasi/kelime-istatistik';
import {
  aktifTurKaydi,
  asamaAyarla,
  bosOyun,
  jokerSureEklenebilir,
  jokerUygula,
  maskeleKelime,
  sonrakiTuraGec,
  tahminDene,
  turSonuc,
  type OyunDurumu,
  type TurAsama,
} from '@/lib/kelime-yarismasi/oyun-motoru';
import {
  soruBildir,
  soruBildirildiMi,
  soruBildirimKuyrugunuSenkronla,
  type SoruBildirNeden,
} from '@/lib/kelime-yarismasi/soru-bildirimi';
import { kokenEtiketi, turPaketiOlustur } from '@/lib/kelime-yarismasi/soru-paketi';
import { sureMetni } from '@/lib/kelime-yarismasi/sure-yardimci';

export default function KelimeYarismasiOyunScreen() {
  const { colors } = useGastroTheme();
  const [oyun, setOyun] = useState<OyunDurumu | null>(null);

  useEffect(() => {
    let aktif = true;
    kelimeIstatistikYukle().then(() => {
      void soruBildirimKuyrugunuSenkronla();
      if (aktif) setOyun(bosOyun(turPaketiOlustur()));
    });
    return () => {
      aktif = false;
    };
  }, []);

  const loadingStyle = useMemo(
    () =>
      StyleSheet.create({
        wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
        text: { color: colors.muted, fontSize: 16 },
      }),
    [colors],
  );

  if (!oyun) {
    return (
      <View style={loadingStyle.wrap}>
        <Text style={loadingStyle.text}>Oyun hazırlanıyor…</Text>
      </View>
    );
  }

  return <OyunIcerik oyun={oyun} setOyun={setOyun} />;
}

function OyunIcerik({
  oyun,
  setOyun,
}: {
  oyun: OyunDurumu;
  setOyun: React.Dispatch<React.SetStateAction<OyunDurumu>>;
}) {
  const router = useRouter();
  const { colors } = useGastroTheme();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const [tahmin, setTahmin] = useState('');
  const [cevapKalanSn, setCevapKalanSn] = useState(CEVAP_SURE_MS / 1000);
  const [bildirildi, setBildirildi] = useState(false);
  const [bildirMesaj, setBildirMesaj] = useState('');

  const asamaRef = useRef<TurAsama>('oku');
  const cevapBitisRef = useRef(0);
  const kayitliTurRef = useRef<number | null>(null);
  const arkadasBildirildiRef = useRef(false);
  const tahminInputRef = useRef<TextInput>(null);
  asamaRef.current = oyun.asama;

  const tur = aktifTurKaydi(oyun);
  const harfSayisi = tur ? tur.soru.harfSayisi : 0;

  const harfler = useMemo(() => {
    if (!tur) return [];
    return maskeleKelime(tur.soru.cevap, new Set(tur.acilanIndeksler));
  }, [tur]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        kok: { flex: 1 },
        scroll: { flex: 1 },
        scrollIcerik: { padding: 16, gap: 14 },
        ust: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
        tur: { fontSize: 15, fontWeight: '600', color: colors.muted },
        yarismaSure: { fontSize: 13, fontWeight: '600', color: colors.sky, marginTop: 4 },
        puan: { fontSize: 16, fontWeight: '700', color: colors.accent },
        ipucuKutu: {
          backgroundColor: colors.panel,
          borderRadius: 12,
          padding: 16,
          gap: 8,
          minHeight: 100,
          borderWidth: 1,
          borderColor: colors.border,
        },
        ipucuUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
        bildir: {
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: colors.border,
        },
        bildirildi: { opacity: 0.6 },
        bildirYazi: { fontSize: 12, fontWeight: '700', color: colors.muted },
        bildirMesaj: { fontSize: 12, color: colors.sky, fontWeight: '600' },
        koken: { fontSize: 12, color: colors.sky, fontWeight: '600' },
        ipucu: { fontSize: 17, color: colors.text, lineHeight: 24 },
        ipucuNot: { textAlign: 'center', color: colors.muted, fontSize: 14, lineHeight: 20 },
        cevapVer: {
          backgroundColor: colors.success,
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          gap: 4,
        },
        cevapVerYazi: { fontSize: 18, fontWeight: '800', color: '#fff' },
        cevapVerAlt: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
        duraklatildi: { textAlign: 'center', color: colors.gold, fontSize: 13, fontWeight: '600' },
        joker: {
          backgroundColor: colors.accent,
          borderRadius: 10,
          padding: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.accentHover,
        },
        jokerPasif: { opacity: 0.4 },
        jokerYazi: { color: '#fff', fontWeight: '800', fontSize: 15 },
        jokerAlt: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2, textAlign: 'center' },
        input: {
          backgroundColor: colors.input,
          borderRadius: 10,
          padding: 14,
          fontSize: 18,
          color: colors.text,
          borderWidth: 2,
          borderColor: colors.border,
        },
        gonder: {
          backgroundColor: colors.panel,
          borderRadius: 10,
          padding: 14,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: colors.text,
        },
        gonderYazi: { fontSize: 16, fontWeight: '700', color: colors.text },
        turSonu: { alignItems: 'center', gap: 12, marginTop: 8 },
        turSonuBaslik: { fontSize: 20, fontWeight: '800', color: colors.text },
        dogruCevap: { fontSize: 16, color: colors.muted },
        cevapAlani: {
          paddingHorizontal: 16,
          paddingTop: 10,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
        },
      }),
    [colors],
  );

  useEffect(() => {
    setTahmin('');
    if (oyun.asama === 'cevap') {
      const id = setTimeout(() => tahminInputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
  }, [oyun.aktifTur, oyun.asama]);

  useEffect(() => {
    let aktif = true;
    if (!tur) return;
    void soruBildirildiMi(tur.soru.id).then((evet) => {
      if (aktif) {
        setBildirildi(evet);
        setBildirMesaj('');
      }
    });
    return () => {
      aktif = false;
    };
  }, [tur?.soru.id]);

  useEffect(() => {
    if (oyun.bitti || oyun.asama !== 'oku') return;
    let sonTick = Date.now();
    const timer = setInterval(() => {
      const simdi = Date.now();
      const delta = simdi - sonTick;
      sonTick = simdi;
      setOyun((o) => ({ ...o, toplamSureMs: o.toplamSureMs + delta }));
    }, 100);
    return () => clearInterval(timer);
  }, [oyun.aktifTur, oyun.asama, oyun.bitti, setOyun]);

  useEffect(() => {
    if (oyun.bitti || oyun.asama !== 'cevap') return;
    cevapBitisRef.current = Date.now() + CEVAP_SURE_MS;
    setCevapKalanSn(Math.ceil(CEVAP_SURE_MS / 1000));
    const timer = setInterval(() => {
      const kalan = cevapBitisRef.current - Date.now();
      setCevapKalanSn(Math.max(0, Math.ceil(kalan / 1000)));
      if (kalan > 0) return;
      clearInterval(timer);
      if (asamaRef.current === 'cevap') {
        setOyun((o) => turSonuc(o, 'sure'));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [oyun.aktifTur, oyun.asama, oyun.bitti, setOyun]);

  useEffect(() => {
    if (!tur?.sonuc || oyun.asama !== 'tur_sonu') return;
    if (kayitliTurRef.current === tur.turNo) return;
    kayitliTurRef.current = tur.turNo;
    void turSonucuKaydet(tur);
  }, [oyun.asama, tur?.turNo, tur?.sonuc]);

  useEffect(() => {
    if (oyun.asama !== 'tur_sonu') return;
    const id = setTimeout(() => {
      setOyun((o) => {
        const sonraki = sonrakiTuraGec(o);
        if (sonraki.bitti) {
          if (!arkadasBildirildiRef.current) {
            arkadasBildirildiRef.current = true;
            notifyFriendsEglenceActivity(user?.email, {
              game: 'kelime_yarismasi',
              score: sonraki.toplamPuan,
              elapsedMs: sonraki.toplamSureMs,
            });
          }
          router.replace({
            pathname: '/oyun/kelime-yarismasi/sonuc',
            params: {
              puan: String(sonraki.toplamPuan),
              sure: String(sonraki.toplamSureMs),
              maksimum: String(sonraki.turlar.reduce((acc, t) => acc + t.soru.harfSayisi, 0)),
            },
          });
        }
        return sonraki;
      });
    }, 1400);
    return () => clearTimeout(id);
  }, [oyun.asama, oyun.aktifTur, router, setOyun, user?.email]);

  const cevapVerBas = useCallback(() => {
    if (oyun.asama !== 'oku') return;
    setOyun((o) => asamaAyarla(o, 'cevap'));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [oyun.asama, setOyun]);

  const gonder = useCallback(() => {
    if (!tahmin.trim() || oyun.asama !== 'cevap') return;
    setOyun((o) => {
      const onceki = aktifTurKaydi(o);
      const yeni = tahminDene(o, tahmin);
      const kayit = aktifTurKaydi(yeni);
      if (kayit?.sonuc === 'dogru') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (onceki && kayit?.sonuc === 'yanlis') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return yeni;
    });
    setTahmin('');
  }, [tahmin, oyun.asama, setOyun]);

  const jokerBas = useCallback(() => {
    if (oyun.asama !== 'cevap' || !tur) return;
    const eklenecek = jokerSureEklenebilir(tur);
    setOyun((o) => {
      const onceki = aktifTurKaydi(o)?.acilanIndeksler.length ?? 0;
      const yeni = jokerUygula(o);
      const sonra = aktifTurKaydi(yeni)?.acilanIndeksler.length ?? 0;
      if (sonra > onceki) {
        if (eklenecek > 0) cevapBitisRef.current += eklenecek;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return yeni;
    });
  }, [oyun.asama, tur, setOyun]);

  const bildirGonder = useCallback(
    async (neden: SoruBildirNeden) => {
      if (!tur || bildirildi) return;
      const sonuc = await soruBildir(tur.soru, neden, tur.turNo);
      if (!sonuc.ok) {
        setBildirMesaj('Bu soruyu zaten bildirdin');
        return;
      }
      setBildirildi(true);
      setBildirMesaj(sonuc.uzak ? 'Kaydedildi, teşekkürler' : 'Cihazda kaydedildi');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setBildirMesaj(''), 2500);
    },
    [bildirildi, tur],
  );

  const bildirBas = useCallback(() => {
    if (!tur || bildirildi) return;
    Alert.alert('Sorunu bildir', 'Ne sorun var?', [
      { text: 'İpucu garip', onPress: () => void bildirGonder('ipucu_garip') },
      { text: 'Cevap şüpheli', onPress: () => void bildirGonder('cevap_supheli') },
      { text: 'Çok zor', onPress: () => void bildirGonder('cok_zor') },
      { text: 'Genel', onPress: () => void bildirGonder('genel') },
      { text: 'İptal', style: 'cancel' },
    ]);
  }, [bildirGonder, bildirildi, tur]);

  if (!tur) {
    return (
      <View style={styles.kok}>
        <Text style={styles.ipucuNot}>Tur yükleniyor…</Text>
      </View>
    );
  }

  const jokerSureKalan = Math.max(0, JOKER_MAX_TOPLAM_SURE_MS - tur.jokerSayisi * JOKER_SURE_BONUS_MS);
  const harflerAcik = tur.acilanIndeksler.length < harfSayisi;
  const jokerSureBitti = jokerSureKalan <= 0;
  const turSonucMetni =
    tur.sonuc === 'dogru'
      ? `Doğru! +${tur.puan} puan`
      : tur.sonuc === 'yanlis'
        ? 'Yanlış cevap'
        : tur.sonuc === 'sure'
          ? 'Süre doldu — puan yok'
          : '';

  return (
    <View style={styles.kok}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollIcerik,
          oyun.asama === 'cevap' ? { paddingBottom: 12 } : { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.ust}>
          <View>
            <Text style={styles.tur}>
              Tur {tur.turNo} / {oyun.turlar.length} · {harfSayisi} harf
            </Text>
            <Text style={styles.yarismaSure}>
              Yarışma süresi: {sureMetni(oyun.toplamSureMs)}
              {oyun.asama === 'cevap' ? ' · durdu' : ''}
            </Text>
          </View>
          <Text style={styles.puan}>Toplam: {oyun.toplamPuan}</Text>
        </View>

        <View style={styles.ipucuKutu}>
          <View style={styles.ipucuUst}>
            <Text style={styles.koken}>
              {kokenEtiketi(tur.soru.koken)}
              {tur.soru.kokenNot ? ` · ${tur.soru.kokenNot}` : ''}
            </Text>
            <Pressable
              style={[styles.bildir, bildirildi && styles.bildirildi]}
              onPress={bildirBas}
              disabled={bildirildi}
              hitSlop={8}>
              <Text style={styles.bildirYazi}>{bildirildi ? 'Bildirildi' : 'Bildir'}</Text>
            </Pressable>
          </View>
          <Text style={styles.ipucu}>{tur.soru.ipucu}</Text>
          {bildirMesaj ? <Text style={styles.bildirMesaj}>{bildirMesaj}</Text> : null}
        </View>

        <KelimeYarismasiHarfKutulari harfler={harfler} kucuk={harfSayisi > 10} />

        {oyun.asama === 'oku' ? (
          <>
            <Text style={styles.ipucuNot}>İpucunu oku; yarışma süresi işliyor. Hazır olunca cevap ver.</Text>
            <Pressable style={styles.cevapVer} onPress={cevapVerBas}>
              <Text style={styles.cevapVerYazi}>Cevap ver</Text>
              <Text style={styles.cevapVerAlt}>
                Basınca süre durur · {CEVAP_SURE_MS / 1000} sn yazma hakkı
              </Text>
            </Pressable>
          </>
        ) : null}

        {oyun.asama === 'cevap' ? (
          <>
            <Text style={styles.duraklatildi}>
              Cevap süresi: {cevapKalanSn} sn
              {!jokerSureBitti ? ` · jokerden +${jokerSureKalan / 1000} sn kaldı` : ''}
            </Text>
            <Pressable
              style={[styles.joker, !harflerAcik && styles.jokerPasif]}
              disabled={!harflerAcik}
              onPress={jokerBas}>
              <Text style={styles.jokerYazi}>Joker (rastgele harf)</Text>
              <Text style={styles.jokerAlt}>
                {jokerSureBitti
                  ? 'Süre bonusu doldu (+15 sn) · harf açmaya devam'
                  : `+${JOKER_SURE_BONUS_MS / 1000} sn (max +${JOKER_MAX_TOPLAM_SURE_MS / 1000} sn) · kullanılan ${tur.jokerSayisi}`}
              </Text>
            </Pressable>
          </>
        ) : null}

        {oyun.asama === 'tur_sonu' ? (
          <View style={styles.turSonu}>
            <Text style={styles.turSonuBaslik}>{turSonucMetni}</Text>
            <Text style={styles.dogruCevap}>Cevap: {tur.soru.cevap}</Text>
            <KelimeYarismasiHarfKutulari harfler={[...tur.soru.cevap]} kucuk={harfSayisi > 10} />
          </View>
        ) : null}
      </ScrollView>

      {oyun.asama === 'cevap' ? (
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View style={[styles.cevapAlani, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              ref={tahminInputRef}
              style={styles.input}
              value={tahmin}
              onChangeText={setTahmin}
              placeholder="Cevabını yaz..."
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={gonder}
              returnKeyType="done"
            />
            <Pressable style={styles.gonder} onPress={gonder}>
              <Text style={styles.gonderYazi}>Gönder</Text>
            </Pressable>
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
