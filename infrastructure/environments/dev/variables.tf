# Variables for development environment

# Project configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "messenger-mvp"
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

# Network configuration for development
variable "subnets" {
  description = "Map of subnet configurations"
  type = map(object({
    zone = string
    cidr = string
  }))
  default = {
    "subnet-a" = {
      zone = "ru-central1-a"
      cidr = "10.0.1.0/28"  # Small subnet for dev
    }
    "subnet-b" = {
      zone = "ru-central1-b"
      cidr = "10.0.2.0/24"  # Main subnet
    }
  }
}

# Database configuration (smaller for development)
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "14"
}

variable "postgres_instance_class" {
  description = "PostgreSQL instance class"
  type        = string
  default     = "s2.micro"  # Smallest instance for dev
}

variable "postgres_disk_size" {
  description = "PostgreSQL disk size in GB"
  type        = number
  default     = 20  # Minimum size for dev
}

variable "postgres_disk_type" {
  description = "PostgreSQL disk type"
  type        = string
  default     = "network-ssd"
}

variable "database_name" {
  description = "Main database name"
  type        = string
  default     = "messenger_dev"  # Different DB name for dev
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "messenger_user"
}

# Redis configuration (smaller for development)
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "8.1-valkey"
}

variable "redis_instance_class" {
  description = "Redis instance class"
  type        = string
  default     = "hm1.nano"  # Smallest instance for dev
}

variable "redis_disk_size" {
  description = "Redis disk size in GB"
  type        = number
  default     = 16  # Minimum size
}

# Container configuration
variable "container_image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "container_memory" {
  description = "Container memory in MB"
  type        = number
  default     = 256  # Smaller for dev
}

variable "container_cores" {
  description = "Container CPU cores"
  type        = number
  default     = 1
}

# Application secrets (provided via environment variables)
variable "app_secrets" {
  description = "Application secrets"
  type = map(string)
  default = {
    GOOGLE_CLIENT_ID     = ""  # Will be set via TF_VAR_app_secrets
    GOOGLE_CLIENT_SECRET = ""  # Will be set via TF_VAR_app_secrets
  }
  sensitive = true
}

# Common tags for development
variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "messenger-mvp"
    Environment = "dev"
    ManagedBy   = "terraform"
    CostCenter  = "development"
  }
}