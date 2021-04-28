#!/bin/bash
# This file should belong to root:root and have permissions set to 4705

git pull origin main
npm install
systemctl restart syncbox
echo "Deploy success!"
