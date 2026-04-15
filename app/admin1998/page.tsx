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

export default function AdminPage() {
  return (
    <main className="page">
      <section className="hero card">
        <p className="tag">Admin Paneli • /admin1998</p>
        <h1>Yönetim ve Ödeme Takibi</h1>
        <p>
          Bu arayüz yalnızca yönetici görünümüdür. Yorumcu kullanıcılar bu içeriği görmez,
          kendi görev ekranlarını ana sayfada kullanır.
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
    </main>
  );
}
