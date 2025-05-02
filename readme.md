# UAV Manager

**UAV Manager** is a modern full-stack web application for managing drones (UAVs), flight logs, maintenance records, and user profiles. The application is designed for drone pilots, clubs, and companies who want to efficiently manage their fleet and operations digitally.

## Features

- **Drone (UAV) Management**: Maintain any number of UAVs with full technical specifications and custom attributes.
- **Flight Logbook**: Record detailed flight entries, filter and search by date, UAV, conditions, and pilot type.
- **Maintenance Tracking**: Log maintenance events, attach files, and set up automated reminders.
- **GPS Telemetry**: Upload GPS track data for a visual flight path on interactive maps.
- **Import/Export**: CSV import/export for UAVs and flight logs; full user data backup and restore via ZIP.
- **User & Admin Panels**: Secure JWT-based authentication, user self-service settings, and admin oversight of all data.
- **Responsive UI**: Built with React, Tailwind CSS, and Leaflet for map integration.
- **REST API**: Django REST Framework with JWT via SimpleJWT and Djoser.

---

## Prerequisites

- Docker & Docker Compose (for containerized deployment)
- Node.js & npm (for local frontend)
- Python 3.13.1 & pip (for local backend)
- PostgreSQL

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

## Tech Stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Frontend         | React, Vite, Tailwind CSS, react-leaflet                 |
| Backend          | Python, Django, Django REST Framework, Djoser, SimpleJWT |
| Database         | PostgreSQL                                               |
| Queue/Cron       | django-crontab                                           |
| Authentication   | JWT (SimpleJWT)                                          |
| Containerization | Docker, Docker Compose                                   |
| Testing          | Jest (React), Pytest (Django)                            |

---

## API Documentation

The REST API is versioned under `/api/`. Key endpoints:

| Resource                  | Endpoint                      | Methods                 |
| ------------------------- | ----------------------------- | ----------------------- |
| **UAVs**                  | `/api/uavs/`                  | `GET`, `POST`           |
| **UAV Detail**            | `/api/uavs/{id}/`             | `GET`, `PUT`, `DELETE`  |
| **Flight Logs**           | `/api/flightlogs/`            | `GET`, `POST`           |
| **Flight Log GPS**        | `/api/flightlogs/{id}/gps/`   | `GET`, `POST`, `DELETE` |
| **Maintenance Logs**      | `/api/maintenance/`           | `GET`, `POST`           |
| **Maintenance Reminders** | `/api/maintenance-reminders/` | `GET`, `POST`           |
| **File Uploads**          | `/api/files/`                 | `GET`, `POST`           |
| **User Profile**          | `/api/users/`                 | `GET`, `PUT`, `DELETE`  |
| **Admin Users**           | `/api/admin/users/`           | `GET`                   |
| **Admin UAVs**            | `/api/admin/uavs/`            | `GET`                   |

---

## Additional Notes

- The application is prepared for production use but designed as a study project.
- For detailed information, see the project documentation in the `_docs` folder.

---

## License

This project was developed as part of the CAS Full Stack Developer program and is intended for educational purposes. It will likely be released under the MIT license in the future.
