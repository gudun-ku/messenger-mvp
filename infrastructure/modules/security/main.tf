# Service Account for container execution
resource "yandex_iam_service_account" "container_sa" {
  name        = var.service_account_name
  description = "Service account for ${var.project_name} containers in ${var.environment}"
  
  labels = merge(var.common_tags, {
    Name = var.service_account_name
    Type = "service-account"
    Service = "container"
  })
}

# IAM roles for the service account
resource "yandex_resourcemanager_folder_iam_member" "container_sa_roles" {
  for_each = toset([
    "serverless.containers.invoker",
    "container-registry.images.puller",
    "logging.writer",
    "monitoring.editor"
  ])
  
  folder_id = var.folder_id
  role      = each.key
  member    = "serviceAccount:${yandex_iam_service_account.container_sa.id}"
}

# Generate secure passwords for database and application
resource "random_password" "postgres_password" {
  length  = 32
  special = true
  
  lifecycle {
    ignore_changes = [length, special]
  }
}

resource "random_password" "redis_password" {
  length  = 32
  special = true
  
  lifecycle {
    ignore_changes = [length, special]
  }
}

resource "random_password" "jwt_access_secret" {
  length  = 64
  special = false
  upper   = true
  lower   = true
  numeric = true
  
  lifecycle {
    ignore_changes = [length, special, upper, lower, numeric]
  }
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
  upper   = true
  lower   = true
  numeric = true
  
  lifecycle {
    ignore_changes = [length, special, upper, lower, numeric]
  }
}

# Lockbox secret for storing application secrets
resource "yandex_lockbox_secret" "app_secrets" {
  name        = "${var.project_name}-${var.environment}-secrets"
  description = "Application secrets for ${var.project_name} ${var.environment}"
  
  labels = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-secrets"
    Type = "secret"
  })
}

# Grant service account access to the secret
resource "yandex_lockbox_secret_iam_binding" "app_secrets_access" {
  secret_id = yandex_lockbox_secret.app_secrets.id
  role      = "lockbox.payloadViewer"
  
  members = [
    "serviceAccount:${yandex_iam_service_account.container_sa.id}"
  ]
}