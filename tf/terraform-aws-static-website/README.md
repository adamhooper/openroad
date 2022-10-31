# AWS Static Website Terraform Module

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/infrable-io/terraform-aws-static-website/blob/master/LICENSE)
[![Maintained by Infrable](https://img.shields.io/badge/Maintained%20by-Infrable-000000)](https://infrable.io)

A Terraform module for creating static websites.

## Terraform Module Documentation

<!-- BEGIN_TF_DOCS -->
## Resources

| Name | Type |
|------|------|
| [aws_acm_certificate.certificate](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate) | resource |
| [aws_acm_certificate_validation.certificate_validation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation) | resource |
| [aws_cloudfront_distribution.distribution](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution) | resource |
| [aws_route53_record.certificate_validation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_route53_record.dns_record_root](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_route53_record.dns_record_www](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_s3_bucket.s3_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_s3_bucket.s3_root](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_region.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region) | data source |
| [aws_route53_zone.hosted_zone](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_domain_name"></a> [domain\_name](#input\_domain\_name) | The domain name of the website. This domain name must be purchased through Amazon Route 53. The domain name should be of the form: `domain.tld`. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cf_distribution_id"></a> [cf\_distribution\_id](#output\_cf\_distribution\_id) | The identifier for the CloudFront distribution |
| <a name="output_s3_root_id"></a> [s3\_root\_id](#output\_s3\_root\_id) | The name of the root S3 bucket |
<!-- END_TF_DOCS -->
