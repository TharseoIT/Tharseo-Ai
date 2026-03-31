#!/bin/bash
# Tharseo AI — one-command deploy
# Usage: ./deploy.sh

set -e

SSH_KEY="$HOME/Downloads/ssh-key-2026-03-09.key"
SERVER="opc@129.213.95.95"

echo "🚀 Deploying Tharseo AI..."

# 1. Push local changes
echo "→ Pushing to GitHub..."
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "  Nothing new to commit."
git push

# 2. Pull on server, rebuild frontend, restart services
echo "→ Deploying to server..."
ssh -i "$SSH_KEY" "$SERVER" "
  set -e
  sudo -u tharseo bash -c '
    cd /home/tharseo/Tharseo-Ai
    git pull
    cd frontend
    npm install --silent
    npm run build
  '
  sudo systemctl restart tharseo-backend tharseo-frontend
"

echo "✅ Done. Live at http://129.213.95.95:3000"
