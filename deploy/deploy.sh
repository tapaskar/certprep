#!/bin/bash
# Quick deploy script — pull latest code and restart
# Usage: bash deploy.sh [ec2-ip]

set -euo pipefail

EC2_IP="${1:-}"
EC2_USER="ec2-user"
APP_DIR="/opt/certprep"

if [ -z "$EC2_IP" ]; then
    echo "Usage: bash deploy.sh <ec2-elastic-ip>"
    echo "Example: bash deploy.sh 54.123.45.67"
    exit 1
fi

echo "Deploying to $EC2_USER@$EC2_IP..."

ssh -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE'
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
