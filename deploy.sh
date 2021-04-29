#!/bin/bash

# Add following lines using visudo to grant deployer access to app service
# Cmnd_Alias SERVICE_CMNDS = /bin/systemctl start syncbox, /bin/systemctl stop syncbox, /bin/systemctl restart syncbox
# deployer ALL=(ALL) NOPASSWD: SERVICE_CMNDS

git pull origin main
npm install
sudo systemctl restart syncbox
echo "Deploy success!"

