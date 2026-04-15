const availableTasks = [
  { business: 'Köşe Kahve', city: 'İstanbul', reward: '40 TL', status: 'Uygun' },
  { business: 'Sahil Döner', city: 'İzmir', reward: '40 TL', status: 'Uygun' },
  { business: 'Mavi Fırın', city: 'Ankara', reward: '40 TL', status: 'Dolu' },
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero card">
        <p className="tag">Yorumcu Paneli</p>
        <h1>Geri Bildirim Görevleri</h1>
        <p>
          Bu sayfa yalnızca yorumcu kullanıcılar için hazırlandı. Günlük görevleri görüp
          tamamladığında cüzdanına ödül yansır.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Cüzdanım (Örnek)</h2>
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
              <span>Toplam</span>
              <strong>1.640 TL</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <h2>Ödeme Talebi</h2>
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
            <button type="submit">Talep Gönder</button>
          </form>
        </article>
      </section>

      <section className="card">
        <h2>Bugünkü Uygun Görevler</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>İşletme</th>
                <th>Şehir</th>
                <th>Ödül</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {availableTasks.map((task) => (
                <tr key={task.business}>
                  <td>{task.business}</td>
                  <td>{task.city}</td>
                  <td>{task.reward}</td>
                  <td>{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
