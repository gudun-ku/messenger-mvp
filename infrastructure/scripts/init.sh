#!/bin/bash

# Initialize Terraform for a specific environment
# Usage: ./scripts/init.sh <environment>

set -e

ENVIRONMENT=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment>"
    echo "Available environments: dev, staging, prod"
    exit 1
fi

if [ ! -d "$PROJECT_ROOT/environments/$ENVIRONMENT" ]; then
    echo "Error: Environment '$ENVIRONMENT' does not exist"
    echo "Available environments:"
    ls -1 "$PROJECT_ROOT/environments/"
    exit 1
fi

echo "🚀 Initializing Terraform for environment: $ENVIRONMENT"

# Change to environment directory
cd "$PROJECT_ROOT/environments/$ENVIRONMENT"

# Initialize Terraform
echo "📋 Running terraform init..."
terraform init

# Validate configuration
echo "✅ Validating configuration..."
terraform validate

echo "✨ Terraform initialized successfully for $ENVIRONMENT environment"
echo ""
echo "Next steps:"
echo "1. Plan your changes: terraform plan -var-file=terraform.tfvars"
echo "2. Apply your changes: terraform apply -var-file=terraform.tfvars"
echo ""
echo "💡 Don't forget to set your app secrets:"
echo "export TF_VAR_app_secrets='{\"GOOGLE_CLIENT_ID\":\"your-id\",\"GOOGLE_CLIENT_SECRET\":\"your-secret\"}'"