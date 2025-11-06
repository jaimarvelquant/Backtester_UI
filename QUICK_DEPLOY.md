# 🚀 Quick Deployment Guide

## 🎯 **Currently Running - Development Mode**
Your services are already running in development mode:
- ✅ API Gateway: http://localhost:5000
- ✅ Backtest Service: http://localhost:8009
- ✅ TV Service: http://localhost:8011
- ✅ React App: http://localhost:5173
- ✅ Simple Interface: Open `D:\strategy\simple_test.html`

---

## ⚡ **Quick Deployment Options**

### **Option 1: Keep Current Development Setup** ✅
```bash
# Everything is already running! Just use:
# 1. Open simple_test.html in browser (easiest)
# 2. Or go to http://localhost:5173 (React app)
```

### **Option 2: Docker Deployment (Recommended for Production)**
```bash
# Build and start all services
cd D:\strategy
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API Gateway: http://localhost:5000
```

### **Option 3: Production Build (No Docker)**
```bash
# Build React app
cd D:\strategy\webapp
npm run build

# Serve with production server
npm install -g serve
serve -s dist -l 3000

# Keep Python services running in separate terminals
```

---

## 🌐 **Access URLs**

| Method | URL | Login |
|--------|-----|-------|
| Simple HTML | `file:///D:/strategy/simple_test.html` | None needed |
| React App | http://localhost:5173 | admin/admin |
| Docker Frontend | http://localhost:3000 | admin/admin |
| API Gateway | http://localhost:5000 | - |

---

## 🔧 **Docker Commands**

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose build --no-cache

# Scale services (load balancing)
docker-compose up -d --scale backtest-service=2
```

---

## 🚨 **Quick Troubleshooting**

### **Port Already in Use?**
```bash
# Find what's using the port
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID_NUMBER> /F
```

### **Docker Issues?**
```bash
# Clean up Docker
docker-compose down --volumes --remove-orphans
docker system prune -a
docker-compose up -d
```

### **Service Not Responding?**
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs [service-name]
```

---

## 📊 **Next Steps**

1. **For Testing**: Use current setup or simple_test.html
2. **For Production**: Use `docker-compose up -d`
3. **For Cloud**: See DEPLOYMENT_GUIDE.md for AWS/Azure/GCP instructions
4. **For Monitoring**: Add health checks and logging

Your Strategy Analysis Platform is ready to deploy! 🎉