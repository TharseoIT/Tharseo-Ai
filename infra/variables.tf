variable "tenancy_ocid" {
  description = "OCID of the OCI tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the OCI user"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the OCI API key"
  type        = string
}

variable "private_key_path" {
  description = "Path to the OCI API private key"
  type        = string
}

variable "region" {
  description = "OCI region"
  type        = string
  default     = "us-ashburn-1"
}

variable "compartment_ocid" {
  description = "OCID of the compartment to deploy resources into"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key for instance access"
  type        = string
  default     = "~/Downloads/ssh-key-2026-03-09.key.pub"
}

variable "instance_ocpus" {
  description = "Number of OCPUs for the Tharseo AI instance (free tier max 4 total across A1 instances)"
  type        = number
  default     = 3
}

variable "instance_memory_gb" {
  description = "Memory in GB for the Tharseo AI instance (free tier max 24GB total)"
  type        = number
  default     = 18
}

variable "project" {
  description = "Project name used for tagging"
  type        = string
  default     = "tharseo-ai"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}
