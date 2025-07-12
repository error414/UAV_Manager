# Use official Node image
FROM node:20

# Set working directory
WORKDIR /app

# Set build arguments for environment
ARG NODE_ENV=production
ARG VITE_API_URL

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}

# Install build tools for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including devDependencies
RUN npm install --include=dev

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 5175

# Start development server on all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]