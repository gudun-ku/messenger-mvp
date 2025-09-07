output "cluster_id" {
  description = "Redis cluster ID"
  value       = yandex_mdb_redis_cluster.main.id
}

output "cluster_name" {
  description = "Redis cluster name"
  value       = yandex_mdb_redis_cluster.main.name
}

output "cluster_hosts" {
  description = "Redis cluster hosts"
  value       = yandex_mdb_redis_cluster.main.host
}

output "connection_string" {
  description = "Redis connection string"
  value = format("redis://:%s@%s:6380",
    urlencode(var.redis_password),
    yandex_mdb_redis_cluster.main.host[0].fqdn
  )
  sensitive = true
}

output "host_fqdn" {
  description = "Redis host FQDN"
  value       = yandex_mdb_redis_cluster.main.host[0].fqdn
}

output "port" {
  description = "Redis port"
  value       = 6380
}