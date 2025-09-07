#!/bin/bash

# Destroy Terraform infrastructure for a specific environment
# Usage: ./scripts/destroy.sh <environment> [additional-args]

set -e

ENVIRONMENT=$1
shift # Remove first argument, pass rest to terraform
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment> [additional-terraform-args]"
    echo "Available environments: dev, staging, prod"
    exit 1
fi

if [ ! -d "$PROJECT_ROOT/environments/$ENVIRONMENT" ]; then
    echo "Error: Environment '$ENVIRONMENT' does not exist"
    exit 1
fi

echo "💥 Destroying Terraform infrastructure for environment: $ENVIRONMENT"

# Change to environment directory
cd "$PROJECT_ROOT/environments/$ENVIRONMENT"

# Production safety check
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "⚠️  WARNING: You are about to destroy PRODUCTION infrastructure!"
    echo "   This action is IRREVERSIBLE and will delete:"
    echo "   - Database with all data"
    echo "   - Redis cache"
    echo "   - Serverless containers"
    echo "   - Network infrastructure"
    echo ""
    read -p "Type 'destroy-production' to confirm: " -r
    if [ "$REPLY" != "destroy-production" ]; then
        echo "❌ Production destruction cancelled"
        exit 1
    fi
else
    echo "⚠️  This will destroy all infrastructure for $ENVIRONMENT environment"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Destruction cancelled by user"
        exit 1
    fi
fi

# Show what will be destroyed
echo "🔍 Planning destruction..."
terraform plan -destroy -var-file=terraform.tfvars

echo ""
read -p "Proceed with destruction? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Destruction cancelled by user"
    exit 1
fi

# Run terraform destroy
echo "💥 Running terraform destroy..."
terraform destroy -var-file=terraform.tfvars "$@"

echo ""
echo "✨ Destruction completed for $ENVIRONMENT environment"
echo ""
echo "🧹 Cleanup complete:"
echo "   - All resources have been destroyed"
echo "   - Terraform state has been updated"
echo "   - No charges will be incurred for destroyed resources"
echo ""
echo "💡 To recreate infrastructure:"
echo "   ./scripts/apply.sh $ENVIRONMENT"