terraform {
  backend "s3" {
    bucket = "terraform-state.adamhooper.com"
    key    = "openroad.adamhooper.com/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

module "terraform_aws_static_website" {
  source           = "./terraform-aws-static-website"
  domain_name      = "openroad.adamhooper.com"
  domain_zone_name = "adamhooper.com"
}
