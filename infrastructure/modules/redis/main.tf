# Redis cluster
resource "yandex_mdb_redis_cluster" "main" {
  name        = var.cluster_name
  environment = upper(var.environment)
  network_id  = var.network_id
  description = "Redis cluster for ${var.project_name} ${var.environment}"
  security_group_ids = [var.security_group_id]

  config {
    version  = var.redis_version
    password = var.redis_password
    
    resources {
      resource_preset_id = var.instance_class
      disk_type_id       = "network-ssd"
      disk_size          = var.disk_size
    }

    # Redis configuration
    redis_config = {
      maxmemory_policy       = "noeviction"
      databases              = 16
      notify_keyspace_events = ""
      timeout                = 0
      slowlog_log_slower_than = 10000
      slowlog_max_len        = 1000
    }

    backup_window_start {
      hours   = 4
      minutes = 0
    }
    
    backup_retain_period_days = var.backup_retention_days
  }

  # Create host in primary zone
  host {
    zone      = "ru-central1-b"
    subnet_id = var.subnet_ids["subnet-b"]
  }

  labels = merge(var.common_tags, {
    Name = var.cluster_name
    Type = "redis-cluster"
    Service = "cache"
  })
}

# Wait for Redis cluster to be ready
resource "time_sleep" "redis_ready" {
  depends_on = [yandex_mdb_redis_cluster.main]
  create_duration = "60s"
}