# GastroSkor Jeton Ekonomisi — Teknik Spesifikasyon (v1)

Son güncelleme: 18 Haziran 2026

## 1. Amaç ve Kapsam

Jeton, platform içi aksiyonlarla kazanılan oyun içi para birimidir. Kelime Sofrası, Mini Sudoku vb. mini oyunlarda ipucu ve ek hak için harcanır. Gerçek para değeri taşımaz.

**Temel prensip:** Jeton tetikleyicisi istemciden gelen “tamamladım” beyanına güvenmez. Her ödül sunucuda doğrulanmış durum değişikliğinden gelir (sipariş `accepted`, takip kaydı, referral onayı).

## 2. Veri Modeli

### 2.1 `wallets`
| Alan | Tip | Not |
|---|---|---|
| user_id | PK, FK | |
| balance | int | Ledger ile uyumlu cache; `SELECT FOR UPDATE` ile güncellenir |
| updated_at | timestamp | |

### 2.2 `jeton_ledger` (asla silinmez)
| Alan | Tip | Not |
|---|---|---|
| id | PK | |
| user_id | FK | |
| source | enum | `order`, `follow`, `referral`, `clawback`, `game_spend`, `manual_adjustment` |
| source_id | string | order_id / restaurant_id / referred_user_id |
| amount | int | pozitif = kazanım, negatif = clawback veya harcama |
| status | enum | `posted`, `pending`, `rejected` — flagged ödüller `pending` |
| related_ledger_id | FK, nullable | clawback → orijinal earn satırı |
| idempotency_key | string, **unique** | örn. `order_earn:{order_id}` |
| created_at | timestamp | |

### 2.3 `jeton_follow_rewards` (unfollow’dan bağımsız lifetime kayıt)
| Alan | Tip | Not |
|---|---|---|
| user_id | FK | |
| restaurant_id | FK | |
| rewarded_at | timestamp | |
| UNIQUE(user_id, restaurant_id) | | unfollow satırı silinse bile ödül tekrarlanmaz |

Mevcut `user_restaurant_follows` tablosu aynen kalır; unfollow hâlâ satır siler. Lifetime ödül bu ayrı tabloda tutulur.

### 2.4 `referrals`
| Alan | Tip | Not |
|---|---|---|
| referrer_id | FK | |
| referred_id | FK, **unique** | |
| device_hash | string, nullable | |
| ip_at_signup | string, nullable | |
| status | enum | `pending`, `rewarded`, `flagged`, `rejected` |
| rewarded_at | timestamp, nullable | |

### 2.5 `referral_attributions` (7 gün penceresi)
| Alan | Tip | Not |
|---|---|---|
| id | PK | |
| referrer_id | FK | |
| device_hash | string | |
| clicked_at | timestamp | |
| expires_at | timestamp | click + 7 gün |

### 2.6 `jeton_daily_earn_totals`
| Alan | Tip | Not |
|---|---|---|
| user_id | FK | |
| earn_date | date | **Europe/Istanbul** |
| total_earned | int | |
| UNIQUE(user_id, earn_date) | | |

### 2.7 `users` ek alan
| Alan | Tip | Not |
|---|---|---|
| first_order_bonus_claimed | bool | ilk sipariş +5 jeton |

## 3. Görev Kuralları (v1)

### 3.1 Online sipariş — 15 jeton (+5 ilk sipariş)
- **Tetikleyici:** `RestaurantOrderStatus.accepted` (mevcut enum’da `delivered` yok; v1 geçici olarak `accepted` kullanılır).
- `idempotency_key = order_earn:{order_id}`
- İlk sipariş: `users.first_order_bonus_claimed` → toplam 20 jeton (tek sefer).
- Günlük tavan: en fazla **2** sipariş jetonu/gün.
- Minimum tutar: `total_tl >= 50` (anti-fraud).
- İptal/reject: jeton verilmez.
- **Clawback (v1.1):** sonradan iade → negatif ledger; bakiye **0 floor** (negatife inmez).

### 3.2 Günde 3 farklı restoran takibi — 10 jeton (toplu)
- Lifetime: `jeton_follow_rewards` satırı olan `(user_id, restaurant_id)` tekrar ödüllendirilmez.
- Günlük: o gün ilk kez ödüllendirilen 3. takipte `follow_daily_bundle:{user_id}:{date}` → 10 jeton.
- Opsiyonel sıkılaştırma (v1.1): 24 saat içinde unfollow+refollow “yeni takip” sayılmaz.

### 3.3 Arkadaş daveti — 10 jeton
- `referred_id` unique; bir kullanıcı yalnızca bir kez ödül tetikler.
- Şart: yeni hesap + doğrulanmış e-posta + **ilk başarılı giriş** (kayıt tek başına yetmez).
- Attribution: davet linki tıklaması `referral_attributions`’a yazılır; 7 gün içinde kayıt.
- Self-referral şüphesi → `flagged`, otomatik red değil.
- Günlük tavan: en fazla **5** başarılı davet jetonu/gün.

### 3.4 Harcama — oyun ipucu
- Kelime Sofrası: ilk **2** ipucu ücretsiz (istemci); 3–8. ipuçları **5 jeton/ipucu**.
- `idempotency_key = game_spend:{user_id}:{game}:{puzzle_id}:hint:{n}`
- `POST /jeton/me/spend/game-hint` — bakiye yetersiz → 402.

### 3.5 Hoş geldin hediyesi — 10 jeton
- İlk `GET /jeton/me/wallet` çağrısında, hesap başına **bir kez**.
- `idempotency_key = welcome_bonus:{user_id}` · günlük tavana sayılmaz.

### v1 kapsam dışı (v1.1 — aynı ledger deseni)
Günlük giriş 10, restoran kartı paylaş 5, GS yorum 5, GS puan 3, foodcast foto 10.

## 4. Güvenlik

- Sunucu taraflı tetikleme; earn için public POST yok.
- Tek DB transaction: kontrol + ledger insert + wallet update + daily total.
- `idempotency_key` unique constraint son savunma hattı.
- Clawback = negatif ledger, satır silinmez.
- Flagged → `pending`, wallet’a yansımaz.
- **Global günlük tavan: 100 jeton/gün** (`jeton_daily_earn_totals`, Europe/Istanbul).
- Bakiye **0 floor** — clawback sonrası negatife inmez.

## 5. API (istemci)

```
GET  /jeton/me/wallet?user_email=...
GET  /jeton/me/ledger?user_email=...&limit=20&offset=0
POST /jeton/me/spend/game-hint  { user_email, game, puzzle_id, hint_index }
POST /jeton/referral/click      { referrer_id, device_hash }  (auth opsiyonel)
```

Auth payload (yeni kullanıcı): opsiyonel `referrer_id`, `device_hash`.

## 6. Günlük Teorik Maksimum

| Kaynak | Maks. |
|---|---|
| Sipariş 2×15 | 30 (+ ilk siparişte +5 tek sefer) |
| Takip paketi | 10 |
| Referral 5×10 | 50 |
| **Toplam** | **~90** → global tavan **100** |

## 7. Kabul Kriterleri

- Aynı `order_id` iki kez tetiklense tek ödül.
- Unfollow+refollow aynı restoranda jeton tekrarlanmaz.
- Aynı `referred_id` ikinci referrer’a ödül vermez.
- Günlük tavan aşılınca ledger `rejected` log, wallet güncellenmez.
- Flagged referral wallet’a yansımaz.

## 8. Deploy

```bash
cd backend && alembic upgrade head
```

Migration: `20260624_0047_jeton_economy`
