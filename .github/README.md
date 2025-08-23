# GitHub Actions Configuration

## Overview

The CI/CD pipeline is configured to run tests and deploy the authentication service to Yandex Cloud using GitHub Actions.

## Workflow: `test-and-deploy.yml`

### Test Job

Runs on every push to `main`/`develop` branches and pull requests to `main`.

**Services:**
- PostgreSQL 14 (port 5432)
- Redis 7 (port 6379)

**Steps:**
1. **Setup Node.js 18** with npm caching (backend/package-lock.json)
2. **Install dependencies** (npm ci in backend/)
3. **Run tests** with test environment variables
4. **Run linter** (TypeScript compilation check)
5. **Build application** (TypeScript compilation)

### Deploy Job

Runs only on `main` branch after successful tests.

**Steps:**
1. **Login to Yandex Container Registry**
2. **Build and push Docker image**
3. **Deploy to Yandex Cloud serverless container**

## Required GitHub Secrets

### Yandex Cloud Configuration
- `YC_SA_KEY` - Service account key for container registry
- `YC_TOKEN` - Yandex Cloud CLI token
- `YC_CLOUD_ID` - Yandex Cloud ID
- `YC_FOLDER_ID` - Yandex Cloud folder ID
- `YC_REGISTRY_ID` - Container registry ID
- `YC_CONTAINER_ID` - Serverless container ID

### Application Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` - JWT access token secret (32+ chars)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (32+ chars)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

## Environment Variables

### Test Environment
```
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=test_access_secret_key_for_github_actions_32_chars
JWT_REFRESH_SECRET=test_refresh_secret_key_for_github_actions_32_chars
GOOGLE_CLIENT_ID=test_google_client_id_for_github_actions
GOOGLE_CLIENT_SECRET=test_google_client_secret_for_github_actions
LOG_LEVEL=error
```

### Production Environment
```
NODE_ENV=production
DATABASE_URL=${{ secrets.DATABASE_URL }}
REDIS_URL=${{ secrets.REDIS_URL }}
JWT_ACCESS_SECRET=${{ secrets.JWT_ACCESS_SECRET }}
JWT_REFRESH_SECRET=${{ secrets.JWT_REFRESH_SECRET }}
GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
LOG_LEVEL=info
```

## Container Deployment

**Specs:**
- Memory: 512MB
- CPU: 0.5 cores  
- Execution timeout: 30s
- Multi-stage Docker build (production optimized)

## Fixes Applied

1. **Cache Path Fix**: Added `cache-dependency-path: 'backend/package-lock.json'` to resolve dependency lock file error
2. **Environment Variables**: Updated from single JWT_SECRET to separate access/refresh secrets
3. **Lint Script**: Added TypeScript compilation check as lint step
4. **Build Step**: Added explicit build step to verify TypeScript compilation
5. **Production Config**: Updated deployment with all required environment variables

## Troubleshooting

### Common Issues

1. **"Dependencies lock file is not found"**
   - Fixed by specifying `cache-dependency-path: 'backend/package-lock.json'`

2. **"JWT secrets must be provided"**
   - Ensure all required secrets are configured in GitHub repository settings
   - JWT secrets must be at least 32 characters long

3. **"Google OAuth credentials must be provided"**
   - Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in repository secrets

4. **Build failures**
   - Check TypeScript compilation errors in the lint/build steps
   - Verify all environment variables are properly set