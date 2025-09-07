output "service_account_id" {
  description = "ID of the service account"
  value       = yandex_iam_service_account.container_sa.id
}

output "service_account_email" {
  description = "Email of the service account"
  value       = yandex_iam_service_account.container_sa.email
}

output "postgres_password" {
  description = "Generated PostgreSQL password"
  value       = random_password.postgres_password.result
  sensitive   = true
}

output "redis_password" {
  description = "Generated Redis password"
  value       = random_password.redis_password.result
  sensitive   = true
}

output "jwt_access_secret" {
  description = "Generated JWT access secret"
  value       = random_password.jwt_access_secret.result
  sensitive   = true
}

output "jwt_refresh_secret" {
  description = "Generated JWT refresh secret"
  value       = random_password.jwt_refresh_secret.result
  sensitive   = true
}

output "lockbox_secret_id" {
  description = "ID of the Lockbox secret"
  value       = yandex_lockbox_secret.app_secrets.id
}

output "secrets_for_container" {
  description = "Map of secrets for container environment variables"
  value = {
    postgres_password  = random_password.postgres_password.result
    redis_password     = random_password.redis_password.result
    jwt_access_secret  = random_password.jwt_access_secret.result
    jwt_refresh_secret = random_password.jwt_refresh_secret.result
  }
  sensitive = true
}