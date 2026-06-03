# Build stage: compile blackbox-tools v0.4.3
FROM python:3.11-slim AS blackbox-builder

RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    wget \
    libpng-dev \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN wget -qO /tmp/blackbox-tools.tar.gz \
        https://github.com/betaflight/blackbox-tools/archive/refs/tags/v0.4.3.tar.gz \
    && tar -xzf /tmp/blackbox-tools.tar.gz -C /tmp \
    && cd /tmp/blackbox-tools-0.4.3 \
    && make \
    && mkdir -p /blackbox-out \
    && find . -maxdepth 2 -name 'blackbox_*' -type f -perm /111 \
         -exec cp {} /blackbox-out/ \;


# Runtime stage
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpng16-16 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binaries outside the app volume mount
COPY --from=blackbox-builder /blackbox-out /opt/blackbox-tools

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
