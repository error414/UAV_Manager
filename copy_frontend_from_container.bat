docker cp uav_manager-frontend-1:/app/utils ./frontend
docker cp uav_manager-frontend-1:/app/components ./frontend
docker cp uav_manager-frontend-1:/app/hooks ./frontend
docker cp uav_manager-frontend-1:/app/pages ./frontend
docker cp uav_manager-frontend-1:/app/src ./frontend
docker cp uav_manager-frontend-1:/app/public ./frontend

docker cp uav_manager-frontend-1:/app/package.json ./frontend/package.json
docker cp uav_manager-frontend-1:/app/package-lock.json ./frontend/package-lock.json