# Use official Node image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Set environment variables - wichtig für die Vite-Proxy-Konfiguration
ENV DOCKER=true

# Expose port
EXPOSE 5175

# Start the app with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]