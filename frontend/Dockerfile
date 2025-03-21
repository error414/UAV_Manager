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

# Build the app
RUN npm run build

# Expose port
EXPOSE 5175

ENV DOCKER=true

# Start the app
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]