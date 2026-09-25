output "ip_address" {
  value = digitalocean_droplet.mission_llm_instance.ipv4_address
  description = "The public IP address of your droplet application."
}