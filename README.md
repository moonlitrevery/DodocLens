# DodocLens

Local-first document intelligence MVP: upload PDFs and images, extract text (OCR when needed), chunk, embed with **sentence-transformers** (`all-MiniLM-L6-v2`), and run **semantic search** — no cloud APIs.

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Desktop  | Electron (main process spawns Python backend)   |
| UI       | React, Vite, TailwindCSS, Axios                 |
| API      | FastAPI on `http://127.0.0.1:8000`              |
| DB       | SQLite (`backend/data/dodoclens.db`)           |
| ML       | sentence-transformers, scikit-learn (cosine)    |
| PDF      | PyMuPDF                                         |
| OCR      | pytesseract → **Tesseract** binary required     |

## Prerequisites

1. **Python 3.10+** and **Node.js 18+**
2. **Tesseract OCR** (for images and scanned PDFs)

### Tesseract

- **Windows**  
  - Installer: [UB Mannheim builds](https://github.com/UB-Mannheim/tesseract/wiki) or [official releases](https://github.com/tesseract-ocr/tesseract).  
  - Add the install folder to **PATH** (e.g. `C:\Program Files\Tesseract-OCR`).  
  - If `pytesseract` still fails, set the binary in code (see comment block in `backend/services/text_extraction.py`).

- **macOS**  
  - `brew install tesseract`

- **Linux (Arch)**  
  - `sudo pacman -S tesseract tesseract-data-eng`

- **Linux (Debian/Ubuntu)**  
  - `sudo apt install tesseract-ocr`

PDFs with a real text layer work without OCR; OCR is used when extracted text per page is below a heuristic threshold.

### Python environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The first run downloads the embedding model (~90MB) into the Hugging Face cache — stay online once for that, then you can work offline.

## Run (development)

**Recommended — Electron + Vite (backend auto-started)**

```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ..
npm install
cd frontend && npm install && cd ..
npm run dev
```

This starts Vite on **5173**, waits for it, then opens Electron. Electron tries **`/health` on port 8000** first; if nothing responds within ~2s it spawns `python3 backend/main.py` (or `python` on Windows) from the project root.

If you **already** run the API yourself (`python3 backend/main.py`), Electron **reuses** it and will not start a second process.

**Using a venv for the backend** — Electron spawns `python3` / `python` from your environment. To force the venv interpreter:

```bash
export DODOC_PYTHON="$(pwd)/backend/.venv/bin/python"
npm run dev
```

On Windows (PowerShell): `$env:DODOC_PYTHON = "...\backend\.venv\Scripts\python.exe"`.

**Browser only** — start the backend in one terminal, then:

```bash
cd frontend && npm run dev
```

Open the URL Vite prints. Override the API base with `VITE_API_URL` if needed.

## API

| Method | Path               | Description                    |
|--------|--------------------|--------------------------------|
| GET    | `/health`          | Liveness for Electron wait     |
| POST   | `/upload`          | Multipart file upload          |
| GET    | `/documents`       | List documents                 |
| GET    | `/documents/{id}`  | Document detail + text preview |
| POST   | `/search`          | JSON `{ "query": "..." }`      |

## Project layout

```
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── database/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/          # Vite + React
├── electron/
│   ├── main.cjs       # Window + spawn Python + wait /health
│   └── preload.cjs
└── package.json       # Electron + dev scripts
```

## Production-style run (no dev server)

```bash
npm install
cd frontend && npm install && npm run build && cd ..
npm run electron:prod
```

Electron loads `frontend/dist/index.html` and still spawns the Python backend. You need the same Python venv/deps as in development.

## Building an installer (later)

The repo includes a minimal **electron-builder** configuration (`npm run dist`). For a **shippable** desktop product you should also:

1. **Pin Python** — embed a runtime (e.g. portable Python) or document that users must install Python 3 and `pip install -r backend/requirements.txt`.
2. **Ship Tesseract** or bundle installers per OS.
3. **Warm / cache** the embedding model so first launch does not require network.
4. Adjust `electron-builder` `files` / `extraResources` if you add bundled runtimes.

Commands:

```bash
npm run build:fe
npm run dist
```

Artifacts appear under `release/`. Targets are defined in `package.json` under `"build"` (e.g. AppImage/deb on Linux, NSIS on Windows, DMG on macOS).

## License

Add a `LICENSE` file if you distribute the app.
