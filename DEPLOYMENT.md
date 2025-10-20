# Deployment Guide

## Environment Variables Required

Create a `.env` file in the api directory with the following variables:

```env
# Server Configuration
PORT=8800
URL_REACT=http://localhost:3000
URL_ADMIN=http://localhost:3001

# Database Configuration (FreeSQLDatabase)
DB_HOST=sql12.freesqldatabase.com
DB_PORT=3306
DB_USER=your_username
DB_PASS=your_password
DB_NAME=your_database_name

# Email Configuration
MAIL_NAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# JWT Secret
MY_SECRET=your_jwt_secret_key

# Email Service
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Recent Fixes Applied

1. **Fixed import syntax error** - Replaced `assert` keyword with `readFileSync`
2. **Updated database configuration** - Now uses FreeSQLDatabase
3. **Fixed posts API** - Resolved 500 error in `/api/posts` endpoint
4. **Improved error handling** - Better JSON parsing and error management

## Deployment Steps

1. Set environment variables on your hosting platform
2. Ensure Node.js version 18+ is used
3. Install dependencies: `npm install`
4. Start server: `node index.js`

## Database Setup

The application expects a `posts` table with the following structure:
- id, title, slug, excerpt, content, featured_image
- category, tags (JSON), status, author_id
- view_count, is_featured, meta_title, meta_description
- created_at, updated_at
