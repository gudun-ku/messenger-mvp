# Outputs for staging environment

output "database_connection" {
  description = "Database connection details"
  value = {
    host     = module.infrastructure.database_connection.host
    port     = module.infrastructure.database_connection.port
    database = module.infrastructure.database_connection.database
    username = module.infrastructure.database_connection.username
  }
}

output "database_password" {
  description = "Database password"
  value     = module.infrastructure.database_password
  sensitive = true
}

output "redis_connection" {
  description = "Redis connection details"
  value = {
    host = module.infrastructure.redis_connection.host
    port = module.infrastructure.redis_connection.port
  }
}

output "redis_password" {
  description = "Redis password"
  value     = module.infrastructure.redis_password
  sensitive = true
}

output "container_url" {
  description = "Container URL"
  value = module.infrastructure.container_url
}

output "network_info" {
  description = "Network information"
  value = module.infrastructure.network_info
}

output "environment_info" {
  description = "Environment information"
  value = {
    environment = "staging"
    project     = module.infrastructure.environment_info.project
    region      = module.infrastructure.environment_info.region
    zone        = module.infrastructure.environment_info.zone
  }
}