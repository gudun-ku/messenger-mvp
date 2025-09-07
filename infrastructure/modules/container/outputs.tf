output "container_id" {
  description = "Serverless container ID"
  value       = yandex_serverless_container.main.id
}

output "container_name" {
  description = "Serverless container name"
  value       = yandex_serverless_container.main.name
}

output "container_url" {
  description = "Serverless container URL"
  value       = yandex_serverless_container.main.url
}

output "revision_id" {
  description = "Container revision ID"
  value       = yandex_serverless_container_revision.main.id
}

output "health_check_url" {
  description = "Container health check URL"
  value       = "${yandex_serverless_container.main.url}/health"
}