#!/bin/bash
# install-llamacpp.sh — set up llama.cpp + Qwen2.5-7B-Instruct on this EC2 box.
#
# Run on the EC2 instance as ec2-user:
#   bash install-llamacpp.sh
#
# After it finishes, the SparkUpCloud backend can switch to local
# inference by adding to /opt/certprep/backend/.env:
#   LLM_PROVIDER=local
#   LOCAL_LLM_URL=http://127.0.0.1:8080
#   LOCAL_LLM_MODEL=qwen2.5-7b-instruct-q4_k_m

set -euo pipefail

# ── Tunables ───────────────────────────────────────────────────────────
LLAMA_DIR="$HOME/llama.cpp"
MODELS_DIR="$HOME/models"
MODEL_REPO="bartowski/Qwen2.5-7B-Instruct-GGUF"
MODEL_FILE="Qwen2.5-7B-Instruct-Q4_K_M.gguf"
THREADS="${THREADS:-$(nproc)}"
CTX_SIZE="${CTX_SIZE:-16384}"
PORT="${PORT:-8080}"
# Concurrency: number of parallel chat slots. Each slot reserves a KV
# cache, so total cache RAM ~= ctx_size * parallel * fp16-bytes.
PARALLEL="${PARALLEL:-2}"

# ── 0. System packages ─────────────────────────────────────────────────
echo "▶ Installing build dependencies..."
sudo dnf install -y --allowerasing \
  git gcc gcc-c++ make cmake \
  python3 python3-pip \
  curl ca-certificates \
  || sudo yum install -y git gcc gcc-c++ make cmake python3 python3-pip curl ca-certificates

# ── 1. Clone & build llama.cpp ─────────────────────────────────────────
if [ ! -d "$LLAMA_DIR" ]; then
  echo "▶ Cloning llama.cpp..."
  git clone --depth 1 https://github.com/ggerganov/llama.cpp "$LLAMA_DIR"
else
  echo "▶ Updating llama.cpp..."
  (cd "$LLAMA_DIR" && git pull --ff-only)
fi

echo "▶ Building llama.cpp (with -DGGML_NATIVE=ON for AVX2/AVX-512 detection)..."
cd "$LLAMA_DIR"
cmake -B build -DGGML_NATIVE=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j"$THREADS" --target llama-server

LLAMA_SERVER_BIN="$LLAMA_DIR/build/bin/llama-server"
test -x "$LLAMA_SERVER_BIN"
echo "✓ Built $LLAMA_SERVER_BIN"

# ── 2. Download Qwen2.5-7B-Instruct GGUF ───────────────────────────────
mkdir -p "$MODELS_DIR"
MODEL_PATH="$MODELS_DIR/$MODEL_FILE"

if [ ! -f "$MODEL_PATH" ]; then
  echo "▶ Downloading $MODEL_FILE (~4.7 GB)..."
  pip3 install --user -q huggingface_hub
  python3 - <<PYEOF
from huggingface_hub import hf_hub_download
import shutil, os
p = hf_hub_download(
    repo_id="$MODEL_REPO",
    filename="$MODEL_FILE",
    local_dir=os.path.expanduser("$MODELS_DIR"),
)
print("Downloaded to:", p)
PYEOF
else
  echo "✓ Model already present: $MODEL_PATH"
fi

# ── 3. Quick smoke test ────────────────────────────────────────────────
echo "▶ Smoke testing the model (10 tokens)..."
"$LLAMA_DIR/build/bin/llama-cli" \
  -m "$MODEL_PATH" -no-cnv -p "Hi, in one sentence: what is AWS S3?" -n 32 \
  --threads "$THREADS" 2>/dev/null | tail -20

# ── 4. systemd unit ────────────────────────────────────────────────────
SERVICE_FILE="/etc/systemd/system/llama-server.service"
echo "▶ Writing systemd unit at $SERVICE_FILE..."

sudo tee "$SERVICE_FILE" >/dev/null <<UNIT
[Unit]
Description=llama.cpp HTTP server (Qwen2.5-7B-Instruct)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$LLAMA_DIR
ExecStart=$LLAMA_SERVER_BIN \\
  --model "$MODEL_PATH" \\
  --host 127.0.0.1 \\
  --port $PORT \\
  --ctx-size $CTX_SIZE \\
  --threads $THREADS \\
  --parallel $PARALLEL \\
  --cont-batching \\
  --cache-type-k q8_0 \\
  --cache-type-v q8_0 \\
  --chat-template chatml \\
  --metrics
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable llama-server
sudo systemctl restart llama-server
sleep 4

# ── 5. Verify ──────────────────────────────────────────────────────────
echo ""
echo "▶ Checking llama-server status..."
sudo systemctl status llama-server --no-pager -l | head -15

echo ""
echo "▶ Smoke testing /v1/chat/completions on localhost:$PORT..."
curl -sS -X POST "http://127.0.0.1:$PORT/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b-instruct",
    "messages": [
      {"role": "system", "content": "You are a helpful AWS exam tutor."},
      {"role": "user", "content": "In one short paragraph, when should I pick SSE-KMS over SSE-S3?"}
    ],
    "max_tokens": 150,
    "temperature": 0.7
  }' | python3 -c "import sys, json; d = json.load(sys.stdin); print(d['choices'][0]['message']['content'])"

echo ""
echo "✅ Done. To switch the SparkUpCloud backend to local inference, add to"
echo "   /opt/certprep/backend/.env:"
echo ""
echo "   LLM_PROVIDER=local"
echo "   LOCAL_LLM_URL=http://127.0.0.1:$PORT"
echo "   LOCAL_LLM_MODEL=qwen2.5-7b-instruct"
echo ""
echo "   then: sudo systemctl restart certprep"
echo ""
echo "Useful commands:"
echo "   sudo journalctl -u llama-server -f       # live logs"
echo "   sudo systemctl restart llama-server      # restart"
echo "   curl http://127.0.0.1:$PORT/health        # liveness check"
