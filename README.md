# AIO Dijital — Otomatik Haber Botu

Bu depo, **Faz 1** MVP'sini içerir: RSS → PostgreSQL → korumalı yönetim panosu. Mevcut yorumcu ekranları korunmuştur; haber otomasyonu `/admin` altında yer alır.

## Tamamlananlar

- Prisma/PostgreSQL şeması: kaynaklar, haberler, işlem günlükleri, durumlar, retry/lock alanları.
- Kaynak-adapter mimarisi ve RSS öncelikli fetcher. HTML ve API adaptörleri bilerek uygulanmamıştır; HTML ancak kaynak kullanım şartları ve `robots.txt` izin verdikten sonra eklenmelidir.
- URL normalizasyonu ile SHA-256 içerik hash'i; veritabanı `url`, `hash` ve kaynak/external ID kısıtları aynı haberin tekrarını engeller.
- `/admin` metriği, son haber kuyruğu ve elle tarama düğmesi.
- Bearer token korumalı admin ve cron endpointleri; secret'lar istemci bundle'ına konmaz.
- AI, Canva, YouTube ve S3-compatible storage için gerçek API çağrısı yapmayan Phase 2+ sözleşmeleri.

## Kurulum

1. Node.js 20+ ve PostgreSQL 15+ hazırlayın.
2. `cp .env.example .env.local` çalıştırıp `DATABASE_URL`, `ADMIN_SECRET` ve `CRON_SECRET` değerlerini girin.
3. Bağımlılıkları kurun: `npm install`.
4. Prisma client ve ilk migration'ı üretin: `npx prisma generate && npx prisma migrate dev --name init`.
5. Uygulamayı başlatın: `npm run dev`.
6. Bir kaynak ekleyin (Prisma Studio: `npx prisma studio`). `scrapingMethod` için `RSS`, geçerli `rssUrl`, `active: true` girin.
7. Yönetim ekranına istek başlığında `Authorization: Bearer <ADMIN_SECRET>` ile erişin. Elle tarama düğmesi aynı anahtarı bir kez ister. Vercel Cron `Authorization: Bearer <CRON_SECRET>` ile çağrı yapar.

## Environment variables

| Değişken | Amaç |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantısı |
| `ADMIN_SECRET` | `/admin` ve admin API Bearer koruması |
| `CRON_SECRET` | Cron endpoint Bearer koruması |
| `NEXT_PUBLIC_APP_URL` | OAuth callback taban URL'si |
| `OPENAI_API_KEY` | Faz 2 AI servisi için ayrılmıştır |
| `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI` | Faz 3 Canva OAuth için ayrılmıştır |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Faz 5 YouTube OAuth için ayrılmıştır |

## Vercel

`vercel.json`, RSS taramasını her 30 dakikada bir planlar. Vercel proje ayarlarına yukarıdaki secret'ları ekleyin. Cron için Vercel'in gönderdiği Authorization değeri `CRON_SECRET` ile uyumlu olmalıdır. Büyük MP4'ler serverless filesystem'de tutulmayacak; sonraki fazda `ObjectStorage` ile R2/S3'ye stream edilecektir.

## Sonraki geliştirme

Faz 2'de OpenAI istemcisi ve **Zod doğrulamalı** yapılandırılmış çıktı, status lock/retry worker'ı ve AI manuel düzenleme ekranı eklenecek. Bunu Canva OAuth/autofill/export, storage streaming, YouTube OAuth/resumable upload ve ayrık cron işleri izleyecek.
