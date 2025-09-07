# VPC Network
resource "yandex_vpc_network" "main" {
  name        = var.network_name
  description = "VPC network for ${var.project_name} ${var.environment} environment"
  
  labels = merge(var.common_tags, {
    Name = var.network_name
    Type = "network"
  })
}

# Subnets
resource "yandex_vpc_subnet" "subnets" {
  for_each = var.subnets
  
  name           = "${var.project_name}-${var.environment}-${each.key}"
  description    = "Subnet ${each.key} in zone ${each.value.zone} for ${var.environment}"
  network_id     = yandex_vpc_network.main.id
  zone           = each.value.zone
  v4_cidr_blocks = [each.value.cidr]
  
  labels = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}"
    Zone = each.value.zone
    Type = "subnet"
  })
}

# Security Groups

# Database Security Group
resource "yandex_vpc_security_group" "database" {
  name        = "${var.project_name}-${var.environment}-db-sg"
  description = "Security group for database services in ${var.environment}"
  network_id  = yandex_vpc_network.main.id

  # PostgreSQL access from container subnets
  dynamic "ingress" {
    for_each = var.subnets
    content {
      description    = "PostgreSQL from ${ingress.key}"
      protocol       = "TCP"
      port           = 6432
      v4_cidr_blocks = [ingress.value.cidr]
    }
  }

  # Internal communication
  ingress {
    description       = "Internal communication"
    protocol          = "ANY"
    from_port         = 0
    to_port           = 65535
    predefined_target = "self_security_group"
  }

  # Outbound internet access
  egress {
    description    = "Internet access"
    protocol       = "ANY"
    from_port      = 0
    to_port        = 65535
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  labels = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db-sg"
    Type = "security-group"
    Service = "database"
  })
}

# Redis Security Group
resource "yandex_vpc_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for Redis services in ${var.environment}"
  network_id  = yandex_vpc_network.main.id

  # Redis access from container subnets
  dynamic "ingress" {
    for_each = var.subnets
    content {
      description    = "Redis from ${ingress.key}"
      protocol       = "TCP"
      port           = 6380
      v4_cidr_blocks = [ingress.value.cidr]
    }
  }

  # Internal communication
  ingress {
    description       = "Internal communication"
    protocol          = "ANY"
    from_port         = 0
    to_port           = 65535
    predefined_target = "self_security_group"
  }

  # Outbound internet access
  egress {
    description    = "Internet access"
    protocol       = "ANY"
    from_port      = 0
    to_port        = 65535
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  labels = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-redis-sg"
    Type = "security-group"
    Service = "redis"
  })
}

# Container Security Group
resource "yandex_vpc_security_group" "container" {
  name        = "${var.project_name}-${var.environment}-container-sg"
  description = "Security group for serverless containers in ${var.environment}"
  network_id  = yandex_vpc_network.main.id

  # HTTP/HTTPS inbound
  ingress {
    description    = "HTTP"
    protocol       = "TCP"
    port           = 8080
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "HTTPS"
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  # Internal communication
  ingress {
    description       = "Internal communication"
    protocol          = "ANY"
    from_port         = 0
    to_port           = 65535
    predefined_target = "self_security_group"
  }

  # Outbound internet access
  egress {
    description    = "Internet access"
    protocol       = "ANY"
    from_port      = 0
    to_port        = 65535
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  labels = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-container-sg"
    Type = "security-group"
    Service = "container"
  })
}