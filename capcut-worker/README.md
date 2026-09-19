# AIO-dijital CapCut Worker

Bu servis Vercel üzerinde değil, CapCut'ın kurulu olduğu Windows bilgisayarda çalışır.

## Mimari

AIO-dijital (Vercel) -> /render-news -> CapCut Worker (Windows) -> CapCut Desktop export -> MP4 -> YouTube

CapCutAPI taslak oluşturma ve medya/metin işlemlerini destekliyor; MP4 export için masaüstü otomasyonu gerekir.

## Kurulum
1. Windows'a CapCut Desktop kur.
2. Python 3.10 veya 3.11 kur.
3. Bu klasörde: `python -m venv .venv` ardından `.venv\\Scripts\\activate`.
4. `pip install -r requirements.txt`.
5. Worker'ı `python worker.py` ile çalıştır.
6. Varsayılan adres `http://0.0.0.0:9010`.

## Güvenlik
Worker'ı doğrudan internete açmak yerine özel ağ/tünel kullan. CAPCUT_API_KEY ile Bearer doğrulaması desteklenir.

## Şablon
İlk aşamada worker köprüsü hazırdır. Gerçek CapCut taslağını birebir kullanmak için taslak klasörünü worker'a tanıtıp placeholder alanlarını belirlememiz gerekiyor.
