#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     DodocLens — Linux Build Tool     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Preflight checks ──────────────────────────────────────────────
if [ ! -f "package.json" ]; then
  echo "ERRO: Execute este script a partir da raiz do repositório."
  exit 1
fi

if [ ! -d "backend/.venv" ]; then
  echo "ERRO: backend/.venv não encontrado."
  echo "Execute primeiro: cd backend && uv sync && uv python pin 3.13"
  exit 1
fi

if [ ! -d "frontend" ]; then
  echo "ERRO: Diretório frontend não encontrado."
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "ERRO: Node.js não encontrado. Instale Node.js 18+."
  exit 1
fi

# ── Cleanup trap — always restore .venv name ──────────────────────
cleanup() {
  if [ -d "backend/venv" ] && [ ! -d "backend/.venv" ]; then
    mv backend/venv backend/.venv
    echo "✓ backend/.venv restaurado."
  fi
}
trap cleanup EXIT SIGINT SIGTERM

# ── Install npm deps if needed ────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "Instalando dependências npm (root)..."
  npm install --silent
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Instalando dependências npm (frontend)..."
  npm install --prefix frontend --silent
fi

# ── Build frontend ─────────────────────────────────────────────────
echo "Construindo frontend..."
npm run build --prefix frontend
echo "✓ Frontend construído."

# ── Prepare backend — resolve symlinks BEFORE renaming ────────────
echo "Preparando backend para empacotamento..."

# Resolve the real Python binary path while symlinks still work
REAL_PYTHON=$(readlink -f "backend/.venv/bin/python3")
echo "Python real: $REAL_PYTHON"

if [ ! -f "$REAL_PYTHON" ]; then
  echo "ERRO: Não foi possível encontrar o binário real do Python."
  echo "Verifique: readlink -f backend/.venv/bin/python3"
  exit 1
fi

# Rename .venv → venv so electron-builder includes it (no dotfolder skip)
mv backend/.venv backend/venv
echo "✓ .venv renomeado para venv."

# Replace ALL python symlinks in venv/bin with the real binary
echo "Resolvendo symlinks do Python..."
for pybin in "backend/venv/bin/python" "backend/venv/bin/python3"; do
  if [ -e "$pybin" ] || [ -L "$pybin" ]; then
    rm -f "$pybin"
    cp "$REAL_PYTHON" "$pybin"
    chmod +x "$pybin"
    echo "  ✓ $pybin → binário real"
  fi
done

# ── Run electron-builder ───────────────────────────────────────────
echo "Empacotando com electron-builder..."
npx electron-builder --linux --publish never
echo "✓ Build concluído."

# ── List output files ──────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║          Arquivos gerados            ║"
echo "╚══════════════════════════════════════╝"
ls -lh release/*.AppImage release/*.deb 2>/dev/null || true
echo ""
echo "Pronto para upload no GitHub Releases!"
echo "Dica: Se precisar rodar novamente: chmod +x build-linux.sh && ./build-linux.sh"