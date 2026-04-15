const businesses = [
  { name: 'Köşe Kahve', city: 'İstanbul', status: 'Bugünkü görev açık' },
  { name: 'Mavi Fırın', city: 'Ankara', status: 'Bugünkü görev alındı' },
  { name: 'Sahil Döner', city: 'İzmir', status: 'Bugünkü görev açık' },
];

const payoutRequests = [
  {
    user: 'Ayşe Yılmaz',
    iban: 'TR12 **** **** **** **** **** **',
    amount: '320 TL',
    status: 'Beklemede',
  },
  {
    user: 'Mehmet Demir',
    iban: 'TR58 **** **** **** **** **** **',
    amount: '200 TL',
    status: 'Onaylandı',
  },
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero card">
        <p className="tag">AIO Dijital • MVP</p>
        <h1>Geri Bildirim ve Ödül Yönetim Platformu</h1>
        <p>
          Bu sürüm; işletme görev yönetimi, kullanıcı cüzdan birikimi ve ödeme talebi
          süreçlerini tek panelde göstermek için hazırlandı.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Admin Özeti</h2>
          <ul>
            <li>Günlük görev kotası: İşletme başına 1 görev</li>
            <li>Kullanıcı ödülü: 40 TL / onaylı geri bildirim</li>
            <li>İşletme maliyeti: 200 TL / onaylı görev (yalnız admin)</li>
            <li>Ödeme talepleri admin onayı ile işlenir</li>
          </ul>
        </article>

        <article className="card">
          <h2>Kullanıcı Cüzdanı (Örnek)</h2>
          <div className="metrics">
            <div>
              <span>Bekleyen</span>
              <strong>120 TL</strong>
            </div>
            <div>
              <span>Çekilebilir</span>
              <strong>480 TL</strong>
            </div>
            <div>
              <span>Toplam Kazanç</span>
              <strong>1.640 TL</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="card">
        <h2>Bugünkü İşletme Görevleri</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>İşletme</th>
                <th>Şehir</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr key={business.name}>
                  <td>{business.name}</td>
                  <td>{business.city}</td>
                  <td>{business.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Ödeme Talebi Formu (MVP UI)</h2>
          <form className="form">
            <label>
              Ad Soyad
              <input placeholder="Ad Soyad" name="fullName" />
            </label>
            <label>
              IBAN
              <input placeholder="TR__ ____ ____ ____ ____ ____ __" name="iban" />
            </label>
            <label>
              Tutar (TL)
              <input placeholder="Örn: 200" type="number" min={50} name="amount" />
            </label>
            <button type="submit">Ödeme Talebi Oluştur</button>
          </form>
        </article>

        <article className="card">
          <h2>Admin Ödeme Talepleri</h2>
          <ul className="requestList">
            {payoutRequests.map((request) => (
              <li key={request.user}>
                <div>
                  <strong>{request.user}</strong>
                  <small>{request.iban}</small>
                </div>
                <div>
                  <strong>{request.amount}</strong>
                  <small>{request.status}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="note card">
        <h2>Politika Notu</h2>
        <p>
          Bu platform tasarımı, yalnızca gerçek müşteri geri bildirimi toplama ve hizmet
          kalitesini ölçme amacıyla kurgulanmıştır. Değerlendirme ödülü, olumlu yorum
          şartına bağlanmamalıdır.
        </p>
      </section>
    </main>
  );
}
