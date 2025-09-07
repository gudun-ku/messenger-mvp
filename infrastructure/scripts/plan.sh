#!/bin/bash

# Plan Terraform changes for a specific environment
# Usage: ./scripts/plan.sh <environment> [additional-args]

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

echo "📋 Planning Terraform changes for environment: $ENVIRONMENT"

# Change to environment directory
cd "$PROJECT_ROOT/environments/$ENVIRONMENT"

# Check if TF_VAR_app_secrets is set
if [ -z "$TF_VAR_app_secrets" ]; then
    echo "⚠️  Warning: TF_VAR_app_secrets is not set"
    echo "   Please set your application secrets:"
    echo "   export TF_VAR_app_secrets='{\"GOOGLE_CLIENT_ID\":\"your-id\",\"GOOGLE_CLIENT_SECRET\":\"your-secret\"}'"
    echo ""
fi

# Run terraform plan
echo "🔍 Running terraform plan..."
terraform plan -var-file=terraform.tfvars "$@"

echo ""
echo "✨ Plan completed for $ENVIRONMENT environment"
echo ""
echo "Next steps:"
echo "1. Review the plan above carefully"
echo "2. Apply changes: ./scripts/apply.sh $ENVIRONMENT"