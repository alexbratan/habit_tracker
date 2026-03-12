# Deployment Guide

## Overview

This guide covers deploying the Habit Tracker application to production environments, including local development, staging, and production deployments.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (MongoDB)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Environment Setup

### Development Environment

#### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB 4.4+
- Git

#### Backend Setup
```bash
# Clone repository
git clone <repository-url>
cd habit_tracker/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env with your settings

# Run development server
python run.py
```

#### Frontend Setup
```bash
cd frontend_new

# Install dependencies
npm install

# Environment configuration
echo "REACT_APP_API_URL=http://localhost:8000" > .env

# Run development server
npm start
```

### Production Environment

#### Environment Variables

**Backend (.env):**
```env
# Database
MONGODB_URI=mongodb://username:password@host:port/database
DB_NAME=habit_tracker_prod

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440  # 24 hours

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Application
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Frontend (.env):**
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

## Deployment Options

### Option 1: Traditional VPS/Cloud Server

#### Server Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB+ minimum
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 20.04+ LTS recommended

#### Setup Steps

1. **Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y python3 python3-pip python3-venv nodejs nginx mongodb

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Application Deployment**
```bash
# Clone repository
git clone <repository-url> /var/www/habit-tracker
cd /var/www/habit-tracker

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend build
cd ../frontend_new
npm install
npm run build
```

3. **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/habit-tracker
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend static files
    location / {
        root /var/www/habit-tracker/frontend_new/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for future features
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

4. **Process Management with PM2**
```bash
# Backend process
cd /var/www/habit-tracker/backend
pm2 start run.py --name habit-tracker-api --interpreter python3

# Save PM2 configuration
pm2 save
pm2 startup
```

5. **SSL Certificate with Let's Encrypt**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Docker Deployment

#### Dockerfile (Backend)
```dockerfile
# backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Dockerfile (Frontend)
```dockerfile
# frontend_new/Dockerfile
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: habit-tracker-db
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    container_name: habit-tracker-api
    restart: unless-stopped
    environment:
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/habit_tracker?authSource=admin
      - JWT_SECRET=your-jwt-secret
      - GOOGLE_AI_API_KEY=your-ai-key
    depends_on:
      - mongodb
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend_new
    container_name: habit-tracker-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

#### Deployment Commands
```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Update application
git pull
docker-compose build
docker-compose up -d
```

### Option 3: Cloud Platform Deployment

#### AWS Deployment

**Backend (Elastic Beanstalk):**
```bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init habit-tracker-api

# Create environment
eb create production

# Deploy
eb deploy
```

**Frontend (S3 + CloudFront):**
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Build and deploy
cd frontend_new
npm run build
aws s3 sync build/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

#### Google Cloud Platform

**Backend (Cloud Run):**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/habit-tracker-api
gcloud run deploy habit-tracker-api --image gcr.io/PROJECT_ID/habit-tracker-api --platform managed
```

**Frontend (Firebase Hosting):**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize and deploy
firebase init hosting
firebase deploy
```

#### Heroku Deployment

**Backend:**
```bash
# Create app
heroku create habit-tracker-api

# Set environment variables
heroku config:set MONGODB_URI=mongodb://...
heroku config:set JWT_SECRET=your-secret

# Deploy
git subtree push --prefix backend heroku main
```

**Frontend:**
```bash
# Create app
heroku create habit-tracker-frontend

# Deploy
cd frontend_new
npm run build
heroku buildpacks:set heroku/nodejs
git subtree push --prefix frontend_new heroku main
```

## Database Setup

### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create new cluster
3. Configure network access (whitelist IP addresses)
4. Create database user
5. Get connection string
6. Update environment variables

### Self-hosted MongoDB
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo
> use habit_tracker
> db.createUser({
    user: "habit_tracker_user",
    pwd: "secure_password",
    roles: ["readWrite"]
  })
```

## Monitoring and Logging

### Application Monitoring

#### Health Check Endpoint
```python
# backend/app/routes/health.py
from fastapi import APIRouter
from app.database import get_db

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

#### Logging Configuration
```python
# backend/app/main.py
import logging
from pythonjsonlogger import jsonlogger

# Configure structured logging
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

### Monitoring Services

#### Uptime Monitoring
- **Uptime Robot**: Free monitoring service
- **Pingdom**: Advanced monitoring
- **Datadog**: Comprehensive APM

#### Error Tracking
- **Sentry**: Error monitoring and performance
- **Bugsnag**: Error tracking
- **Rollbar**: Real-time error monitoring

#### Performance Monitoring
- **New Relic**: APM and infrastructure monitoring
- **DataDog**: Full-stack monitoring
- **Prometheus + Grafana**: Open-source monitoring stack

## Security Considerations

### Network Security
- Use HTTPS everywhere
- Implement firewall rules
- Restrict database access
- Use VPN for admin access

### Application Security
- Environment variable encryption
- Regular dependency updates
- Security headers implementation
- Input validation and sanitization

### Example Security Headers (Nginx)
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## Backup Strategy

### Database Backups
```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
DB_NAME="habit_tracker"

# Create backup
mongodump --host localhost --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/habit_tracker_$DATE.tar.gz -C $BACKUP_DIR $DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Automated Backups
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Performance Optimization

### Backend Optimization
- Implement caching (Redis)
- Database query optimization
- Connection pooling
- Response compression

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- CDN usage

### Example Nginx Optimization
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# Enable browser caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple backend instances
- Database replication
- Session management

### Auto-scaling
- Container orchestration (Kubernetes)
- Cloud provider auto-scaling
- Performance metrics monitoring

## Troubleshooting

### Common Issues

#### Backend Issues
```bash
# Check logs
pm2 logs habit-tracker-api

# Check process status
pm2 status

# Restart application
pm2 restart habit-tracker-api
```

#### Database Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Connect to database
mongo habit_tracker
```

#### Frontend Issues
```bash
# Check build errors
npm run build

# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check console errors in browser
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Database connectivity
python -c "from app.database import get_db; print('Database connected')"
```

## Maintenance

### Regular Tasks
- **Weekly**: Update dependencies
- **Monthly**: Review logs and performance
- **Quarterly**: Security audit
- **Annually**: Architecture review

### Update Process
```bash
# Backup current version
cp -r /var/www/habit-tracker /var/www/habit-tracker-backup

# Pull latest changes
cd /var/www/habit-tracker
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart habit-tracker-api

# Update frontend
cd ../frontend_new
npm install
npm run build

# Verify deployment
curl http://localhost:8000/health
```

## Support and Documentation

### Resources
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

### Community Support
- GitHub Issues
- Stack Overflow
- Discord/Slack communities

### Emergency Contacts
- DevOps team
- Database administrator
- Security team
