# -----------------------------------------------------------------------------
# OUTPUTS
# -----------------------------------------------------------------------------
output "cf_distribution_id" {
  value       = aws_cloudfront_distribution.distribution.id
  description = "The identifier for the CloudFront distribution"
}
