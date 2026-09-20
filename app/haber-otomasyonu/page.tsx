"use client";

import { upload } from "@vercel/blob/client";
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

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [youtube, setYoutube] = useState<YoutubeState>({ connected: false });
  const [templateMessage, setTemplateMessage] = useState("");

  async function refresh() {
    const [newsResponse, youtubeResponse] = await Promise.all([
      fetch("/api/news/status", { cache: "no-store" }),
      fetch("/api/youtube/status", { cache: "no-store" }),
    ]);
    const newsData = await newsResponse.json();
    const youtubeData = await youtubeResponse.json();
    setItems(newsData.items || []);
    setYoutube(youtubeData);
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

  async function uploadTemplate(file: File) {
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      setTemplateMessage("Yalnızca MP4 şablon yükleyebilirsin.");
      return;
    }

    setTemplateMessage("Şablon doğrudan Vercel Blob'a yükleniyor...");

    try {
      const blob = await upload("news/template.mp4", file, {
        access: "public",
        handleUploadUrl: "/api/news/template/upload",
        allowOverwrite: true,
        multipart: true,
        onUploadProgress: (event) => {
          setTemplateMessage(`Şablon yükleniyor... %${Math.round(event.percentage)}`);
        },
      });

      setTemplateMessage(`Boş video şablonu hazır. ${blob.url ? "Yükleme tamamlandı." : ""}`);
    } catch (error) {
      setTemplateMessage(
        error instanceof Error ? `Şablon yüklenemedi: ${error.message}` : "Şablon yüklenemedi.",
      );
    }
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
      <p>RSS → AI → Video → YouTube</p>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 20 }}>
        <strong>Video şablonu</strong>
        <div style={{ marginTop: 10 }}>
          <input type="file" accept="video/mp4" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
        </div>
        <small>{templateMessage || "İlk gönderdiğin boş MP4 videoyu burada bir kez yükle."}</small>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "24px 0" }}>
        <button onClick={processNews} disabled={loading}>
          {loading ? "İşleniyor..." : "Yeni Haberleri Getir"}
        </button>
        <button type="button" onClick={connectYoutube}>YouTube&apos;u Bağla</button>
      </div>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 20 }}>
        <div>
          <strong>YouTube: </strong>
          {youtube.connected
            ? `Bağlı — ${youtube.channel?.title || "kanal"}`
            : `Bağlı değil${youtube.error ? ` — ${youtube.error}` : ""}`}
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
