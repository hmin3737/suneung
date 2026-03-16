#!/bin/bash
# LightSail 배포 스크립트
# 사용법: ./deploy.sh

set -e

echo "=== 수능 자료실 배포 시작 ==="

cd /home/ubuntu/suneung

echo "1. 코드 pull..."
git pull origin main

echo "2. 패키지 설치..."
npm ci --production=false

echo "3. 빌드..."
npm run build

echo "4. PM2 재시작..."
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "=== 배포 완료 ==="
pm2 status
