output "cluster_id" {
  description = "PostgreSQL cluster ID"
  value       = yandex_mdb_postgresql_cluster.main.id
}

output "cluster_name" {
  description = "PostgreSQL cluster name"
  value       = yandex_mdb_postgresql_cluster.main.name
}

output "cluster_hosts" {
  description = "PostgreSQL cluster hosts"
  value       = yandex_mdb_postgresql_cluster.main.host
}

output "database_name" {
  description = "Database name"
  value       = yandex_mdb_postgresql_database.main.name
}

output "username" {
  description = "Database username"
  value       = yandex_mdb_postgresql_user.main.name
}

output "connection_string" {
  description = "Database connection string"
  value = format("postgresql://%s:%s@%s:6432/%s",
    var.db_username,
    urlencode(var.db_password),
    yandex_mdb_postgresql_cluster.main.host[0].fqdn,
    var.database_name
  )
  sensitive = true
}

output "host_fqdn" {
  description = "Primary host FQDN"
  value       = yandex_mdb_postgresql_cluster.main.host[0].fqdn
}

output "port" {
  description = "PostgreSQL port (pooler)"
  value       = 6432
}