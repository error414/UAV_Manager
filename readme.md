# UAV Manager

**UAV Manager** is a modern full-stack web application for managing drones (UAVs), flight logs, maintenance records, and user profiles. The application is designed for drone pilots, clubs, and companies who want to efficiently manage their fleet and operations digitally.

## Features

- Manage any number of UAVs with technical details
- Record and analyze flight logs
- Maintenance records and automatic maintenance reminders
- CSV import/export for UAVs and flight logs
- User management (including admin panel)
- Modern, responsive user interface (React)
- Secure authentication (JWT, Djoser)
- REST API (Django REST Framework)

---

## Quick Start: Installation with Docker (recommended)

1. **Clone the repository**

   ```bash
   git clone https://git.ffhs.ch/web-technologien/fsdev/fs25/w4b-c-fs001.fsdev.zh-sa-1/main-projects/semesterarbeit_jonatan_carvalhais.git
   cd semesterarbeit_jonatan_carvalhais
   ```

2. **Build and start Docker containers**

   ```bash
   docker compose build
   docker compose up -d
   ```

3. **Open the frontend:**  
   [http://localhost:5175](http://localhost:5175)

> **Note:**  
> For use in a network (not localhost), you must adjust the `VITE_API_URL` environment variable.

---

## Manual Installation (optional)

### Backend (Django)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate  # Windows (.venv/bin/activate for Linux/Mac)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

---

## System Architecture

- **Backend:** Django, Django REST Framework, PostgreSQL, Djoser, SimpleJWT
- **Frontend:** React, Tailwind CSS, Vite, leaflet
- **API:** RESTful, JWT authentication

---

## Authentication

- Registration and password change via Djoser endpoints
- Login via JWT (SimpleJWT)
- User profiles and UAV data via REST API

---

## Import/Export

- UAVs and flight logs can be imported/exported as CSV
- Admins can centrally manage users and UAVs

---

## Additional Notes

- The application is prepared for production use but designed as a study project.
- For detailed information, see the project documentation in the `_docs` folder.

---

## License

This project was developed as part of the CAS Full Stack Developer program and is intended for educational purposes. It will likely be released under the MIT license in the future.
