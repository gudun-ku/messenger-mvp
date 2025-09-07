# PostgreSQL cluster
resource "yandex_mdb_postgresql_cluster" "main" {
  name                = var.cluster_name
  environment         = upper(var.environment)
  network_id          = var.network_id
  description         = "PostgreSQL cluster for ${var.project_name} ${var.environment}"
  deletion_protection = var.enable_deletion_protection
  security_group_ids  = [var.security_group_id]

  config {
    version = var.postgres_version
    
    resources {
      resource_preset_id = var.instance_class
      disk_type_id       = var.disk_type
      disk_size          = var.disk_size
    }

    # Enable access for serverless containers
    access {
      serverless = true
      web_sql    = var.environment != "prod"
    }

    backup_window_start {
      hours   = 3
      minutes = 30
    }
    
    backup_retain_period_days = var.backup_retention_days
    
    performance_diagnostics {
      enabled                      = var.environment == "prod"
      sessions_sampling_interval   = 60
      statements_sampling_interval = 600
    }
  }

  # Create hosts in available subnets
  dynamic "host" {
    for_each = var.subnet_ids
    content {
      zone      = host.key
      subnet_id = host.value
      priority  = host.key == "subnet-b" ? 0 : 100  # Primary in zone b
    }
  }

  labels = merge(var.common_tags, {
    Name = var.cluster_name
    Type = "postgresql-cluster"
    Service = "database"
  })
}

# Database user
resource "yandex_mdb_postgresql_user" "main" {
  cluster_id = yandex_mdb_postgresql_cluster.main.id
  name       = var.db_username
  password   = var.db_password
  
  # Grant privileges to create and manage databases
  grants = [var.database_name]
  
  # Connection settings
  conn_limit = 50
  
  # Security settings
  settings = {
    log_statement = "all"
  }
}

# Main application database
resource "yandex_mdb_postgresql_database" "main" {
  cluster_id = yandex_mdb_postgresql_cluster.main.id
  name       = var.database_name
  owner      = yandex_mdb_postgresql_user.main.name
  
  # Database configuration
  lc_collate = "C"
  lc_type    = "C"
  
  # Extensions
  extension {
    name = "uuid-ossp"
  }
  
  extension {
    name = "pgcrypto" 
  }
}