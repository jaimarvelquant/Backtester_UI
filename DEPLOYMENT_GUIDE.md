# 🚀 Strategy Analysis Platform - Deployment Guide

This guide covers deployment options for your trading strategy backtesting platform.

## 📋 Current Setup Overview

### **Development Environment (Currently Running)**
- **API Gateway**: `http://localhost:5000` ✅
- **Standard Backtest Service**: `http://localhost:8009` ✅
- **TradingView Backtest Service**: `http://localhost:8011` ✅
- **React Frontend**: `http://localhost:5173` ✅
- **Simple HTML Interface**: `file:///D:/strategy/simple_test.html` ✅

---

## 🛠️ **Option 1: Development Deployment (Quick Start)**

### **Step 1: Start All Services**
```bash
# Navigate to project directory
cd D:\strategy

# Option A: Use the batch script
start_services.bat

# Option B: Start manually in separate terminals
# Terminal 1 - API Gateway
python api_gateway.py

# Terminal 2 - Standard Backtest Service
python test_backtest_service.py

# Terminal 3 - TradingView Backtest Service
python test_tv_service.py

# Terminal 4 - React Frontend
cd webapp
npm run dev
```

### **Step 2: Access the Application**
- **Simple Interface**: Open `D:\strategy\simple_test.html` in browser
- **React App**: Go to `http://localhost:5173`
  - Login: `admin` / `admin` (or any credentials)

### **✅ Advantages**
- No installation required
- Quick testing and development
- Easy debugging
- Hot reload enabled

### **⚠️ Limitations**
- Only accessible from your local machine
- Development servers (not production-ready)
- Requires all terminals to remain open

---

## 🌐 **Option 2: Local Production Deployment**

### **Step 1: Build Production Frontend**
```bash
cd D:\strategy\webapp
npm run build
```
This creates an optimized build in the `dist/` folder.

### **Step 2: Serve Frontend with Production Server**
```bash
# Install serve globally
npm install -g serve

# Serve the built app
serve -s dist -l 3000
```

### **Step 3: Use Production-Grade Backend Servers**
```bash
# Install Gunicorn for Python
pip install gunicorn

# Start API Gateway with Gunicorn
cd D:\strategy
gunicorn -w 4 -b 0.0.0.0:5000 api_gateway:app

# Start backtest services with Gunicorn (in separate terminals)
gunicorn -w 2 -b 0.0.0.0:8009 test_backtest_service:app
gunicorn -w 2 -b 0.0.0.0:8011 test_tv_service:app
```

### **Step 4: Configure Environment**
Create `.env` file:
```env
VITE_API_BASE_URL=http://your-ip:5000/api
VITE_PUBLIC_BASE_URL=http://your-ip:5000/public
```

### **✅ Advantages**
- Production-ready performance
- Accessible from other devices on network
- More robust than development servers

### **⚠️ Limitations**
- Requires manual process management
- No automatic restart on failure
- Limited to your local network

---

## ☁️ **Option 3: Cloud Deployment (AWS/Azure/GCP)**

### **Architecture Overview**
```
Load Balancer
    ↓
Frontend (React App) - Static Hosting (S3/Netlify/Vercel)
    ↓
API Gateway - Cloud Function/Container (AWS Lambda/Azure Functions)
    ↓
Backtest Services - Containers (ECS/AKS/Cloud Run)
```

### **Step 1: Deploy Frontend (Static Hosting)**
```bash
# Option A: Netlify (Easiest)
# 1. Push code to GitHub
# 2. Connect Netlify to GitHub repo
# 3. Build command: cd webapp && npm run build
# 4. Publish directory: webapp/dist

# Option B: Vercel (Also Easy)
# 1. Install Vercel CLI: npm i -g vercel
# 2. Run: vercel --prod
```

### **Step 2: Deploy Backend Services (Containers)**

#### **Create Dockerfile for API Gateway**
```dockerfile
# Dockerfile.api-gateway
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "api_gateway:app"]
```

#### **Create Dockerfile for Backtest Services**
```dockerfile
# Dockerfile.backtest
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY test_backtest_service.py .
EXPOSE 8009
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:8009", "test_backtest_service:app"]
```

