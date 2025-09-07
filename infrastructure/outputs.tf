# Main outputs for the infrastructure

# Network outputs
output "network_id" {
  description = "VPC network ID"
  value       = module.network.network_id
}

output "subnet_ids" {
  description = "Map of subnet IDs"
  value       = module.network.subnet_ids
}

output "security_group_ids" {
  description = "Map of security group IDs"
  value       = module.network.security_group_ids
}

# Database outputs
output "database_cluster_id" {
  description = "PostgreSQL cluster ID"
  value       = module.database.cluster_id
}

output "database_host" {
  description = "PostgreSQL host FQDN"
  value       = module.database.host_fqdn
}

output "database_name" {
  description = "Database name"
  value       = module.database.database_name
}

output "database_username" {
  description = "Database username"
  value       = module.database.username
}

# Redis outputs
output "redis_cluster_id" {
  description = "Redis cluster ID"
  value       = module.redis.cluster_id
}

output "redis_host" {
  description = "Redis host FQDN"
  value       = module.redis.host_fqdn
}

# Container outputs
output "container_id" {
  description = "Serverless container ID"
  value       = module.container.container_id
}

output "container_url" {
  description = "Serverless container URL"
  value       = module.container.container_url
}

output "health_check_url" {
  description = "Container health check URL"
  value       = module.container.health_check_url
}

# Security outputs
output "service_account_id" {
  description = "Service account ID"
  value       = module.security.service_account_id
}

output "lockbox_secret_id" {
  description = "Lockbox secret ID"
  value       = module.security.lockbox_secret_id
}

# Connection strings (for GitHub secrets)
output "database_connection_string" {
  description = "Database connection string for GitHub secrets"
  value       = module.database.connection_string
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string for GitHub secrets"
  value       = module.redis.connection_string
  sensitive   = true
}

# Deployment information
output "deployment_info" {
  description = "Deployment information"
  value = {
    environment        = var.environment
    project_name       = var.project_name
    region            = var.region
    zones             = var.zones
    container_url     = module.container.container_url
    health_check_url  = module.container.health_check_url
    database_host     = module.database.host_fqdn
    redis_host        = module.redis.host_fqdn
  }
}