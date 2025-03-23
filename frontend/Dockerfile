# Use official Node image
FROM node:20

# Set working directory
WORKDIR /app

# Add build argument for environment
ARG NODE_ENV=development

# Set environment variable
ENV NODE_ENV=${NODE_ENV}

# Install dependencies needed for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with explicit dev inclusion
RUN npm install 

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 5175

# Start the app with the appropriate environment
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]