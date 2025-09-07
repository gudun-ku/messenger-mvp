variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "container_name" {
  description = "Name of the container"
  type        = string
}

variable "registry_id" {
  description = "Container registry ID"
  type        = string
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "network_id" {
  description = "VPC network ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for container placement"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for container"
  type        = string
}

variable "service_account_id" {
  description = "Service account ID for container execution"
  type        = string
}

variable "memory" {
  description = "Container memory in MB"
  type        = number
  default     = 512
}

variable "cores" {
  description = "Container CPU cores"
  type        = number
  default     = 1
}

variable "core_fraction" {
  description = "Container CPU core fraction"
  type        = number
  default     = 100
}

variable "execution_timeout" {
  description = "Container execution timeout"
  type        = string
  default     = "30s"
}

variable "concurrency" {
  description = "Number of concurrent container instances"
  type        = number
  default     = 1
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}