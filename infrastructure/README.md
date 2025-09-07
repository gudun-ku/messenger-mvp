# Messenger MVP Infrastructure

This directory contains Terraform Infrastructure as Code (IaC) for the Messenger MVP project, providing automated deployment to Yandex Cloud.

## 🏗️ Architecture Overview

The infrastructure is organized into reusable modules:

- **Network Module**: VPC, subnets, and security groups
- **Security Module**: Service accounts and IAM roles  
- **Database Module**: Managed PostgreSQL cluster with automated backups
- **Redis Module**: Managed Redis cluster for caching
- **Container Module**: Serverless containers with auto-scaling

## 📁 Directory Structure

```
infrastructure/
├── modules/           # Reusable Terraform modules
│   ├── network/       # VPC, subnets, security groups
│   ├── security/      # IAM, service accounts
│   ├── database/      # PostgreSQL cluster
│   ├── redis/         # Redis cluster
│   └── container/     # Serverless containers
├── environments/      # Environment-specific configurations
│   ├── dev/          # Development environment
│   ├── staging/      # Staging environment
│   └── prod/         # Production environment
└── scripts/          # Helper scripts for operations
```

## 🚀 Quick Start

### 1. Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.6
- [Yandex Cloud CLI](https://cloud.yandex.com/docs/cli/quickstart)
- Authenticated with Yandex Cloud: `yc init`

### 2. Set up remote state backend

```bash
# Create S3 bucket for Terraform state
./scripts/setup-backend.sh
```

### 3. Initialize Terraform for your environment

```bash
# Initialize development environment
./scripts/init.sh dev

# Or staging
./scripts/init.sh staging

# Or production  
./scripts/init.sh prod
```

### 4. Configure your secrets

```bash
export TF_VAR_app_secrets='{"GOOGLE_CLIENT_ID":"your-client-id","GOOGLE_CLIENT_SECRET":"your-client-secret"}'
```

### 5. Plan and apply infrastructure

```bash
# Plan changes
./scripts/plan.sh dev

# Apply changes
./scripts/apply.sh dev
```

## 🔧 Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `setup-backend.sh` | Create S3 bucket for remote state | `./scripts/setup-backend.sh` |
| `init.sh` | Initialize Terraform for environment | `./scripts/init.sh <env>` |
| `plan.sh` | Plan Terraform changes | `./scripts/plan.sh <env>` |
| `apply.sh` | Apply Terraform changes | `./scripts/apply.sh <env>` |
| `destroy.sh` | Destroy infrastructure | `./scripts/destroy.sh <env>` |

## 🏷️ Environment Configurations

### Development (`dev`)
- **Cost-optimized** resources (s2.micro, hm1.nano)
- **No deletion protection**
- **Shorter backup retention** (7 days)
- **Minimal resource allocation** (256MB memory, 1 core)

### Staging (`staging`)
- **Balanced** resources (s2.micro, hm1.nano)
- **Production-like configuration** with cost efficiency
- **Medium backup retention** (7 days)
- **Moderate resource allocation** (384MB memory, 1 core)

### Production (`prod`)
- **High-performance** resources (s2.small, hm1.micro)
- **Deletion protection enabled**
- **Extended backup retention** (30 days)
- **Production resource allocation** (512MB memory, 1 core)

## 🔐 Secret Management

Application secrets are managed via environment variables:

```bash
# Required for all environments
export TF_VAR_app_secrets='{
  "GOOGLE_CLIENT_ID": "your-google-client-id",
  "GOOGLE_CLIENT_SECRET": "your-google-client-secret"
}'
```

Database and Redis passwords are automatically generated and stored securely in Yandex Lockbox.

## 🔄 CI/CD Integration

The infrastructure supports GitOps workflow with GitHub Actions:

1. **Pull Requests**: Terraform plan for dev/staging
2. **Main Branch**: 
   - Build and push container image
   - Deploy to staging automatically
   - Deploy to production (manual approval required)

### GitHub Secrets Required

```bash
YC_SA_JSON_CREDENTIALS      # Service account key JSON
YC_CLOUD_ID                 # Yandex Cloud ID
YC_FOLDER_ID                # Yandex Folder ID
YC_REGISTRY_ID              # Container Registry ID
APP_SECRETS_STAGING         # Staging app secrets JSON
APP_SECRETS_PRODUCTION      # Production app secrets JSON
```

## 📊 Resource Overview

### Networking
- **VPC**: Custom network with multi-zone support
- **Subnets**: Zone-specific subnets (ru-central1-a, ru-central1-b)
- **Security Groups**: Restrictive rules for database, Redis, and containers

### Database
- **PostgreSQL 14** with high availability
- **Automated backups** with configurable retention
- **TLS encryption** and network isolation
- **Multi-zone deployment** for resilience

### Caching
- **Redis/Valkey** for session and application caching
- **Network isolation** within VPC
- **Automated failover** and backup

### Compute
- **Serverless Containers** with auto-scaling
- **Network connectivity** to database and Redis
- **Environment-specific resource allocation**
- **Zero-downtime deployments**

## 🔍 Outputs

Each environment provides the following outputs:

```bash
# View outputs
terraform output

# Available outputs:
# - database_connection: Database host, port, database name, username
# - database_password: Database password (sensitive)
# - redis_connection: Redis host and port
# - redis_password: Redis password (sensitive)  
# - container_url: Application URL
# - network_info: VPC and subnet information
# - environment_info: Environment metadata
```

## 🛠️ Customization

### Modifying Resources

1. **Update terraform.tfvars** in the environment directory
2. **Run terraform plan** to preview changes
3. **Run terraform apply** to apply changes

### Adding New Environments

1. **Create new directory** in `environments/`
2. **Copy configuration files** from existing environment
3. **Update terraform.tfvars** with environment-specific values
4. **Initialize and apply** Terraform

### Module Development

Modules follow standard Terraform structure:
- `main.tf`: Resource definitions
- `variables.tf`: Input variables
- `outputs.tf`: Output values
- `versions.tf`: Provider requirements

## 🚨 Important Notes

### Cost Management
- **Development**: ~$20-30/month
- **Staging**: ~$25-35/month  
- **Production**: ~$50-80/month

### Security
- All resources are network-isolated within VPC
- Database and Redis require TLS connections
- Service accounts follow principle of least privilege
- Secrets are managed via Yandex Lockbox

### Backup Strategy
- **Database**: Automated daily backups with point-in-time recovery
- **Redis**: Automated backup for data persistence
- **Terraform State**: Versioned in Object Storage with lifecycle policies

### Monitoring
- Infrastructure monitoring via Yandex Cloud Monitoring
- Application logs via Cloud Logging
- Custom metrics and alerting (configurable)

## 📚 Additional Resources

- [Terraform Yandex Provider Documentation](https://registry.terraform.io/providers/yandex-cloud/yandex/latest/docs)
- [Yandex Cloud Documentation](https://cloud.yandex.com/docs/)
- [Project Migration Plan](../docs/TERRAFORM_MIGRATION_PLAN.md)