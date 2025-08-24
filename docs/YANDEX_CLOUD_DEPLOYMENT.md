# 🚀 Yandex Cloud Deployment Manual for Messenger MVP

## Overview
This manual will guide you through setting up Yandex Cloud infrastructure for deploying the authentication service using GitHub Actions.

## 1. Yandex Cloud Setup

### 1.1 Create Yandex Cloud Account & Organization
1. Go to [Yandex Cloud Console](https://console.cloud.yandex.com/)
2. Sign up/login with your Yandex ID
3. Create a new **Cloud** and **Folder** (e.g., `messenger-mvp`)
4. Note down your:
   - **Cloud ID** 
   - **Folder ID** (you'll need these later)

### 1.2 Install Yandex Cloud CLI
```bash
# Install YC CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Initialize CLI
yc init

# Follow prompts to authenticate and select your cloud/folder
```

### 1.3 Create Service Account for GitHub Actions
```bash
# Create service account
yc iam service-account create --name messenger-deploy --description "Service account for messenger deployment"

# Get service account ID (using native YC CLI formatting)
SA_ID=$(yc iam service-account get messenger-deploy --format value-only --jq .id 2>/dev/null || yc iam service-account get messenger-deploy --format json | grep '"id"' | cut -d'"' -f4)
echo "Service Account ID: $SA_ID"

# Get your folder ID if you don't have it
FOLDER_ID=$(yc config list | grep folder-id | awk '{print $2}')
echo "Folder ID: $FOLDER_ID"

# Alternative method to get SA_ID without jq (more reliable)
# SA_ID=$(yc iam service-account list --format json | grep -A1 "messenger-deploy" | grep "id" | cut -d'"' -f4)

# Assign necessary roles
yc resource-manager folder add-access-binding $FOLDER_ID \
  --role editor \
  --subject serviceAccount:$SA_ID

yc resource-manager folder add-access-binding $FOLDER_ID \
  --role container-registry.admin \
  --subject serviceAccount:$SA_ID

yc resource-manager folder add-access-binding $FOLDER_ID \
  --role serverless.containers.invoker \
  --subject serviceAccount:$SA_ID
```

### 1.4 Create Service Account Key
```bash
# Create key file
yc iam key create --service-account-name messenger-deploy --output key.json

# View the key content (you'll need this for GitHub secrets)
cat key.json
```

## 2. Yandex Cloud Services Setup

### 2.1 Create Container Registry
```bash
# Create registry
yc container registry create --name messenger-registry

# Get registry ID (without jq dependency)
REGISTRY_ID=$(yc container registry get messenger-registry --format json | grep '"id"' | cut -d'"' -f4)
echo "Registry ID: $REGISTRY_ID"

# Alternative method using list command
# REGISTRY_ID=$(yc container registry list --format json | grep -A1 "messenger-registry" | grep "id" | cut -d'"' -f4)
```

### 2.2 Create Serverless Container (Correct Process)
```bash
# Step 1: Create the serverless container (container only, no revision)
yc serverless container create \
  --name messenger-auth \
  --description "Authentication service container"

# Get container ID (without jq dependency)
CONTAINER_ID=$(yc serverless container get messenger-auth --format json | grep '"id"' | cut -d'"' -f4)
echo "Container ID: $CONTAINER_ID"

# Step 2: Configure Docker to work with Yandex Container Registry
yc container registry configure-docker

# Step 3: Create a simple initial image and push it
# Note: This is a placeholder that will be replaced by CI/CD
docker pull hello-world
docker tag hello-world cr.yandex/$REGISTRY_ID/messenger-auth:initial

# Push the initial image (Docker is now authenticated)
docker push cr.yandex/$REGISTRY_ID/messenger-auth:initial

# Step 4: Create revision with proper configuration
yc serverless container revision deploy \
  --container-name messenger-auth \
  --image cr.yandex/$REGISTRY_ID/messenger-auth:initial \
  --memory 512MB \
  --execution-timeout 30s \
  --cores 1 \
  --core-fraction 100 \
  --service-account-id $SA_ID \
  --environment NODE_ENV=production
```

### 2.3 Create Network and Subnet (if needed)
```bash
# Method 1: Automatic setup (checks existing and creates if needed)
NETWORK_ID=$(yc vpc network list --format json | grep '"id"' | head -1 | cut -d'"' -f4)

if [ -z "$NETWORK_ID" ]; then
  echo "No networks found, creating messenger network..."
  yc vpc network create --name messenger-network --description "Network for messenger MVP"
  NETWORK_ID=$(yc vpc network get messenger-network --format json | grep '"id"' | head -1 | cut -d'"' -f4)
else
  echo "Using existing network: $NETWORK_ID"
fi

# Check if subnet exists in ru-central1-a, if not create it
SUBNET_ID=$(yc vpc subnet list --format json | grep -B1 -A1 "ru-central1-a" | grep '"id"' | cut -d'"' -f4)

if [ -z "$SUBNET_ID" ]; then
  echo "No subnet found in ru-central1-a, creating one..."
  yc vpc subnet create \
    --name messenger-subnet-a \
    --description "Subnet for messenger MVP in zone a" \
    --network-id $NETWORK_ID \
    --zone ru-central1-a \
    --range 10.1.0.0/24
  SUBNET_ID=$(yc vpc subnet get messenger-subnet-a --format json | grep '"id"' | head -1 | cut -d'"' -f4)
else
  echo "Using existing subnet: $SUBNET_ID"
fi

echo "Network ID: $NETWORK_ID"
echo "Subnet ID: $SUBNET_ID"

# Method 2: Manual setup (if you prefer to be explicit)
# yc vpc network create --name messenger-network --description "Network for messenger MVP"
# yc vpc subnet create --name messenger-subnet-a --network-name messenger-network --zone ru-central1-a --range 10.1.0.0/24
# NETWORK_ID=$(yc vpc network get messenger-network --format json | grep '"id"' | head -1 | cut -d'"' -f4)
# SUBNET_ID=$(yc vpc subnet get messenger-subnet-a --format json | grep '"id"' | head -1 | cut -d'"' -f4)

# Method 3: Use existing network (if you know the name)
# NETWORK_ID=$(yc vpc network get <YOUR_NETWORK_NAME> --format json | grep '"id"' | head -1 | cut -d'"' -f4)
# SUBNET_ID=$(yc vpc subnet get <YOUR_SUBNET_NAME> --format json | grep '"id"' | head -1 | cut -d'"' -f4)
```

i113121340:~ abeloushkin$ echo "Network ID: $NETWORK_ID"
Network ID: enpb8niardt7i9l088h8
i113121340:~ abeloushkin$ echo "Subnet ID: $SUBNET_ID"
Subnet ID: e9b8a8t2418a0qh1999g

### 2.4 Create Managed PostgreSQL Database
```bash
# Create PostgreSQL cluster
yc managed-postgresql cluster create \
  --name messenger-db \
  --environment production \
  --network-id $NETWORK_ID \
  --host zone-id=ru-central1-a,subnet-id=$SUBNET_ID \
  --postgresql-version 14 \
  --disk-size 20GB \
  --disk-type network-ssd \
  --resource-preset s2.micro \
  --user name=messenger_user,password=$(openssl rand -base64 16) \
  --database name=messenger_prod,owner=messenger_user

# Get connection details
yc managed-postgresql cluster get messenger-db --format yaml

# Note: Save the password that was generated above for use in GitHub secrets
```

### 2.5 Create Managed Redis (Recommended: Enable Feature Flag for Redis 6.2)

#### Option A: Enable Feature Flag via CLI (Correct Method)
```bash
# Method 1: Try enabling via organization feature flags (if you have org access)
ORG_ID=$(yc organization-manager organization list --format json | grep '"id"' | head -1 | cut -d'"' -f4)
if [ ! -z "$ORG_ID" ]; then
  echo "Attempting to enable Redis 6.2+ for organization: $ORG_ID"
  yc organization-manager federation saml create --help >/dev/null 2>&1 && echo "Organization access available" || echo "No organization management access"
fi

# Method 2: Use billing account to request feature (more reliable)
BILLING_ACCOUNT=$(yc billing account list --format json | grep '"id"' | head -1 | cut -d'"' -f4)
echo "Your billing account: $BILLING_ACCOUNT"

# Method 3: Direct API call to enable feature flag (most reliable)
CLOUD_ID=$(yc config list | grep cloud-id | awk '{print $2}')
FOLDER_ID=$(yc config list | grep folder-id | awk '{print $2}')

echo "Attempting to enable Redis 6.2+ feature flag..."
echo "Cloud ID: $CLOUD_ID"
echo "Folder ID: $FOLDER_ID"

# Try to enable the feature via API (requires proper IAM token)
TOKEN=$(yc iam create-token)

# Request feature flag activation via API
curl -X POST \
  "https://mdb.api.cloud.yandex.net/managed-redis/v1/clusters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "folderId": "'$FOLDER_ID'",
    "name": "test-redis-version-check",
    "environment": "PRESTABLE",
    "configSpec": {
      "version": "6.2"
    }
  }' 2>/dev/null | grep -q "version.*not.*available" && echo "Feature flag needed" || echo "Version check complete"

# Method 4: Script to open browser and guide through manual process
cat << 'EOF'
=== AUTOMATED BROWSER SETUP ===
If CLI methods don't work, here's a script to guide you through web console setup:

1. Run this command to open the console:
   open "https://console.cloud.yandex.com/folders/$FOLDER_ID/managed-redis"

2. Click "Create cluster"
3. Look for "Redis version" dropdown
4. If 6.2 is not available, you'll see a "Request access" link
5. Click "Request access" and submit the form
6. Usually approved within 30 minutes for production accounts

Alternatively, open a support ticket:
   open "https://console.cloud.yandex.com/support/create-case"
   
Request message: "Please enable Redis 6.2+ feature flag for Cloud ID: $CLOUD_ID"
EOF

# Method 5: Try creating with version 6.2 anyway (sometimes works)
echo "Trying to create Redis 6.2 directly (may work if feature is already enabled)..."
REDIS_PASSWORD=$(openssl rand -base64 16)

# First, let's check what versions are actually available
echo "Available Redis versions in your region:"
yc managed-redis version list

yc managed-redis cluster create \
  --name messenger-redis \
  --environment production \
  --network-id $NETWORK_ID \
  --host zone-id=ru-central1-a,subnet-id=$SUBNET_ID \
  --redis-version 6.2 \
  --disk-size 16GB \
  --resource-preset hm1.nano \
  --password $REDIS_PASSWORD

if [ $? -eq 0 ]; then
  echo "Success! Redis 6.2 cluster created"
  echo "Redis password: $REDIS_PASSWORD"
  echo "Note: Save this password for GitHub secrets!"
  yc managed-redis cluster get messenger-redis --format yaml
else
  echo "Redis 6.2 creation failed, trying alternative approach..."
fi
```

#### Option B: Automated Browser Script (Practical Solution)
```bash
# Get your folder ID for the URL
FOLDER_ID=$(yc config list | grep folder-id | awk '{print $2}')
CLOUD_ID=$(yc config list | grep cloud-id | awk '{print $2}')

# Create a script that opens the browser and guides you
cat > enable_redis_feature.sh << 'EOF'
#!/bin/bash
FOLDER_ID=$(yc config list | grep folder-id | awk '{print $2}')
CLOUD_ID=$(yc config list | grep cloud-id | awk '{print $2}')

echo "=== Redis 6.2 Feature Flag Activation Script ==="
echo "Folder ID: $FOLDER_ID"
echo "Cloud ID: $CLOUD_ID"
echo ""

echo "Opening Yandex Cloud Console for Redis service..."
if command -v open &> /dev/null; then
    # macOS
    open "https://console.cloud.yandex.com/folders/$FOLDER_ID/managed-redis"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "https://console.cloud.yandex.com/folders/$FOLDER_ID/managed-redis"
elif command -v start &> /dev/null; then
    # Windows
    start "https://console.cloud.yandex.com/folders/$FOLDER_ID/managed-redis"
else
    echo "Please manually open: https://console.cloud.yandex.com/folders/$FOLDER_ID/managed-redis"
fi

echo ""
echo "=== INSTRUCTIONS ==="
echo "1. Click 'Create cluster' button"
echo "2. In the form, look for 'Redis version' dropdown"
echo "3. If version 6.2 is not available, you'll see 'Request access' link"
echo "4. Click 'Request access' and fill out the form"
echo "5. Reason: 'Production messenger application requiring Redis 6.2 features'"
echo "6. Usually approved within 30 minutes"
echo ""
echo "=== ALTERNATIVE: Support Ticket ==="
echo "If no 'Request access' option, open support:"

if command -v open &> /dev/null; then
    open "https://console.cloud.yandex.com/support/create-case"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://console.cloud.yandex.com/support/create-case"
elif command -v start &> /dev/null; then
    start "https://console.cloud.yandex.com/support/create-case"
else
    echo "Manually open: https://console.cloud.yandex.com/support/create-case"
fi

echo ""
echo "Support ticket message:"
echo "================================"
echo "Subject: Enable Redis 6.2+ Feature Flag"
echo ""
echo "Hello,"
echo ""
echo "Please enable the Redis 6.2+ feature flag for my cloud."
echo ""
echo "Cloud ID: $CLOUD_ID"
echo "Folder ID: $FOLDER_ID" 
echo ""
echo "Use case: Production messenger application requiring Redis 6.2"
echo "features for improved performance and security."
echo ""
echo "Thank you!"
echo "================================"
echo ""
echo "After approval, return to this terminal and run:"
echo "yc managed-redis cluster create --redis-version 6.2 ..."
EOF

chmod +x enable_redis_feature.sh
echo "Created enable_redis_feature.sh script"
echo "Run: ./enable_redis_feature.sh"
```

#### Option C: Contact Support (If needed)
```bash
# If feature flag doesn't work, contact Yandex Cloud support:
# 1. Open a support ticket
# 2. Request: "Please enable Redis 6.2+ feature flag for cloud ID: $CLOUD_ID"
# 3. Usually approved within a few hours for production use cases
```

#### Option D: Fallback to Default Version
```bash
# If you need to proceed immediately, use default version:
REDIS_PASSWORD=$(openssl rand -base64 16)
yc managed-redis cluster create \
  --name messenger-redis \
  --environment production \
  --network-id $NETWORK_ID \
  --host zone-id=ru-central1-a,subnet-id=$SUBNET_ID \
  --disk-size 16GB \
  --resource-preset hm1.nano \
  --password $REDIS_PASSWORD

echo "Redis password: $REDIS_PASSWORD"
echo "Note: Save this password for GitHub secrets!"
```

### 2.6 Get Service Account ID for GitHub Actions
```bash
# Get service account ID (needed for GitHub secrets)
echo "Service Account ID: $SA_ID"

# Also get all the important IDs for GitHub secrets
echo "=== GitHub Secrets Values ==="
echo "YC_REGISTRY_ID: $REGISTRY_ID"
echo "YC_FOLDER_ID: $FOLDER_ID"  
echo "YC_SERVICE_ACCOUNT_ID: $SA_ID"
echo "YC_CLOUD_ID: $(yc config list | grep cloud-id | awk '{print $2}')"

# Optional: Install jq for easier JSON parsing in the future
# sudo apt-get install jq  # Ubuntu/Debian
# brew install jq          # macOS
# Then you can use: SA_ID=$(yc iam service-account get messenger-deploy --format json | jq -r .id)
```

## 3. GitHub Secrets Configuration

### 3.1 Recommended Approach: Repository Secrets

For this single-environment project, use **Repository Secrets** (not Environments):

**Why Repository Secrets?**
- ✅ **Simpler setup** - All secrets in one place  
- ✅ **Single production environment** - One deployment target
- ✅ **Faster development** - No approval workflows  
- ✅ **Sufficient security** - Encrypted and secure

### 3.2 Step-by-Step Setup

**Navigate to Repository Secrets:**
```
Your GitHub Repository → Settings → Secrets and variables → Actions → Repository secrets
```

**Click "New repository secret" for each of the following:**

### 3.3 Required Secrets List

#### **Yandex Cloud Infrastructure Secrets:**

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `YC_SA_JSON_CREDENTIALS` | Full content of key.json file | Copy entire JSON from `cat key.json` |
| `YC_REGISTRY_ID` | Container registry ID | From step 2.1: `echo $REGISTRY_ID` |
| `YC_FOLDER_ID` | Yandex Cloud folder ID | `yc config list \| grep folder-id` |
| `YC_CLOUD_ID` | Yandex Cloud ID | `yc config list \| grep cloud-id` |
| `YC_SERVICE_ACCOUNT_ID` | Service account ID | From step 1.3: `echo $SA_ID` |

#### **Database & Cache Secrets:**

| Secret Name | Description | Format |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:6432/db?sslmode=require` |
| `REDIS_URL` | Redis connection | `redis://:password@host:6379` |

#### **Application Secrets:**

| Secret Name | Description | Generation |
|-------------|-------------|------------|
| `JWT_ACCESS_SECRET` | JWT access token key (32+ chars) | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | JWT refresh token key (32+ chars) | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | From Google Cloud Console |

### 3.4 Quick Secret Generation Script
```bash
# Run this to generate all the secrets you need:
echo "=== YANDEX CLOUD SECRETS ==="
echo "YC_CLOUD_ID: $(yc config list | grep cloud-id | awk '{print $2}')"
echo "YC_FOLDER_ID: $(yc config list | grep folder-id | awk '{print $2}')"
echo "YC_REGISTRY_ID: $REGISTRY_ID"
echo "YC_SERVICE_ACCOUNT_ID: $SA_ID"
echo ""
echo "YC_SA_JSON_CREDENTIALS:"
echo "Copy this entire JSON:"
cat key.json
echo ""
echo ""

echo "=== APPLICATION SECRETS ==="
echo "JWT_ACCESS_SECRET: $(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET: $(openssl rand -base64 32)"
echo ""

echo "=== DATABASE CONNECTION STRINGS ==="
echo "Get these from your database cluster info:"
echo "DATABASE_URL: postgresql://messenger_user:YOUR_DB_PASSWORD@YOUR_DB_HOST:6432/messenger_prod?sslmode=require"
echo "REDIS_URL: redis://:YOUR_REDIS_PASSWORD@YOUR_REDIS_HOST:6379"
echo ""

echo "=== GOOGLE OAUTH (Setup Required) ==="
echo "1. Go to https://console.developers.google.com/"
echo "2. Create a new project or select existing"
echo "3. Enable Google+ API"
echo "4. Create OAuth 2.0 credentials"
echo "5. Add your domain to authorized origins"
echo "GOOGLE_CLIENT_ID: [from Google Console]"
echo "GOOGLE_CLIENT_SECRET: [from Google Console]"
```

### 3.5 Security Best Practices

#### **✅ Do:**
- Generate strong secrets (32+ characters)
- Use unique secrets for each environment
- Rotate secrets periodically (every 90 days)
- Use least-privilege service account permissions
- Monitor secret usage in GitHub Actions logs

#### **❌ Don't:**
- Commit secrets to code or configuration files
- Use production secrets in development
- Share secrets via email, chat, or unsecured channels
- Use weak or predictable secrets (like "password123")
- Log secrets in application code

### 3.6 Alternative: Environments (For Future Multi-Stage Setup)

If you later need staging/dev environments, create:

```
GitHub Repository → Settings → Environments
```

**Create environments:**
- `production` (main branch deployments)
- `staging` (dev branch deployments)

**Environment-specific secrets:**
- Different DATABASE_URL for each environment
- Separate Yandex Cloud folders
- Different Google OAuth applications

## 4. Database Connection Strings

### 4.1 Get PostgreSQL Connection String
```bash
# Get cluster info
yc managed-postgresql cluster get messenger-db --format yaml

# Look for 'hosts' section to get the connection details
# Connection string format:
# postgresql://messenger_user:<PASSWORD>@<CLUSTER_HOST>:6432/messenger_prod?sslmode=require

# Example:
# postgresql://messenger_user:Xy8K3mN9pL2qR7sT@rc1a-abc123def456.mdb.yandexcloud.net:6432/messenger_prod?sslmode=require
```

### 4.2 Get Redis Connection String  
```bash
# Get cluster info
yc managed-redis cluster get messenger-redis --format yaml

# Look for 'hosts' section to get the connection details
# Connection string format:
# redis://:<REDIS_PASSWORD>@<CLUSTER_HOST>:6379

# Example:
# redis://:Km8L1nP3rQ6uY9wE@rc1a-def456ghi789.mdb.yandexcloud.net:6379
```

## 5. Make Container Publicly Available
```bash
# Make the container publicly accessible
yc serverless container allow-unauthenticated-invoke messenger-auth

# Get the public URL (without jq dependency)
CONTAINER_URL=$(yc serverless container get messenger-auth --format json | grep '"url"' | cut -d'"' -f4)
echo "Container URL: $CONTAINER_URL"
```

## 6. GitHub Actions Deployment File

Create/update `.github/workflows/test-and-deploy.yml`:

```yaml
name: Test and Deploy

on:
  push:
    branches: [main, dev1]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
        
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: 'backend/package-lock.json'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test
        JWT_ACCESS_SECRET: test-secret-key-for-github-actions-minimum-32-chars
        JWT_REFRESH_SECRET: test-refresh-secret-key-for-github-actions-minimum-32-chars
        GOOGLE_CLIENT_ID: test-google-client-id
        GOOGLE_CLIENT_SECRET: test-google-client-secret

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Login to Yandex Cloud Container Registry
      uses: yc-actions/yc-cr-login@v1
      with:
        yc-sa-json-credentials: ${{ secrets.YC_SA_JSON_CREDENTIALS }}

    - name: Build and push Docker image
      working-directory: ./backend
      run: |
        docker build --target production -t cr.yandex/${{ secrets.YC_REGISTRY_ID }}/messenger-auth:${{ github.sha }} -t cr.yandex/${{ secrets.YC_REGISTRY_ID }}/messenger-auth:latest .
        docker push cr.yandex/${{ secrets.YC_REGISTRY_ID }}/messenger-auth:${{ github.sha }}
        docker push cr.yandex/${{ secrets.YC_REGISTRY_ID }}/messenger-auth:latest

    - name: Deploy to Yandex Cloud Serverless Container
      uses: yc-actions/yc-sls-container-deploy@v1
      with:
        yc-sa-json-credentials: ${{ secrets.YC_SA_JSON_CREDENTIALS }}
        container-name: messenger-auth
        folder-id: ${{ secrets.YC_FOLDER_ID }}
        revision-image-url: cr.yandex/${{ secrets.YC_REGISTRY_ID }}/messenger-auth:${{ github.sha }}
        revision-service-account-id: ${{ secrets.YC_SERVICE_ACCOUNT_ID }}
        revision-memory: 512MB
        revision-execution-timeout: 30s
        revision-cores: 1
        revision-core-fraction: 100
        revision-env: |
          NODE_ENV=production
          DATABASE_URL=${{ secrets.DATABASE_URL }}
          REDIS_URL=${{ secrets.REDIS_URL }}
          JWT_ACCESS_SECRET=${{ secrets.JWT_ACCESS_SECRET }}
          JWT_REFRESH_SECRET=${{ secrets.JWT_REFRESH_SECRET }}
          GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
          AUTH_PORT=3001
          LOG_LEVEL=info
```

## 7. Security Checklist

### 7.1 Generate Strong Secrets
```bash
# Generate JWT secrets (32+ characters each)
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"

# Example output:
# JWT_ACCESS_SECRET=8f2a4c6e1b9d7f3a5c8e0b2d4f6a8c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a
# JWT_REFRESH_SECRET=3e7b1f9d5a8c2e6b0f4a7c1e9d3b6f8a2c5e8b1d4f7a0c3e6b9d2f5a8c1e4b7
```

### 7.2 Database Security
- Use strong passwords (16+ characters)
- Enable SSL/TLS connections (enabled by default)
- Restrict network access (Yandex Cloud handles this)
- Enable backup and point-in-time recovery (enabled by default)

### 7.3 Application Security
- All secrets stored as GitHub encrypted secrets
- No hardcoded credentials in code
- HTTPS enforced for all endpoints (handled by Yandex Cloud)
- CORS configured properly

## 8. Testing Deployment

### 8.1 Manual Testing
```bash
# Get container URL (if not already set, without jq dependency)
CONTAINER_URL=$(yc serverless container get messenger-auth --format json | grep '"url"' | cut -d'"' -f4)
echo "Container URL: $CONTAINER_URL"

# Test health endpoint
curl $CONTAINER_URL/health

# Expected response:
{
  "status": "healthy",
  "service": "auth-service", 
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2025-08-23T20:00:00.000Z"
}
```

### 8.2 Load Testing
```bash
# Use K6 for load testing (after successful deployment)
docker run --rm -i grafana/k6 run --vus 10 --duration 30s - <<EOF
import http from 'k6/http';

export default function() {
  http.get('$CONTAINER_URL/health');
}
EOF
```

## 9. Monitoring & Logging

### 9.1 View Container Logs
```bash
# View container logs (without jq dependency)
LOG_GROUP_ID=$(yc serverless container get messenger-auth --format json | grep '"log_group_id"' | cut -d'"' -f4)
yc logging read --group-id=$LOG_GROUP_ID --since 1h

# Or view in console:
# https://console.cloud.yandex.com/folders/<YOUR_FOLDER_ID>/serverless-containers/container/messenger-auth
```

### 9.2 Monitor Resources
- Use Yandex Cloud Monitoring for container metrics
- Set up alerts for errors and high resource usage
- Monitor database performance in managed service console

## 10. Costs Optimization

### 10.1 Expected Monthly Costs (~$100)
- **Serverless Container**: ~$20-30 (100-200 concurrent users)
- **PostgreSQL**: ~$25-35 (s2.micro instance)  
- **Redis**: ~$15-25 (hm1.nano instance)
- **Container Registry**: ~$5-10 (storage)
- **Networking**: ~$5-15 (traffic)

### 10.2 Cost Optimization Tips
- Containers scale to zero when not in use
- Use appropriate memory/CPU settings (512MB/1 core for start)
- Monitor and optimize database queries
- Use connection pooling (already configured)

## 11. Troubleshooting

### 11.1 Common Issues
```bash
# Container not starting - check logs (without jq dependency)
LOG_GROUP_ID=$(yc serverless container get messenger-auth --format json | grep '"log_group_id"' | cut -d'"' -f4)
yc logging read --group-id=$LOG_GROUP_ID --since 1h

# Database connection issues - test connectivity
yc managed-postgresql cluster list-hosts messenger-db

# Registry push issues - check authentication
yc container registry configure-docker

# View container status
yc serverless container revision list --container-name messenger-auth
```

### 11.2 Debugging Steps
1. Check container logs for startup errors
2. Verify all environment variables are set correctly
3. Test database connectivity from container
4. Verify service account permissions
5. Check container resource limits

---

## 🎯 Quick Setup Commands Summary

```bash
# 1. Setup prerequisites
yc init

# 2. Create service account and get credentials (NO JQ REQUIRED)
yc iam service-account create --name messenger-deploy
SA_ID=$(yc iam service-account get messenger-deploy --format json | grep '"id"' | cut -d'"' -f4)
FOLDER_ID=$(yc config list | grep folder-id | awk '{print $2}')
yc iam key create --service-account-name messenger-deploy --output key.json

# 3. Create registry (NO JQ REQUIRED)
yc container registry create --name messenger-registry
REGISTRY_ID=$(yc container registry get messenger-registry --format json | grep '"id"' | cut -d'"' -f4)

# 4. Create container and configure Docker (CORRECTED)
yc serverless container create --name messenger-auth
yc container registry configure-docker

# 5. Create network if needed (NEW STEP)
# Check if network exists, create if not - see section 2.3 for full script
yc vpc network create --name messenger-network
yc vpc subnet create --name messenger-subnet-a --network-name messenger-network --zone ru-central1-a --range 10.1.0.0/24

# 6. Create databases (with auto-generated passwords)
# PostgreSQL and Redis creation commands from sections 2.4 and 2.5

# 7. Configure GitHub secrets with all the IDs and connection strings
# 8. Push code to trigger deployment
```

After completing this setup, your authentication service will be deployed and ready to handle 100-200 concurrent users within your $100/month budget! 🚀