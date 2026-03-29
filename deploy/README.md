# CertPrep Deployment Guide — sparkupcloud.com

**Cost: ~$0.50/month first year (AWS Free Tier), ~$9/month after**

## Architecture

```
sparkupcloud.com ──→ Vercel (free) ──→ Next.js frontend
api.sparkupcloud.com ──→ EC2 t3.micro ──→ FastAPI + PostgreSQL + Redis
```

---

## Step 1: Push Code to GitHub

```bash
cd /Volumes/wininstall/prepally
git init
git add -A
git commit -m "Initial commit"
gh repo create prepally --private --push
```

## Step 2: Launch EC2 Instance

### Via AWS Console:
1. Go to **EC2 → Launch Instance**
2. Settings:
   - **Name**: `certprep-api`
   - **AMI**: Amazon Linux 2023
   - **Instance type**: `t3.micro` (free tier eligible)
   - **Key pair**: Create or select existing
   - **Security group**: Allow SSH (22), HTTP (80), HTTPS (443)
   - **Storage**: 20 GB gp3 (free tier: 30 GB)
3. Click **Launch**

### Allocate Elastic IP:
1. Go to **EC2 → Elastic IPs → Allocate**
2. Associate with your instance
3. Note the IP address (e.g., `54.123.45.67`)

## Step 3: Set Up Route 53 DNS

### If sparkupcloud.com is already in Route 53:
Add these records:
```
api.sparkupcloud.com  →  A  →  54.123.45.67 (your EC2 Elastic IP)
```

### If domain is at another registrar:
1. Create Hosted Zone in Route 53 for `sparkupcloud.com`
2. Copy the 4 NS records from Route 53
3. Update nameservers at your registrar to Route 53's NS records
4. Add the A record for `api.sparkupcloud.com`

## Step 4: Bootstrap EC2

```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@54.123.45.67

# Clone the repo
sudo mkdir -p /opt/certprep
sudo chown ec2-user:ec2-user /opt/certprep
git clone https://github.com/YOUR_USER/prepally.git /opt/certprep

# Run the bootstrap script
sudo bash /opt/certprep/deploy/setup-ec2.sh
```

**Save the database password** that gets printed at the end!

## Step 5: Set Up SSL

```bash
# On the EC2 instance (after DNS propagates):
sudo certbot --nginx -d api.sparkupcloud.com

# Auto-renew (certbot sets this up automatically)
sudo systemctl enable certbot-renew.timer
```

Test: `curl https://api.sparkupcloud.com/health`

## Step 6: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://api.sparkupcloud.com/api/v1
   ```
5. Click **Deploy**
6. Go to **Settings → Domains** → Add `sparkupcloud.com`
7. Add the CNAME/A records Vercel tells you to Route 53

## Step 7: Verify Everything

```bash
# Backend health
curl https://api.sparkupcloud.com/health
# → {"status":"ok","version":"0.1.0"}

# Exams endpoint
curl https://api.sparkupcloud.com/api/v1/content/exams
# → [{"id":"aws-sap-c02",...}]

# Frontend
open https://sparkupcloud.com
```

---

## Daily Operations

### Deploy new code:
```bash
bash deploy/deploy.sh 54.123.45.67
```

### Check logs:
```bash
ssh ec2-user@54.123.45.67 "journalctl -u certprep -f"
```

### Restart backend:
```bash
ssh ec2-user@54.123.45.67 "sudo systemctl restart certprep"
```

### Database backup:
```bash
ssh ec2-user@54.123.45.67 "pg_dump -U certprep certprep > /tmp/backup.sql"
scp ec2-user@54.123.45.67:/tmp/backup.sql ./backup-$(date +%Y%m%d).sql
```

---

## Monthly Cost

| Service | Month 1-12 | After Year 1 |
|---------|-----------|-------------|
| EC2 t3.micro | $0 (free tier) | $8.35 |
| Route 53 | $0.50 | $0.50 |
| Vercel | $0 | $0 |
| SSL (Let's Encrypt) | $0 | $0 |
| **Total** | **$0.50** | **$8.85** |
