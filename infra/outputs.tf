output "instance_public_ip" {
  description = "Public IP of the Tharseo AI instance"
  value       = oci_core_instance.tharseo_ai.public_ip
}

output "instance_id" {
  description = "OCID of the Tharseo AI instance"
  value       = oci_core_instance.tharseo_ai.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/Downloads/ssh-key-2026-03-09.key opc@${oci_core_instance.tharseo_ai.public_ip}"
}

output "tharseo_ai_url" {
  description = "Tharseo AI — public URL (HTTPS via nginx)"
  value       = "https://ai.tharseoit.com"
}

output "talent_ai_url" {
  # TODO: Migrate to https://talent.tharseoit.com once DNS is configured and SSL cert is provisioned.
  # Ensure the NSG allows TCP 443 ingress before switching.
  description = "Talent AI — temporary direct URL (move to talent.tharseoit.com + SSL when DNS is set)"
  value       = "http://${oci_core_instance.tharseo_ai.public_ip}:3001"
}
