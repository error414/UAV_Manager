---
description: Local Installation of the UAV Manager
icon: bolt
layout:
  width: default
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
  metadata:
    visible: true
---

# Quickstart (Install)

## Quick Start

### Prerequisites

Ensure you have the following installed:

* [Docker ](https://www.docker.com/products/docker-desktop/)& Docker Compose _(recommended deployment method)_
* [Node.js](https://nodejs.org/en/download) & npm _(for local frontend development)_
* [Python 3.13.1](https://www.python.org/) & pip _(for local backend development)_
* [PostgreSQL](https://www.postgresql.org/) _(used in production and local development)_

***

### 🚀 Recommended: Installation with Docker

1. **Clone the Repository**

```bash
git clone https://github.com/CarviFPV/UAV_Manager.git
cd UAV_Manager
```

2. **Build and Start the Docker Containers**

```bash
docker compose build
docker compose up -d
```

3. **Open the Frontend**

Visit [http://localhost:5175](http://localhost:5175) in your browser.

> **Note:**\
> If running on a different host or in a network, update the `VITE_API_URL` environment variable in `.env` accordingly.

***

### 🧪 Manual Installation (Development)

#### Backend Setup (Django)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate  # Use `. .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup (React)

```bash
cd frontend
npm install
```

Set the API URL environment variable:

```bash
# Windows (PowerShell)
$env:VITE_API_URL = "http://localhost:8000"

# macOS/Linux
export VITE_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)&#x20;
