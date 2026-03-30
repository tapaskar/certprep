#!/bin/bash
# SparkUpCloud EC2 Bootstrap Script
# Run this ONCE on a fresh Amazon Linux 2023 t3.micro instance
# Usage: sudo bash setup-ec2.sh

set -euo pipefail

DOMAIN="api.sparkupcloud.com"
DB_USER="certprep"
DB_PASS="certprep_prod_$(openssl rand -hex 8)"
DB_NAME="certprep"
APP_DIR="/opt/certprep"

echo "========================================"
echo "  SparkUpCloud EC2 Setup - $DOMAIN"
echo "========================================"

# --- 1. System updates ---
echo "[1/8] Updating system..."
dnf update -y -q

# --- 2. Install Python 3.12 ---
echo "[2/8] Installing Python 3.12..."
dnf install -y -q python3.12 python3.12-pip python3.12-devel gcc git

# --- 3. Install PostgreSQL 16 ---
echo "[3/8] Installing PostgreSQL 16..."
dnf install -y -q postgresql16-server postgresql16
postgresql-setup --initdb
systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

# Allow password authentication for local connections
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/host    all             all             127.0.0.1\/32            ident/host    all             all             127.0.0.1\/32            md5/' /var/lib/pgsql/data/pg_hba.conf
systemctl restart postgresql

# --- 4. Install Redis ---
echo "[4/8] Installing Redis..."
dnf install -y -q redis6
systemctl enable redis6
systemctl start redis6

# --- 5. Install Nginx + Certbot ---
echo "[5/8] Installing Nginx and Certbot..."
dnf install -y -q nginx certbot python3-certbot-nginx
systemctl enable nginx

# --- 6. Clone and set up application ---
echo "[6/8] Setting up application..."
mkdir -p $APP_DIR
cd $APP_DIR

if [ ! -d "backend" ]; then
    echo "  Please clone your repo to $APP_DIR first, then re-run this script."
    echo "  Example: git clone https://github.com/YOUR_USER/prepally.git $APP_DIR"
    # For now, create the structure
    mkdir -p backend
fi

cd $APP_DIR/backend

# Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -e "." -q

# Create .env file
cat > .env << ENVEOF
DATABASE_URL=postgresql+asyncpg://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=["https://sparkupcloud.com","https://www.sparkupcloud.com"]
DEBUG=false
ANTHROPIC_API_KEY=
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
ENVEOF

echo "  Database password: $DB_PASS"
echo "  (saved to $APP_DIR/backend/.env)"

# Create tables and seed data
python -m app.cli create-tables
python -m app.cli seed --exam aws-sap-c02 --data-dir data/seed/aws-sap

# --- 7. Set up systemd service ---
echo "[7/8] Setting up systemd service..."
cp /opt/certprep/deploy/certprep.service /etc/systemd/system/certprep.service 2>/dev/null || \
cat > /etc/systemd/system/certprep.service << 'SVCEOF'
[Unit]
Description=SparkUpCloud FastAPI Backend
After=network.target postgresql.service redis6.service
Wants=postgresql.service redis6.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/certprep/backend
Environment=PATH=/opt/certprep/backend/.venv/bin:/usr/local/bin:/usr/bin
ExecStart=/opt/certprep/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable certprep
systemctl start certprep

# --- 8. Set up Nginx ---
echo "[8/8] Configuring Nginx..."
cat > /etc/nginx/conf.d/certprep.conf << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINXEOF

# Remove default nginx config if it conflicts
rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
nginx -t && systemctl restart nginx

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Point $DOMAIN DNS to this server's Elastic IP"
echo "  2. Run: sudo certbot --nginx -d $DOMAIN"
echo "  3. Test: curl https://$DOMAIN/health"
echo ""
echo "Database password: $DB_PASS"
echo "App directory: $APP_DIR/backend"
echo "Service: systemctl status certprep"
echo "Logs: journalctl -u certprep -f"
