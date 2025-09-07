# Variables for staging environment

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "region" {
  description = "Yandex Cloud region"
  type        = string
}

variable "default_zone" {
  description = "Default availability zone"
  type        = string
}

variable "zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "subnets" {
  description = "Subnets configuration"
  type = map(object({
    zone = string
    cidr = string
  }))
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
}

variable "postgres_instance_class" {
  description = "PostgreSQL instance class"
  type        = string
}

variable "postgres_disk_size" {
  description = "PostgreSQL disk size in GB"
  type        = number
}

variable "postgres_disk_type" {
  description = "PostgreSQL disk type"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
}

variable "redis_version" {
  description = "Redis version"
  type        = string
}

variable "redis_instance_class" {
  description = "Redis instance class"
  type        = string
}

variable "redis_disk_size" {
  description = "Redis disk size in GB"
  type        = number
}

variable "container_image_tag" {
  description = "Container image tag"
  type        = string
}

variable "container_memory" {
  description = "Container memory in MB"
  type        = number
}

variable "container_cores" {
  description = "Container CPU cores"
  type        = number
}

variable "app_secrets" {
  description = "Application secrets as JSON string"
  type        = map(string)
  sensitive   = true
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}