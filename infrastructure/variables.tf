# Global Variables
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "messenger-mvp"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "Yandex Cloud region"
  type        = string
  default     = "ru-central1"
}

variable "default_zone" {
  description = "Default availability zone"
  type        = string
  default     = "ru-central1-b"
}

variable "zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ru-central1-a", "ru-central1-b"]
}

# Network Configuration
variable "network_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnets" {
  description = "Map of subnet configurations"
  type = map(object({
    zone = string
    cidr = string
  }))
  default = {
    subnet-a = {
      zone = "ru-central1-a"
      cidr = "10.0.1.0/24"
    }
    subnet-b = {
      zone = "ru-central1-b" 
      cidr = "10.0.2.0/24"
    }
  }
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "14"
}

variable "postgres_instance_class" {
  description = "PostgreSQL instance class"
  type        = string
  default     = "s2.micro"
}

variable "postgres_disk_size" {
  description = "PostgreSQL disk size in GB"
  type        = number
  default     = 20
}

variable "postgres_disk_type" {
  description = "PostgreSQL disk type"
  type        = string
  default     = "network-ssd"
}

variable "database_name" {
  description = "Main database name"
  type        = string
  default     = "messenger_prod"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "messenger_user"
}

# Redis Configuration
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "8.1-valkey"
}

variable "redis_instance_class" {
  description = "Redis instance class"
  type        = string
  default     = "hm1.nano"
}

variable "redis_disk_size" {
  description = "Redis disk size in GB"
  type        = number
  default     = 16
}

# Container Configuration
variable "container_image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "container_memory" {
  description = "Container memory in MB"
  type        = number
  default     = 512
}

variable "container_cores" {
  description = "Container CPU cores"
  type        = number
  default     = 1
}

# Application Configuration
variable "app_secrets" {
  description = "Application secrets"
  type = map(string)
  default = {}
  sensitive = true
}

# Feature Flags
variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

# Tags
variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project    = "messenger-mvp"
    ManagedBy  = "terraform"
    Repository = "messenger-mvp"
  }
}