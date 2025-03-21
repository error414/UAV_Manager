# Use official Node image
FROM node:20

# Set working directory
WORKDIR /app

# Add build argument for environment
ARG NODE_ENV=development

# Set environment variable
ENV NODE_ENV=${NODE_ENV}

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

# Start the app with the appropriate environment
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175", "--mode", "${NODE_ENV}"]