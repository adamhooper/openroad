# -----------------------------------------------------------------------------
# REQUIRED VARIABLES
# -----------------------------------------------------------------------------
variable "domain_name" {
  type        = string
  description = <<-EOF
  The domain name of the website. This domain name must be purchased through
  Amazon Route 53. The domain name should be of the form: `domain.tld`.
  EOF
}

variable "domain_zone_name" {
  type        = string
  description = <<-EOF
  The name of the Amazon Route 53 Zone that contains the domain.
  EOF
}

variable "redirect_domain_name" {
  type        = string
  default     = ""
  description = <<-EOF
  The domain name of the website to redirect to.

  See the following for more information:
    * https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-page-redirect.html#redirect-endpoint-host
  EOF
}
