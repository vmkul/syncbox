#!/bin/bash

cd ~/syncbox || exit
git pull origin main
npm install
./restart_service.sh
echo "Deploy success!"
