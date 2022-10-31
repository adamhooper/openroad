output "cf_distribution_id" {
  value       = module.terraform_aws_static_website.cf_distribution_id
  description = "CloudFront distribution ID"
}
