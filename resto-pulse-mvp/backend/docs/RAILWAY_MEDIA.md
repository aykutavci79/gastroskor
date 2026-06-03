# Railway — kapak / menu / yorum fotolari

Deploy sonrasi fotolarin kaybolmasi (`{"detail":"Not found"}`) **gecici disk** yuzunden olur.
URL veritabaninda kalir; dosya silinir.

## Hizli cozum (Volume)

1. Railway → **API servisi** → **Volumes** → **Add Volume**
   - Mount Path: `/data`
   - Size: 1 GB yeterli
2. **Variables** → `MEDIA_DATA_DIR` = `/data`
3. Redeploy
4. Panelden **kapak + menu fotosunu tekrar yukle** (eski URL'ler geri gelmez)

Dosyalar: `/data/menu_images/` ve `/data/review_images/`

## Alternatif: Cloudflare R2

Railway Variables:

```
MEDIA_STORAGE=s3
S3_BUCKET=gastroskor-media
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
S3_REGION=auto
```

Yeni yuklemeler R2 URL alir. Eski `api.gastroskor.com.tr/media/...` linkleri icin yeniden yukleme gerekir.
