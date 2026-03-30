#!/bin/bash
# Cloud-init script for Tharseo AI instance
# Runs automatically on first boot — no manual SSH setup needed
# Why cloud-init: reproducible, automated, follows infra-as-code principles

set -e

# System updates
dnf update -y
dnf install -y git python3.11 python3.11-pip python3.11-devel gcc

# Node.js 20 for React frontend
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Create tharseo user to run the app
useradd -m -s /bin/bash tharseo

# Python venv for backend
sudo -u tharseo python3.11 -m venv /home/tharseo/venv

# Clone the repo
sudo -u tharseo git clone https://github.com/TharseoIT/Tharseo-Ai.git /home/tharseo/Tharseo-Ai

echo "Cloud-init complete. Tharseo AI instance is ready."
