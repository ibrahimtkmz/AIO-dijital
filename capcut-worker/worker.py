import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title='AIO-dijital CapCut Worker')
CAPCUT_API_KEY = os.getenv('CAPCUT_API_KEY', '').strip()
CAPCUT_DRAFTS_DIR = Path(os.getenv('CAPCUT_DRAFTS_DIR', str(Path.home() / 'Videos' / 'CapCut' / 'Drafts')))
CAPCUT_EXPORT_DIR = Path(os.getenv('CAPCUT_EXPORT_DIR', str(Path.home() / 'Videos' / 'AIO-dijital')))
CAPCUT_DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
CAPCUT_EXPORT_DIR.mkdir(parents=True, exist_ok=True)

class RenderNews(BaseModel):
    title: str
    body: str
    source: str
    imageUrl: str
    width: int = 1080
    height: int = 1920
    duration: int = 12

def auth(authorization: Optional[str]):
    if CAPCUT_API_KEY and authorization != f'Bearer {CAPCUT_API_KEY}':
        raise HTTPException(status_code=401, detail='Unauthorized')

@app.get('/health')
def health():
    return {'ok': True, 'service': 'capcut-worker'}

@app.post('/render-news')
def render_news(payload: RenderNews, authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    raise HTTPException(status_code=501, detail='CapCut worker bağlantısı hazır. Gerçek şablon klasörü henüz tanımlanmadı; oluşturduğun şablonu worker a tanıtmamız gerekiyor.')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=9010)
