variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "Name of the Redis cluster"
  type        = string
}

variable "network_id" {
  description = "VPC network ID"
  type        = string
}

variable "subnet_ids" {
  description = "Map of subnet IDs"
  type        = map(string)
}

variable "security_group_id" {
  description = "Security group ID for Redis"
  type        = string
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "8.1-valkey"
}

variable "instance_class" {
  description = "Redis instance class"
  type        = string
  default     = "hm1.nano"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 16
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}