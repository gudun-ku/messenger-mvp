variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "subnets" {
  description = "Map of subnet configurations"
  type = map(object({
    zone = string
    cidr = string
  }))
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}