#### **Docker Compose for Development**
```yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    build:
      context: .
      dockerfile: Dockerfile.api-gateway
    ports:
      - "5000:5000"
    environment:
      - PYTHONUNBUFFERED=1

  backtest-service:
    build:
      context: .
      dockerfile: Dockerfile.backtest
    ports:
      - "8009:8009"
    environment:
      - PYTHONUNBUFFERED=1

  tv-service:
    build:
      context: .
      dockerfile: Dockerfile.tv
    ports:
      - "8011:8011"
    environment:
      - PYTHONUNBUFFERED=1
```

### **Step 3: Deploy to Cloud Services**

#### **AWS Deployment**
```bash
# 1. Build and push to ECR
aws ecr create-repository --repository-name strategy-api
docker build -t strategy-api -f Dockerfile.api-gateway .
docker tag strategy-api:latest 123456789.dkr.ecr.region.amazonaws.com/strategy-api
docker push 123456789.dkr.ecr.region.amazonaws.com/strategy-api

# 2. Deploy to ECS
aws ecs create-cluster --cluster-name strategy-cluster
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs run-task --cluster strategy-cluster --task-definition strategy-task
```

#### **Azure Deployment**
```bash
# 1. Create Container Registry
az acr create --resource-group strategy-rg --name strategyacr --sku Basic

# 2. Build and push
az acr build --registry strategyacr --image strategy-api .

# 3. Deploy to Container Instances
az container create \
  --resource-group strategy-rg \
  --name strategy-api \
  --image strategyacr.azurecr.io/strategy-api \
  --ports 5000
```

---

## 🔧 **Option 4: Docker Deployment (Recommended for Production)**

### **Step 1: Create Complete Docker Setup**
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### **Step 2: Production Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    build:
      context: ./webapp
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api-gateway

  api-gateway:
    build:
      context: .
      dockerfile: Dockerfile.api-gateway
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backtest-service
      - tv-service

  backtest-service:
    build:
      context: .
      dockerfile: Dockerfile.backtest
    ports:
      - "8009:8009"
    environment:
      - NODE_ENV=production

  tv-service:
    build:
      context: .
      dockerfile: Dockerfile.tv
    ports:
      - "8011:8011"
    environment:
      - NODE_ENV=production

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
```

---

## 🎯 **Deployment Checklist**

### **Pre-Deployment**
- [ ] All services tested locally
- [ ] Environment variables configured
- [ ] SSL certificates obtained (for production)
- [ ] Database configured (if needed)
- [ ] Monitoring and logging setup
- [ ] Backup strategy planned

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Monitoring configured
- [ ] Error reporting working
- [ ] Documentation updated
- [ ] Team trained on new deployment

---

## 📊 **Environment Configuration**

### **Development (.env.development)**
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_PUBLIC_BASE_URL=http://localhost:5000/public
NODE_ENV=development
DEBUG=true
```

### **Staging (.env.staging)**
```env
VITE_API_BASE_URL=https://staging-api.yourdomain.com/api
VITE_PUBLIC_BASE_URL=https://staging-api.yourdomain.com/public
NODE_ENV=staging
DEBUG=false
```

### **Production (.env.production)**
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_PUBLIC_BASE_URL=https://api.yourdomain.com/public
NODE_ENV=production
DEBUG=false
```

---

## 🚀 **Quick Deployment Command Summary**

### **For Immediate Local Testing:**
```bash
cd D:\strategy
start_services.bat
# Then open simple_test.html in browser
```

### **For Production Docker Deployment:**
```bash
cd D:\strategy
docker-compose -f docker-compose.prod.yml up -d
```

### **For Cloud Deployment:**
```bash
# Frontend
cd webapp && npm run build && vercel --prod

# Backend (choose cloud provider)
# See specific cloud provider instructions above
```

---

## 🔍 **Monitoring and Maintenance**

### **Health Check Endpoints**
- API Gateway: `GET /health`
- Backtest Service: `GET /`
- TV Service: `GET /`

### **Logs**
- Frontend: Browser console
- Backend: Application logs
- System: Docker logs, cloud provider logs

### **Scaling Considerations**
- Add more instances of backtest services
- Implement load balancing
- Use managed database services
- Configure auto-scaling policies

Choose the deployment option that best fits your needs. For testing and development, Option 1 is perfect. For production use, Option 4 (Docker) is recommended.