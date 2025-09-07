#!/bin/bash

# Apply Terraform changes for a specific environment
# Usage: ./scripts/apply.sh <environment> [additional-args]

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

echo "🚀 Applying Terraform changes for environment: $ENVIRONMENT"

# Change to environment directory
cd "$PROJECT_ROOT/environments/$ENVIRONMENT"

# Check if TF_VAR_app_secrets is set
if [ -z "$TF_VAR_app_secrets" ]; then
    echo "❌ Error: TF_VAR_app_secrets is not set"
    echo "   Please set your application secrets:"
    echo "   export TF_VAR_app_secrets='{\"GOOGLE_CLIENT_ID\":\"your-id\",\"GOOGLE_CLIENT_SECRET\":\"your-secret\"}'"
    echo ""
    read -p "Continue without app secrets? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted by user"
        exit 1
    fi
fi

# Run terraform apply
echo "⚡ Running terraform apply..."
terraform apply -var-file=terraform.tfvars "$@"

echo ""
echo "✨ Apply completed for $ENVIRONMENT environment"
echo ""
echo "🔍 Infrastructure status:"
terraform output

echo ""
echo "💡 Next steps:"
echo "1. Verify resources in Yandex Cloud Console"
echo "2. Test connectivity to database and Redis"
echo "3. Deploy application: update CI/CD pipeline"