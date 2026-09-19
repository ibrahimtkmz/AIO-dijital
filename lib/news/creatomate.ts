import { ProcessedNews } from "./types";

const CREATOMATE_API = "https://api.creatomate.com/v2";

type CreatomateRender = {
  id: string;
  status: string;
  url?: string;
  error_message?: string;
  output_format?: string;
  width?: number;
  height?: number;
};

function getApiKey() {
  const key = process.env.CREATOMATE_API_KEY;
  if (!key) throw new Error("CREATOMATE_API_KEY tanımlı değil.");
  return key;
}

async function creatomateRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CREATOMATE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.error_message ||
      body?.message ||
      body?.error?.message ||
      JSON.stringify(body);
    throw new Error(`Creatomate API ${response.status}: ${message}`);
  }

  return body as T;
}

function buildRenderScript(item: ProcessedNews) {
  const title = item.socialTitle.slice(0, 180);
  const text = item.socialText.slice(0, 520);

  return {
    output_format: "mp4",
    width: 1080,
    height: 1920,
    frame_rate: 30,
    duration: 12,
    elements: [
      {
        type: "image",
        name: "HABER_GORSELI",
        source: item.imageUrl,
        x: "50%",
        y: "39%",
        width: "100%",
        height: "62%",
        x_anchor: "50%",
        y_anchor: "50%",
        fit: "cover",
      },
      {
        type: "shape",
        name: "IMAGE_OVERLAY",
        shape: "rect",
        x: "50%",
        y: "39%",
        width: "100%",
        height: "62%",
        x_anchor: "50%",
        y_anchor: "50%",
        fill_color: "rgba(0,0,0,0.18)",
      },
      {
        type: "text",
        name: "HABER_BASLIK",
        text: title,
        x: "7%",
        y: "8%",
        width: "86%",
        height: "18%",
        x_anchor: "0%",
        y_anchor: "0%",
        fill_color: "#ffffff",
        font_family: "Montserrat",
        font_weight: "800",
        font_size: "7.2 vmin",
        line_height: 1.05,
        text_alignment: "center",
      },
      {
        type: "shape",
        name: "TEXT_PANEL",
        shape: "rect",
        x: "50%",
        y: "79%",
        width: "92%",
        height: "30%",
        x_anchor: "50%",
        y_anchor: "50%",
        fill_color: "rgba(7,16,32,0.92)",
        background_border_radius: "4%",
      },
      {
        type: "text",
        name: "HABER_METNI",
        text,
        x: "9%",
        y: "66%",
        width: "82%",
        height: "24%",
        x_anchor: "0%",
        y_anchor: "0%",
        fill_color: "#ffffff",
        font_family: "Montserrat",
        font_weight: "500",
        font_size: "4.1 vmin",
        line_height: 1.18,
        text_alignment: "center",
      },
      {
        type: "text",
        name: "SOURCE",
        text: `Kaynak: ${item.source}`,
        x: "50%",
        y: "96%",
        width: "88%",
        height: "5%",
        x_anchor: "50%",
        y_anchor: "100%",
        fill_color: "rgba(255,255,255,0.78)",
        font_family: "Montserrat",
        font_weight: "500",
        font_size: "2.8 vmin",
        text_alignment: "center",
      },
    ],
  };
}

async function waitForRender(renderId: string, maxAttempts = 60): Promise<CreatomateRender> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const render = await creatomateRequest<CreatomateRender>(`/renders/${renderId}`);

    if (render.status === "succeeded") return render;
    if (render.status === "failed") {
      throw new Error(render.error_message || "Creatomate render işlemi başarısız oldu.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Creatomate render işlemi zaman aşımına uğradı.");
}

export async function createCreatomateVideo(item: ProcessedNews) {
  const render = await creatomateRequest<CreatomateRender>("/renders", {
    method: "POST",
    body: JSON.stringify({
      ...buildRenderScript(item),
      metadata: JSON.stringify({
        sourceUrl: item.sourceUrl,
        source: item.source,
      }),
    }),
  });

  const completed = await waitForRender(render.id);

  if (!completed.url) {
    throw new Error("Creatomate MP4 indirme bağlantısı alınamadı.");
  }

  return {
    mode: "live" as const,
    renderId: completed.id,
    downloadUrl: completed.url,
    width: completed.width || 1080,
    height: completed.height || 1920,
  };
}
