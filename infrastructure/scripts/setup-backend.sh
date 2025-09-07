#!/bin/bash

# Set up remote state backend for Terraform
# This script creates the S3 bucket in Yandex Object Storage for storing Terraform state

set -e

BUCKET_NAME="messenger-terraform-state"
REGION="ru-central1"

echo "🗄️  Setting up Terraform remote state backend"
echo "   Bucket: $BUCKET_NAME"
echo "   Region: $REGION"
echo ""

# Check if yc CLI is installed and configured
if ! command -v yc &> /dev/null; then
    echo "❌ Error: Yandex Cloud CLI (yc) is not installed"
    echo "   Please install it first: https://cloud.yandex.com/docs/cli/quickstart"
    exit 1
fi

# Check if user is authenticated
if ! yc config list &> /dev/null; then
    echo "❌ Error: Not authenticated with Yandex Cloud"
    echo "   Please run: yc init"
    exit 1
fi

# Get current folder ID
FOLDER_ID=$(yc config get folder-id)
if [ -z "$FOLDER_ID" ]; then
    echo "❌ Error: No folder ID configured"
    echo "   Please run: yc init"
    exit 1
fi

echo "📍 Using folder: $FOLDER_ID"

# Check if bucket already exists
echo "🔍 Checking if bucket exists..."
if yc storage bucket get --name="$BUCKET_NAME" &> /dev/null; then
    echo "✅ Bucket '$BUCKET_NAME' already exists"
else
    echo "📦 Creating bucket '$BUCKET_NAME'..."
    
    # Create the bucket
    yc storage bucket create \
        --name="$BUCKET_NAME" \
        --default-storage-class="standard" \
        --max-size=1073741824 \
        --public-read=false \
        --public-list=false
    
    echo "✅ Bucket created successfully"
fi

# Configure bucket versioning for state file safety
echo "🔄 Enabling versioning on bucket..."
yc storage bucket update \
    --name="$BUCKET_NAME" \
    --versioning=enabled

echo "✅ Versioning enabled"

# Set up lifecycle policy to manage old versions
echo "📝 Setting up lifecycle policy..."
cat > /tmp/lifecycle-policy.json << EOF
{
  "rules": [
    {
      "id": "terraform-state-cleanup",
      "enabled": true,
      "filter": {
        "prefix": ""
      },
      "transitions": [
        {
          "date": "",
          "days": 30,
          "storage_class": "cold"
        }
      ],
      "expiration": {
        "date": "",
        "days": 90,
        "expired_object_delete_marker": true
      },
      "noncurrent_version_transitions": [
        {
          "days": 7,
          "storage_class": "cold"
        }
      ],
      "noncurrent_version_expiration": {
        "days": 30
      },
      "abort_incomplete_multipart_upload": {
        "days": 1
      }
    }
  ]
}
EOF

yc storage bucket update \
    --name="$BUCKET_NAME" \
    --lifecycle-config-file=/tmp/lifecycle-policy.json

rm /tmp/lifecycle-policy.json
echo "✅ Lifecycle policy configured"

echo ""
echo "🎉 Remote state backend setup completed!"
echo ""
echo "Backend configuration:"
echo "  endpoint   = \"https://storage.yandexcloud.net\""
echo "  bucket     = \"$BUCKET_NAME\""
echo "  region     = \"$REGION\""
echo ""
echo "💡 Next steps:"
echo "1. Initialize Terraform for each environment:"
echo "   ./scripts/init.sh dev"
echo "   ./scripts/init.sh staging"
echo "   ./scripts/init.sh prod"
echo ""
echo "2. Set your application secrets:"
echo "   export TF_VAR_app_secrets='{\"GOOGLE_CLIENT_ID\":\"your-id\",\"GOOGLE_CLIENT_SECRET\":\"your-secret\"}'"
echo ""
echo "3. Plan and apply your infrastructure:"
echo "   ./scripts/plan.sh dev"
echo "   ./scripts/apply.sh dev"