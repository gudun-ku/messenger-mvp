# Data sources for existing resources
data "yandex_client_config" "client" {}

# Container registry (assuming it exists)
data "yandex_container_registry" "main" {
  name = var.project_name
}

# Get current folder information
data "yandex_resourcemanager_folder" "current" {
  folder_id = data.yandex_client_config.client.folder_id
}

# Available zones in the region
data "yandex_compute_zones" "available" {
  region_id = var.region
}