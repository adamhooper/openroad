# -----------------------------------------------------------------------------
# DEPLOY A STATIC WEBSITE ON AWS.
# This Terraform module deploys the resources necessary to host a static
# website on AWS. It includes the following:
#   * Access logging via Amazon S3
#   * TLS encryption via AWS Certificate Manager
#   * Content delivery via Amazon CloudFront
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REQUIRE A SPECIFIC TERRAFORM VERSION OR HIGHER
# This module has been updated with 0.12 syntax, which means it is no longer
# compatible with any versions below 0.12.
# -----------------------------------------------------------------------------
terraform {
  required_version = ">= 0.12"
}

locals {
  # Example: static-website.com → static-website-com
  project_id = lower(replace(var.domain_name, ".", "-"))
}

data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# S3 BUCKET (LOGGING)
# This S3 bucket will contain the access logs for the website.
# NOTE: The bucket name is generated using the `project_id` variable.
# The bucket name must contain only lowercase letters, numbers, periods (.),
# and dashes (-) (i.e. it must be a valid DNS name).
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "s3_logs" {
  bucket = "${local.project_id}-logs"
}

resource "aws_s3_bucket_acl" "s3_logs" {
  bucket = aws_s3_bucket.s3_logs.id
  acl    = "log-delivery-write"
}

# -----------------------------------------------------------------------------
# S3 BUCKET (ROOT)
# This S3 bucket will contain the static content for the website.
# NOTE: The bucket name is generated using the `domain_name` variable.
# The bucket name must contain only lowercase letters, numbers, periods (.),
# and dashes (-) (i.e. it must be a valid DNS name).
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "s3_root" {
  bucket = var.domain_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_ownership_controls" "s3_root" {
  bucket = aws_s3_bucket.s3_root.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_policy" "s3_root" {
  bucket = aws_s3_bucket.s3_root.id
  policy = data.aws_iam_policy_document.s3_root_public_read.json
}

data "aws_iam_policy_document" "s3_root_public_read" {
  statement {
    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${aws_s3_bucket.s3_root.arn}/*"
    ]
  }

  statement {
    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetBucketLocation",
    ]

    resources = [
      aws_s3_bucket.s3_root.arn,
    ]
  }
}

resource "aws_s3_bucket_website_configuration" "s3_root" {
  bucket = aws_s3_bucket.s3_root.bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_logging" "s3_root" {
  bucket = aws_s3_bucket.s3_root.id

  target_bucket = aws_s3_bucket.s3_logs.id
  target_prefix = "s3/"
}

# -----------------------------------------------------------------------------
# ACM CERTIFICATE
# TLS certificate provisioned by AWS Certificate Manager.
# This certificate applies to both the root domain (<domain>.<tld>) and the www
# subdomain (www.<domain>.<tld>).
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "certificate" {
  domain_name       = var.domain_name
  validation_method = "DNS"
}

# -----------------------------------------------------------------------------
# RETRIEVE THE HOSTED ZONE ID FOR THE DOMAIN NAME
# -----------------------------------------------------------------------------
data "aws_route53_zone" "hosted_zone" {
  name         = var.domain_zone_name
  private_zone = false
}

# -----------------------------------------------------------------------------
# ACM CERTIFICATE VALIDATION
# Validates the ACM certificate for the root domain and www subdomain via DNS.
# -----------------------------------------------------------------------------
resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for dvo in aws_acm_certificate.certificate.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      record  = dvo.resource_record_value
      type    = dvo.resource_record_type
      zone_id = data.aws_route53_zone.hosted_zone.id
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = each.value.zone_id
}

resource "aws_acm_certificate_validation" "certificate_validation" {
  certificate_arn         = aws_acm_certificate.certificate.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

# -----------------------------------------------------------------------------
# CLOUDFRONT DISTRIBUTION
# Creates a distributed content delivery network using Amazon CloudFront.
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "distribution" {
  aliases             = [var.domain_name]
  default_root_object = "index.html"
  enabled             = true
  http_version        = "http2"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"

  custom_error_response {
    error_caching_min_ttl = 60
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
  }

  default_cache_behavior {
    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]
    forwarded_values {
      cookies {
        forward = "none"
      }
      query_string = true
    }
    target_origin_id       = local.project_id
    viewer_protocol_policy = "redirect-to-https"
  }

  logging_config {
    bucket = aws_s3_bucket.s3_logs.bucket_domain_name
    prefix = "cdn/"
  }

  origin {
    domain_name = aws_s3_bucket_website_configuration.s3_root.website_endpoint
    origin_id   = local.project_id

    custom_origin_config {
      http_port  = 80
      https_port = 443
      # Note: Amazon S3 does not support HTTPS connections when configured as a
      # website endpoint. You must specify HTTP Only as the Origin Protocol
      # Policy.
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.certificate.arn
    minimum_protocol_version = "TLSv1.2_2018"
    ssl_support_method       = "sni-only"
  }
}

# -----------------------------------------------------------------------------
# DNS RECORD (ROOT)
# Creates an A record mapping the root domain name to the Amazon CloudFront
# distribution.
# -----------------------------------------------------------------------------
resource "aws_route53_record" "dns_record" {
  name    = var.domain_name
  type    = "A"
  zone_id = data.aws_route53_zone.hosted_zone.id

  alias {
    name = aws_cloudfront_distribution.distribution.domain_name
    # The hosted zone ID when creating an alias record that routes traffic to a
    # CloudFront distribution will always be Z2FDTNDATAQYW2.
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}
