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

output "backend_url" {
  description = "URL for the FastAPI backend"
  value       = "http://${oci_core_instance.tharseo_ai.public_ip}:8000"
}

output "frontend_url" {
  description = "URL for the React frontend"
  value       = "http://${oci_core_instance.tharseo_ai.public_ip}:3000"
}
