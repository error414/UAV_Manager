# DEV Readme

This readme is not Final and has a lot of Temporary notes.

###########################################################

# Notes

- Create User, Change PW should be done whit Djoser Endpoint.
  - Other mutations like first_name / last_name i was not able change via Djoser endpoint.
- All other User Related mutations are done whit django rest API.
- For Token managment i use simplejwt

###########################################################

# Installation

Paste all your installation commands below:

## Installation Backend

mkdir backend
cd backend

python -m venv .venv

.venv\Scripts\activate

python.exe -m pip install --upgrade pip

pip install django djangorestframework psycopg2-binary djoser djangorestframework-simplejwt

django-admin startproject config .

python manage.py runserver

pip install -r requirements.txt

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

docker-compose build --no-cache frontend

### Daten migrations

If DB should be deleted then migrate need to be run again.

python manage.py makemigrations #If new entries ar in models.py
python manage.py migrate #To migrate in to the DB

### DB Löschen

docker exec -it semesterarbeit_jonatan_carvalhais-db-1 psql -U uav_manager postgres

DROP DATABASE uav_manager_db;
CREATE DATABASE uav_manager_db;
\q

########################################################################
########################################################################

## Installation Frontend

npm create vite@latest frontend --template react

cd frontend
npm install

# Install Tailwind CSS

npm install tailwindcss @tailwindcss/vite
