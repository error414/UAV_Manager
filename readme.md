# Installation

Paste all your installation commands below:

## Installation Backend

mkdir backend
cd backend

python -m venv .venv

.venv\Scripts\activate

python.exe -m pip install --upgrade pip

pip install django djangorestframework psycopg2-binary

django-admin startproject config .

## Create an PostgreSQL Container

####

services:
db:
image: postgres:17.4-bookworm
restart: always
environment:
POSTGRES_USER: uav_manager
POSTGRES_PASSWORD: DVgt8pf4
POSTGRES_DB: uav_manager_db
ports: - "5432:5432"
volumes: - postgres_data:/var/lib/postgresql/data

volumes:
postgres_data:

#####

docker-compose up -d

### Daten migrations

### DB Löschen
docker exec -it uav_manager_poc-db-1 psql -U uav_manager postgres
