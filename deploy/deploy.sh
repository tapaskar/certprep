#!/bin/bash
# Quick deploy script — pull latest code and restart
# Usage: bash deploy.sh [ec2-ip]

set -euo pipefail

EC2_IP="${1:-15.207.15.106}"
EC2_USER="ec2-user"
APP_DIR="/opt/certprep"
# Default to the SparkUpCloud key in ~/.ssh; override with EC2_KEY=... if needed.
EC2_KEY="${EC2_KEY:-$HOME/.ssh/farzi-ec2-key.pem}"

if [ ! -f "$EC2_KEY" ]; then
    echo "SSH key not found: $EC2_KEY"
    echo "Set EC2_KEY=/path/to/key.pem and retry."
    exit 1
fi

echo "Deploying to $EC2_USER@$EC2_IP (key: $EC2_KEY)..."

ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE'
set -e
cd /opt/certprep

# Pull latest code
git pull origin main

# Backend
cd backend
source .venv/bin/activate
pip install -e "." -q
python -m app.cli create-tables  # idempotent
python -m app.cli seed-all       # seeds all exams (idempotent)

# Restart service
sudo systemctl restart certprep

echo ""
echo "Deploy complete. Checking health..."
sleep 2
curl -s http://localhost:8000/health
echo ""
REMOTE

echo ""
echo "Done! Check: https://api.sparkupcloud.com/health"
