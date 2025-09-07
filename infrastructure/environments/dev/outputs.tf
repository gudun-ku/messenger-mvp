# Development environment outputs

output "deployment_info" {
  description = "Development environment deployment information"
  value = module.infrastructure.deployment_info
}

output "container_url" {
  description = "Container URL for development environment"
  value = module.infrastructure.container_url
}

output "health_check_url" {
  description = "Health check URL for development environment"
  value = module.infrastructure.health_check_url
}

# Connection strings for local development
output "database_connection_string" {
  description = "Database connection string for local development"
  value = module.infrastructure.database_connection_string
  sensitive = true
}

output "redis_connection_string" {
  description = "Redis connection string for local development"
  value = module.infrastructure.redis_connection_string
  sensitive = true
}

# Infrastructure IDs for reference
output "infrastructure_ids" {
  description = "Infrastructure resource IDs"
  value = {
    network_id           = module.infrastructure.network_id
    database_cluster_id  = module.infrastructure.database_cluster_id
    redis_cluster_id     = module.infrastructure.redis_cluster_id
    container_id         = module.infrastructure.container_id
    service_account_id   = module.infrastructure.service_account_id
  }
}