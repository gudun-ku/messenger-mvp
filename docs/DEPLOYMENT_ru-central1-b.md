# Zone Standardization to ru-central1-b

## Overview

This document outlines the migration of all Messenger MVP services to ru-central1-b zone for consistency and better network performance.

## New Infrastructure (ru-central1-b)

### Networks and Subnets
- **Network**: `messenger-network` (enpb8niardt7i9l088h8)
- **Subnet**: `messenger-subnet-b` (e2ljli2o9ruepoliolvj) - 10.2.0.0/24

### PostgreSQL Cluster
- **Name**: messenger-db-b
- **ID**: c9qctjfplc7l0jnkvnjs
- **Host**: rc1b-oiip89mb12qde9ig.mdb.yandexcloud.net
- **Zone**: ru-central1-b
- **User**: messenger_user
- **Database**: messenger_prod
- **Password**: NEdFcIO3iWS6RldgaVbDIA==
- **Port**: 6432 (pooler)

### Redis Cluster
- **Name**: messenger-redis-b
- **ID**: c9qb4upe0g5lltj30n9n
- **Host**: rc1b-o13hdmqndgiuppk9.mdb.yandexcloud.net
- **Zone**: ru-central1-b
- **Password**: MREdFcIO3iWS6RldgaVbDIA==
- **Port**: 6380
- **Version**: 8.1-valkey

## GitHub Secrets to Update

Update the following GitHub secrets with the new connection strings:

### DATABASE_URL
```
postgresql://messenger_user:NEdFcIO3iWS6RldgaVbDIA%3D%3D@rc1b-oiip89mb12qde9ig.mdb.yandexcloud.net:6432/messenger_prod
```

### REDIS_URL
```
redis://:MREdFcIO3iWS6RldgaVbDIA%3D%3D@rc1b-o13hdmqndgiuppk9.mdb.yandexcloud.net:6380
```

## Manual Steps Required

### 1. Update GitHub Secrets

```bash
# Via GitHub CLI (if available)
gh secret set DATABASE_URL -b 'postgresql://messenger_user:NEdFcIO3iWS6RldgaVbDIA%3D%3D@rc1b-oiip89mb12qde9ig.mdb.yandexcloud.net:6432/messenger_prod'
gh secret set REDIS_URL -b 'redis://:MREdFcIO3iWS6RldgaVbDIA%3D%3D@rc1b-o13hdmqndgiuppk9.mdb.yandexcloud.net:6380'
```

Or update manually through GitHub web interface:
1. Go to your repository settings
2. Navigate to Secrets and variables → Actions
3. Update DATABASE_URL with the new PostgreSQL connection string
4. Update REDIS_URL with the new Redis connection string

### 2. Deploy and Test

After updating the secrets:

```bash
# Trigger deployment by pushing to main branch
git commit --allow-empty -m "Trigger deployment with new ru-central1-b clusters"
git push origin main
```

### 3. Verify Deployment

Check the health endpoint to ensure connectivity:

```bash
curl https://<container-id>.containers.yandexcloud.net/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-08-24T14:45:00.000Z"
}
```

## Network Configuration

Both clusters are deployed in ru-central1-b with proper subnet configuration:
- All services in the same availability zone for optimal performance
- Consistent network topology
- Proper SSL/TLS configuration for security

## Monitoring

Monitor the new clusters through Yandex Cloud Console:
- PostgreSQL: https://console.cloud.yandex.ru/folders/b1gofbigjd7pm042dsot/managed-postgresql/cluster/c9qctjfplc7l0jnkvnjs/monitoring
- Redis: https://console.cloud.yandex.ru/folders/b1gofbigjd7pm042dsot/managed-redis/cluster/c9qb4upe0g5lltj30n9n/monitoring

## Cleanup (After Verification)

Once the new ru-central1-b infrastructure is verified working:

1. **Delete old PostgreSQL cluster** (messenger-db in ru-central1-a)
2. **Delete old Redis cluster** (messenger-redis in ru-central1-a)
3. **Clean up old subnet** (messenger-subnet-a)

**⚠️ Important**: Only perform cleanup after confirming the new infrastructure works correctly!

## Rollback Plan

If issues occur with the new infrastructure:

1. Revert GitHub secrets to original values:
   - DATABASE_URL: `<original-connection-string>`
   - REDIS_URL: `<original-connection-string>`

2. Trigger new deployment

3. Investigate issues with ru-central1-b clusters

## Benefits

- **Consistency**: All services in the same availability zone
- **Performance**: Reduced network latency between services
- **Simplicity**: Unified zone management
- **Cost optimization**: Better resource utilization within single zone