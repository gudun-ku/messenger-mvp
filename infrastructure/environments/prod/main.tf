# Production environment configuration

terraform {
  required_version = ">= 1.6"
  
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.104"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }
  
  # Remote state backend
  backend "s3" {
    endpoint   = "https://storage.yandexcloud.net"
    bucket     = "messenger-terraform-state"
    region     = "ru-central1"
    key        = "prod/terraform.tfstate"
    
    skip_region_validation      = true
    skip_credentials_validation = true
  }
}

# Configure Yandex Cloud provider
provider "yandex" {
  zone = var.default_zone
}

# Use the main infrastructure module
module "infrastructure" {
  source = "../.."
  
  # Environment configuration
  project_name = var.project_name
  environment  = "prod"
  region       = var.region
  default_zone = var.default_zone
  zones        = var.zones
  
  # Network configuration
  subnets = var.subnets
  
  # Database configuration
  postgres_version       = var.postgres_version
  postgres_instance_class = var.postgres_instance_class
  postgres_disk_size     = var.postgres_disk_size
  postgres_disk_type     = var.postgres_disk_type
  database_name          = var.database_name
  db_username            = var.db_username
  
  # Redis configuration
  redis_version       = var.redis_version
  redis_instance_class = var.redis_instance_class
  redis_disk_size     = var.redis_disk_size
  
  # Container configuration
  container_image_tag = var.container_image_tag
  container_memory    = var.container_memory
  container_cores     = var.container_cores
  
  # Application secrets (will be provided via environment variables)
  app_secrets = var.app_secrets
  
  # Feature flags (production settings)
  enable_deletion_protection = true
  backup_retention_days     = 30
  enable_monitoring         = true
  
  # Common tags
  common_tags = var.common_tags
}