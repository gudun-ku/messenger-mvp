output "network_id" {
  description = "ID of the VPC network"
  value       = yandex_vpc_network.main.id
}

output "network_name" {
  description = "Name of the VPC network"
  value       = yandex_vpc_network.main.name
}

output "subnet_ids" {
  description = "Map of subnet IDs"
  value       = { for k, v in yandex_vpc_subnet.subnets : k => v.id }
}

output "subnet_cidrs" {
  description = "Map of subnet CIDR blocks"
  value       = { for k, v in yandex_vpc_subnet.subnets : k => v.v4_cidr_blocks[0] }
}

output "security_group_ids" {
  description = "Map of security group IDs"
  value = {
    database  = yandex_vpc_security_group.database.id
    redis     = yandex_vpc_security_group.redis.id
    container = yandex_vpc_security_group.container.id
  }
}

output "subnets_by_zone" {
  description = "Map of subnets organized by availability zone"
  value = {
    for k, v in yandex_vpc_subnet.subnets : v.zone => {
      id   = v.id
      name = v.name
      cidr = v.v4_cidr_blocks[0]
    }...
  }
}