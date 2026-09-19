import { ProcessedNews } from "./types";

const DESIGN_ID = process.env.CANVA_DESIGN_ID || "DAHVcVHtbvc";
const CANVA_API = "https://api.canva.com/rest/v1";

type CanvaResponse = Record<string, any>;

async function canvaRequest(path: string, init: RequestInit = {}): Promise<CanvaResponse> {
  const token = process.env.CANVA_ACCESS_TOKEN;
  if (!token) throw new Error("CANVA_ACCESS_TOKEN tanımlı değil.");

  const response = await fetch(`${CANVA_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Canva API ${response.status}: ${body.message || JSON.stringify(body)}`);
  }
  return body;
}

async function waitForJob(path: string, maxAttempts = 15): Promise<CanvaResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await canvaRequest(path);
    const status = result.job?.status;
    if (status === "success") return result;
    if (status === "failed") {
      throw new Error(result.job?.error?.message || "Canva işlemi başarısız oldu.");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Canva işlemi zaman aşımına uğradı.");
}

async function importImageAsset(imageUrl: string, title: string): Promise<string> {
  const created = await canvaRequest("/url-asset-uploads", {
    method: "POST",
    body: JSON.stringify({
      name: `haber-${title.slice(0, 80)}`,
      url: imageUrl,
    }),
  });

  const jobId = created.job?.id;
  if (!jobId) throw new Error("Canva görsel yükleme işi oluşturulamadı.");

  const completed = await waitForJob(`/url-asset-uploads/${jobId}`);
  const assetId = completed.job?.asset?.id;
  if (!assetId) throw new Error("Canva görsel asset ID alınamadı.");
  return assetId;
}

export async function createCanvaDesign(item: ProcessedNews) {
  if (!process.env.CANVA_ACCESS_TOKEN) {
    return {
      mode: "dry-run" as const,
      designId: DESIGN_ID,
      fields: {
        HABER_BASLIK: item.socialTitle,
        HABER_METNI: item.socialText,
        HABER_GORSELI: item.imageUrl,
      },
    };
  }

  const assetId = await importImageAsset(item.imageUrl, item.socialTitle);

  const autofill = await canvaRequest("/autofills", {
    method: "POST",
    body: JSON.stringify({
      type: "create_from_design",
      design_id: DESIGN_ID,
      title: item.socialTitle.slice(0, 120),
      data: {
        HABER_BASLIK: { type: "text", text: item.socialTitle },
        HABER_METNI: { type: "text", text: item.socialText },
        HABER_GORSELI: { type: "image", asset_id: assetId },
      },
    }),
  });

  const jobId = autofill.job?.id;
  if (!jobId) throw new Error("Canva autofill işi oluşturulamadı.");

  const completed = await waitForJob(`/autofills/${jobId}`);
  const design = completed.job?.result?.design;
  const generatedDesignId = design?.id || design?.url?.match(/design\/([^/]+)/)?.[1];

  if (!generatedDesignId) {
    throw new Error("Canva oluşturulan tasarım ID'si alınamadı.");
  }

  return {
    mode: "live" as const,
    designId: generatedDesignId,
    designUrl: design?.url,
    assetId,
    autofillJobId: jobId,
  };
}

export async function exportCanvaMp4(designId: string) {
  if (!process.env.CANVA_ACCESS_TOKEN) {
    return { mode: "dry-run" as const, designId, format: "mp4" as const };
  }

  const created = await canvaRequest("/exports", {
    method: "POST",
    body: JSON.stringify({
      design_id: designId,
      format: { type: "mp4" },
    }),
  });

  const exportId = created.job?.id;
  if (!exportId) throw new Error("Canva MP4 export işi oluşturulamadı.");

  const completed = await waitForJob(`/exports/${exportId}`);
  const urls = completed.job?.result?.urls || [];

  if (!urls.length) throw new Error("Canva MP4 indirme bağlantısı alınamadı.");

  return {
    mode: "live" as const,
    designId,
    exportId,
    downloadUrl: urls[0],
  };
}
