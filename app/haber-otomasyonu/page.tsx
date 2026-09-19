"use client";

import { useEffect, useState } from "react";

type Item = {
  title: string;
  source: string;
  status: string;
  updatedAt: string;
  youtubeVideoId?: string;
};

type YoutubeState = {
  connected: boolean;
  channel?: { title: string };
  error?: string;
};

type CanvaState = {
  connected: boolean;
};

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [youtube, setYoutube] = useState<YoutubeState>({ connected: false });
  const [canva, setCanva] = useState<CanvaState>({ connected: false });

  async function refresh() {
    const [newsResponse, youtubeResponse, canvaResponse] = await Promise.all([
      fetch("/api/news/status", { cache: "no-store" }),
      fetch("/api/youtube/status", { cache: "no-store" }),
      fetch("/api/canva/status", { cache: "no-store" }),
    ]);
    const newsData = await newsResponse.json();
    const youtubeData = await youtubeResponse.json();
    const canvaData = await canvaResponse.json();
    setItems(newsData.items || []);
    setYoutube(youtubeData);
    setCanva(canvaData);
  }

  async function processNews() {
    setLoading(true);
    setMsg("");
    try {
      const response = await fetch("/api/news/process", { method: "POST" });
      const data = await response.json();
      setMsg(data.error || (data.ok ? data.count + " yeni haber işlendi." : "İşlem tamamlanamadı."));
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  function connectCanva() {
    window.location.assign("/api/canva/auth");
  }

  function connectYoutube() {
    window.location.assign("/api/youtube/auth");
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Haber Otomasyonu</h1>
      <p>RSS → AI → Canva → YouTube</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "24px 0" }}>
        <button onClick={processNews} disabled={loading}>
          {loading ? "İşleniyor..." : "Yeni Haberleri Getir"}
        </button>
        <button type="button" onClick={connectYoutube}>YouTube&apos;u Bağla</button>
        <button type="button" onClick={connectCanva}>Canva&apos;yı Bağla</button>
      </div>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 20 }}>
        <div>
          <strong>YouTube: </strong>
          {youtube.connected
            ? `Bağlı — ${youtube.channel?.title || "kanal"}`
            : `Bağlı değil${youtube.error ? ` — ${youtube.error}` : ""}`}
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Canva: </strong>
          {canva.connected ? "Bağlı" : "Bağlı değil"}
        </div>
      </div>

      <p>{msg}</p>

      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Haber</th>
            <th align="left">Kaynak</th>
            <th align="left">Durum</th>
            <th align="left">YouTube</th>
            <th align="left">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.title}>
              <td>{item.title}</td>
              <td>{item.source}</td>
              <td>{item.status}</td>
              <td>
                {item.youtubeVideoId ? (
                  <a href={`https://www.youtube.com/shorts/${item.youtubeVideoId}`} target="_blank" rel="noreferrer">
                    Aç
                  </a>
                ) : "-"}
              </td>
              <td>{new Date(item.updatedAt).toLocaleString("tr-TR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
