terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# --- NETWORKING ---

resource "oci_core_vcn" "tharseo_ai_vcn" {
  compartment_id = var.compartment_ocid
  cidr_block     = "10.1.0.0/16"
  display_name   = "tharseo-ai-vcn"
  dns_label      = "tharseoai"
  freeform_tags  = local.common_tags
}

resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.tharseo_ai_vcn.id
  display_name   = "tharseo-ai-igw"
  freeform_tags  = local.common_tags
}

resource "oci_core_route_table" "public_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.tharseo_ai_vcn.id
  display_name   = "tharseo-ai-public-rt"
  freeform_tags  = local.common_tags

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}

# Why NSG over Security List: NSGs attach to individual resources (fine-grained),
# Security Lists attach to entire subnets (broad). Best practice for per-resource control.
resource "oci_core_network_security_group" "tharseo_ai_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.tharseo_ai_vcn.id
  display_name   = "tharseo-ai-nsg"
  freeform_tags  = local.common_tags
}

# SSH access
resource "oci_core_network_security_group_security_rule" "ssh_ingress" {
  network_security_group_id = oci_core_network_security_group.tharseo_ai_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# HTTP — redirect to HTTPS and Talent AI access
resource "oci_core_network_security_group_security_rule" "http_ingress" {
  network_security_group_id = oci_core_network_security_group.tharseo_ai_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

# HTTPS — Tharseo AI (ai.tharseoit.com)
resource "oci_core_network_security_group_security_rule" "https_ingress" {
  network_security_group_id = oci_core_network_security_group.tharseo_ai_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}


# Allow all egress (outbound) — needed for package installs, Groq API calls
resource "oci_core_network_security_group_security_rule" "egress_all" {
  network_security_group_id = oci_core_network_security_group.tharseo_ai_nsg.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

resource "oci_core_subnet" "public_subnet" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.tharseo_ai_vcn.id
  cidr_block        = "10.1.0.0/24"
  display_name      = "tharseo-ai-public-subnet"
  dns_label         = "public"
  route_table_id    = oci_core_route_table.public_rt.id
  freeform_tags     = local.common_tags
}

# --- COMPUTE ---

# Look up the latest Oracle Linux 8 image for ARM (aarch64)
# Using a data source so we never hardcode an image OCID
data "oci_core_images" "oracle_linux_8_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "tharseo_ai" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "tharseo-ai-server"
  shape               = "VM.Standard.A1.Flex"
  freeform_tags       = local.common_tags

  # Why Flex shape: lets you specify exact OCPU + memory instead of fixed combos
  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux_8_arm.images[0].id
  }

  create_vnic_details {
    subnet_id                 = oci_core_subnet.public_subnet.id
    assign_public_ip          = true
    nsg_ids                   = [oci_core_network_security_group.tharseo_ai_nsg.id]
    display_name              = "tharseo-ai-vnic"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    # cloud-init script runs on first boot — installs Python, git, sets up environment
    user_data = base64encode(file("${path.module}/cloud-init.sh"))
  }
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}
