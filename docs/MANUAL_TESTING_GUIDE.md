# 🧪 Manual Testing Guide - Deployed Authentication Service

## Overview
This guide provides step-by-step instructions for manually testing your deployed authentication service in the browser and via API calls.

## 1. Get Your Deployment URL and Authentication

### 1.1 Authenticate with Yandex Cloud CLI
Before testing, ensure you're authenticated with Yandex Cloud:
```bash
# Check if you're already authenticated
yc config list

# If not authenticated or need to switch account, run:
yc init

# Follow the prompts to authenticate and select your cloud/folder
```

### 1.2 Find Container URL via Yandex Cloud CLI
```bash
# Get the public URL of your deployed container
yc serverless container get messenger-auth --format json | grep '"url"' | cut -d'"' -f4

# Alternative: Get from Yandex Cloud Console
# https://console.cloud.yandex.com/folders/<YOUR_FOLDER_ID>/serverless-containers/container/messenger-auth
```

### 1.3 Alternative: Get URL via Browser Console
1. Open [Yandex Cloud Console](https://console.cloud.yandex.com/)
2. Select your folder (e.g., `messenger-mvp`)
3. Go to **Serverless Containers** → **messenger-auth**
4. Copy the **Invoke URL** from the container details

### 1.4 Expected URL Format
Your deployment URL should look like:
```
https://bba3fva6ka5g1q9fffff.containers.yandexcloud.net
```

## 2. Health Check Testing

### 2.1 Basic Health Check
Open your browser and navigate to:
```
https://YOUR_CONTAINER_URL/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0", 
  "database": "connected",
  "timestamp": "2025-08-24T12:00:00.000Z"
}
```

### 2.2 What to Verify
✅ **Status Code**: 200 OK  
✅ **Response Format**: Valid JSON  
✅ **Status**: "healthy"  
✅ **Database**: "connected"  
✅ **Service**: "auth-service"  
✅ **Timestamp**: Recent timestamp  

### 2.3 Troubleshooting Health Check
❌ **If Status is "unhealthy"**: Database connection issues  
❌ **If 503 Service Unavailable**: Container not ready  
❌ **If 404 Not Found**: Wrong URL or container not deployed  
❌ **If timeout**: Container startup issues  

## 3. Authentication API Testing

### 3.1 Browser-Based Testing (Simple)

#### Test 1: Invalid Endpoint
Navigate to:
```
https://YOUR_CONTAINER_URL/auth/invalid
```
**Expected**: 404 Not Found with JSON error response

#### Test 2: Missing Authorization
Navigate to:
```
https://YOUR_CONTAINER_URL/auth/me
```
**Expected**: 401 Unauthorized (missing Authorization header)

### 3.2 Command Line Testing (Advanced)

#### Test 1: Health Check via curl
```bash
curl -X GET "https://YOUR_CONTAINER_URL/health" \
  -H "Content-Type: application/json"
```

#### Test 2: Invalid Request to Auth Endpoint
```bash
curl -X POST "https://YOUR_CONTAINER_URL/auth/google" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected**: 400 Bad Request with validation error

#### Test 3: Get User Info Without Token
```bash
curl -X GET "https://YOUR_CONTAINER_URL/auth/me" \
  -H "Content-Type: application/json"
```
**Expected**: 401 Unauthorized

#### Test 4: Refresh Token Without Data
```bash
curl -X POST "https://YOUR_CONTAINER_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected**: 400 Bad Request

## 4. Google OAuth Testing Setup

### 4.1 Prerequisites
To test Google OAuth, you need:
1. **Google Cloud Project** with OAuth 2.0 configured
2. **Valid Google Client ID and Secret** in your GitHub secrets
3. **Authorized redirect URIs** configured in Google Console

### 4.2 Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Select your project or create new one
3. Navigate to **APIs & Services > Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized origins:
   ```
   https://YOUR_CONTAINER_URL
   ```

### 4.3 Test Google OAuth Flow
```bash
# This requires a valid Google ID token (get from Google OAuth playground)
curl -X POST "https://YOUR_CONTAINER_URL/auth/google" \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN",
    "deviceInfo": {
      "userAgent": "Test Browser",
      "deviceId": "test-device-123"
    }
  }'
```

## 5. Load Testing

### 5.1 Simple Load Test with curl
```bash
# Test 10 concurrent health checks
for i in {1..10}; do
  curl -s "https://YOUR_CONTAINER_URL/health" > /dev/null &
done
wait
echo "Load test complete"
```

### 5.2 Advanced Load Test with K6
```bash
# Run the existing load test
cd tests/load
docker run --rm -i grafana/k6 run - <<EOF
import http from 'k6/http';

export default function() {
  const response = http.get('https://YOUR_CONTAINER_URL/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
};
EOF
```

## 6. Database Connection Testing

### 6.1 Via Health Endpoint
The `/health` endpoint automatically checks database connectivity:
```bash
curl "https://YOUR_CONTAINER_URL/health" | jq '.database'
```
**Expected**: `"connected"`

### 6.2 Verify Database Tables
Connect to your PostgreSQL cluster and verify tables exist:
```bash
# Get connection details (now using ru-central1-b cluster)
yc managed-postgresql cluster get messenger-db-b --format yaml

# Connect and check tables (replace with your connection details)
psql "postgresql://messenger_user:PASSWORD@rc1b-oiip89mb12qde9ig.mdb.yandexcloud.net:6432/messenger_prod?sslmode=require" \
  -c "\dt"
```

**Expected Tables:**
- `users`
- `refresh_tokens` 
- `email_verification_tokens`
- `password_reset_tokens`
- `auth_rate_limits`
- `migrations`

## 7. Performance Verification

### 7.1 Response Time Benchmarks
```bash
# Measure response times
curl -w "@curl-format.txt" -s -o /dev/null "https://YOUR_CONTAINER_URL/health"

# Create curl-format.txt with:
echo "     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n" > curl-format.txt
```

**Expected Performance:**
- **time_total**: < 1000ms for health checks
- **time_starttransfer**: < 500ms
- **Cold start**: First request may take 2-3 seconds

### 7.2 Memory and CPU Usage
Monitor in Yandex Cloud Console:
```
Console → Serverless Containers → messenger-auth → Monitoring
```

**Expected Metrics:**
- **Memory usage**: < 256MB under normal load
- **CPU usage**: < 50% under normal load  
- **Request duration**: < 1000ms average

## 8. Security Testing

### 8.1 HTTPS Verification
```bash
# Verify HTTPS certificate
curl -I "https://YOUR_CONTAINER_URL/health"
```
**Expected**: SSL certificate valid, HTTPS enforced

### 8.2 Security Headers Check
```bash
# Check security headers
curl -I "https://YOUR_CONTAINER_URL/health" | grep -i "security\|x-frame\|x-content"
```
**Expected Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` 
- `Strict-Transport-Security`

### 8.3 Rate Limiting Test
```bash
# Test rate limiting (should be limited after many requests)
for i in {1..100}; do
  curl -s "https://YOUR_CONTAINER_URL/health" -w "%{http_code}\n" -o /dev/null
  sleep 0.1
done
```
**Expected**: Some 429 responses (rate limited) after many requests

## 9. Error Handling Testing

### 9.1 Invalid JSON Test
```bash
curl -X POST "https://YOUR_CONTAINER_URL/auth/google" \
  -H "Content-Type: application/json" \
  -d 'invalid-json'
```
**Expected**: 400 Bad Request with proper error message

### 9.2 Large Request Test
```bash
# Test with large payload
curl -X POST "https://YOUR_CONTAINER_URL/auth/google" \
  -H "Content-Type: application/json" \
  -d "$(printf '{"data":"%*s"}' 1000000 "")"
```
**Expected**: 413 Payload Too Large or handled gracefully

## 10. Monitoring and Logs

### 10.1 View Container Logs
```bash
# Get log group ID and view recent logs
LOG_GROUP_ID=$(yc serverless container get messenger-auth --format json | grep '"log_group_id"' | cut -d'"' -f4)
yc logging read --group-id=$LOG_GROUP_ID --since=1h
```

### 10.2 Monitoring Dashboard
Access monitoring via Yandex Cloud Console:
```
Console → Serverless Containers → messenger-auth → Monitoring
```

**Key Metrics to Monitor:**
- **Request count**: Number of requests per minute
- **Error rate**: Percentage of failed requests
- **Response time**: Average request duration
- **Memory usage**: Container memory consumption
- **Cold starts**: Container initialization frequency

## 11. Troubleshooting Common Issues

### 11.1 Container Not Responding
```bash
# Check container status
yc serverless container revision list --container-name messenger-auth

# Check recent logs
yc logging read --group-id=$LOG_GROUP_ID --since=30m
```

### 11.2 Database Connection Issues
```bash
# Test database connectivity
yc managed-postgresql cluster list-hosts messenger-db

# Check database logs
yc managed-postgresql cluster list-logs messenger-db
```

### 11.3 Authentication Errors
1. **Verify Google OAuth configuration** in Google Cloud Console
2. **Check JWT secrets** are properly set in GitHub
3. **Verify environment variables** in container logs

### 11.4 Database Connection Errors
If you get `{"errorMessage":"exit status 1","errorType":"UserCodeError"}`:

1. **Check connection strings in GitHub secrets**:
   ```bash
   # Get correct PostgreSQL connection (now using ru-central1-b cluster)
   yc managed-postgresql hosts list --cluster-name messenger-db-b
   
   # Get correct Redis connection (now using ru-central1-b cluster)
   yc managed-redis hosts list --cluster-name messenger-redis-b
   ```

2. **Update GitHub secrets** with complete connection strings:
   - `DATABASE_URL`: `postgresql://user:password@HOST:6432/database?sslmode=require`
   - `REDIS_URL`: `redis://:password@HOST:6379`

3. **Redeploy** by pushing a commit or manually triggering GitHub Actions

## 12. Success Criteria Checklist

### ✅ Basic Functionality
- [ ] Health endpoint returns 200 OK
- [ ] Database connection shows "connected"  
- [ ] Container responds within 1-2 seconds
- [ ] HTTPS certificate is valid
- [ ] Error handling returns proper HTTP codes

### ✅ Security
- [ ] Unauthorized requests return 401
- [ ] Rate limiting is working
- [ ] Security headers are present
- [ ] No secrets visible in responses

### ✅ Performance
- [ ] Response times < 1000ms
- [ ] Memory usage < 256MB
- [ ] Handles 10+ concurrent requests
- [ ] No memory leaks over time

### ✅ Integration
- [ ] Google OAuth endpoints accessible
- [ ] Database tables created correctly
- [ ] Redis connection working (if using Redis)
- [ ] Logs are being generated

---

## 🎉 Deployment Verification Complete!

If all tests pass, your authentication service is successfully deployed and ready for production use!

**Next Steps:**
1. **Set up monitoring alerts** for production
2. **Configure backup and recovery** procedures  
3. **Implement WebRTC service** for real-time messaging
4. **Add frontend application** to consume the API

**Support:**
- **Yandex Cloud Console**: Monitor and manage your deployment
- **GitHub Actions**: View deployment history and logs
- **This Documentation**: Reference for ongoing maintenance

Your messenger MVP authentication foundation is now solid and production-ready! 🚀