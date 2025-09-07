# Serverless Container
resource "yandex_serverless_container" "main" {
  name        = var.container_name
  description = "Serverless container for ${var.project_name} ${var.environment}"
  memory      = var.memory
  core_fraction = var.core_fraction
  execution_timeout = var.execution_timeout
  service_account_id = var.service_account_id
  
  # Network connectivity
  connectivity {
    network_id = var.network_id
  }

  # Image configuration
  image {
    url = "cr.yandex/${var.registry_id}/${var.project_name}-auth:${var.image_tag}"
    digest = "" # Will be computed
    
    # Environment variables
    dynamic "environment" {
      for_each = var.environment_variables
      content {
        key   = environment.key
        value = environment.value
      }
    }
  }

  labels = merge(var.common_tags, {
    Name = var.container_name
    Type = "serverless-container"
    Service = "auth"
  })
}

# Container revision with specific configuration
resource "yandex_serverless_container_revision" "main" {
  container_id = yandex_serverless_container.main.id
  
  image {
    url = "cr.yandex/${var.registry_id}/${var.project_name}-auth:${var.image_tag}"
    
    # Environment variables for the revision
    dynamic "environment" {
      for_each = var.environment_variables
      content {
        key   = environment.key
        value = environment.value
      }
    }
  }

  resources {
    memory = var.memory
    cores  = var.cores
    core_fraction = var.core_fraction
  }

  execution_timeout = var.execution_timeout
  concurrency = var.concurrency
  service_account_id = var.service_account_id
  
  # Network connectivity for the revision
  connectivity {
    network_id = var.network_id
    subnet_ids = var.subnet_ids
  }
}

# Make container publicly accessible
resource "yandex_serverless_container_iam_binding" "public_access" {
  container_id = yandex_serverless_container.main.id
  role         = "serverless.containers.invoker"
  
  members = [
    "system:allUsers"
  ]
}