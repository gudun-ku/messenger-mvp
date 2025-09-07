# Main Terraform configuration for Messenger MVP

# Network module - VPC, subnets, security groups
module "network" {
  source = "./modules/network"
  
  project_name = var.project_name
  environment  = var.environment
  network_name = local.network_name
  subnets      = var.subnets
  common_tags  = local.common_tags
}

# Security module - Service accounts, IAM, secrets
module "security" {
  source = "./modules/security"
  
  project_name         = var.project_name
  environment          = var.environment
  service_account_name = local.service_account_name
  folder_id            = data.yandex_resourcemanager_folder.current.id
  common_tags          = local.common_tags
}

# Database module - PostgreSQL cluster
module "database" {
  source     = "./modules/database"
  depends_on = [module.network, module.security]
  
  project_name              = var.project_name
  environment               = var.environment
  cluster_name              = local.postgres_cluster_name
  network_id                = module.network.network_id
  subnet_ids                = module.network.subnet_ids
  security_group_id         = module.network.security_group_ids.database
  postgres_version          = var.postgres_version
  instance_class            = var.postgres_instance_class
  disk_size                 = var.postgres_disk_size
  disk_type                 = var.postgres_disk_type
  database_name             = var.database_name
  db_username               = var.db_username
  db_password               = module.security.postgres_password
  backup_retention_days     = var.backup_retention_days
  enable_deletion_protection = var.enable_deletion_protection
  common_tags               = local.common_tags
}

# Redis module - Redis cluster
module "redis" {
  source     = "./modules/redis"
  depends_on = [module.network, module.security]
  
  project_name          = var.project_name
  environment           = var.environment
  cluster_name          = local.redis_cluster_name
  network_id            = module.network.network_id
  subnet_ids            = module.network.subnet_ids
  security_group_id     = module.network.security_group_ids.redis
  redis_version         = var.redis_version
  instance_class        = var.redis_instance_class
  disk_size             = var.redis_disk_size
  redis_password        = module.security.redis_password
  backup_retention_days = var.backup_retention_days
  common_tags           = local.common_tags
}

# Container module - Serverless container
module "container" {
  source     = "./modules/container"
  depends_on = [module.network, module.security, module.database, module.redis]
  
  project_name       = var.project_name
  environment        = var.environment
  container_name     = local.container_name
  registry_id        = local.registry_id
  image_tag          = var.container_image_tag
  network_id         = module.network.network_id
  subnet_ids         = values(module.network.subnet_ids)
  security_group_id  = module.network.security_group_ids.container
  service_account_id = module.security.service_account_id
  memory             = var.container_memory
  cores              = var.container_cores
  common_tags        = local.common_tags
  
  # Environment variables for the container
  environment_variables = merge({
    NODE_ENV   = "production"
    AUTH_PORT  = "8080"
    LOG_LEVEL  = var.environment == "dev" ? "debug" : "info"
    
    # Database connection
    DATABASE_URL = module.database.connection_string
    
    # Redis connection  
    REDIS_URL = module.redis.connection_string
    
    # JWT secrets
    JWT_ACCESS_SECRET  = module.security.jwt_access_secret
    JWT_REFRESH_SECRET = module.security.jwt_refresh_secret
    
  }, var.app_secrets)
}

# Store secrets in Lockbox for reference
resource "yandex_lockbox_secret_version" "app_secrets" {
  secret_id = module.security.lockbox_secret_id
  
  entries {
    key        = "DATABASE_URL"
    text_value = module.database.connection_string
  }
  
  entries {
    key        = "REDIS_URL"
    text_value = module.redis.connection_string
  }
  
  entries {
    key        = "JWT_ACCESS_SECRET"
    text_value = module.security.jwt_access_secret
  }
  
  entries {
    key        = "JWT_REFRESH_SECRET"
    text_value = module.security.jwt_refresh_secret
  }
  
  entries {
    key        = "POSTGRES_PASSWORD"
    text_value = module.security.postgres_password
  }
  
  entries {
    key        = "REDIS_PASSWORD"
    text_value = module.security.redis_password
  }
}