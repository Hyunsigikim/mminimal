# MMinimal Forum

Lightweight forum based on NodeBBS structure with core features: user management, boards, posts, and comments.

## Setup

1. Install dependencies: `npm install`
2. Start MongoDB: `mongod`
3. Run the app: `npm start`
4. Access: http://localhost:3000

## Features

- User registration/login
- Board creation
- Post creation with image upload
- Comment system
- Simple templates with Benchpress

## Structure

- `app.js`: Main server
- `src/models/`: Mongoose models
- `src/controllers/`: Route handlers
- `src/routes/`: Route definitions
- `src/views/`: Benchpress templates
- `uploads/`: Uploaded files
