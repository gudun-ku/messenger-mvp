# Local values and computed configurations
locals {
  # Environment-specific naming
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Common tags merged with environment-specific tags
  common_tags = merge(var.common_tags, {
    Environment = var.environment
    Region      = var.region
    Timestamp   = timestamp()
  })
  
  # Network configuration
  availability_zones = var.zones
  
  # Database configuration
  postgres_cluster_name = "${local.name_prefix}-db"
  redis_cluster_name    = "${local.name_prefix}-redis"
  
  # Container configuration
  container_name = "${local.name_prefix}-auth"
  registry_id    = data.yandex_container_registry.main.id
  
  # Service account configuration
  service_account_name = "${local.name_prefix}-sa"
  
  # Network names
  network_name = "${local.name_prefix}-network"
  
  # Security group names
  db_security_group_name        = "${local.name_prefix}-db-sg"
  redis_security_group_name     = "${local.name_prefix}-redis-sg"
  container_security_group_name = "${local.name_prefix}-container-sg"
}