# Habit Tracker API Documentation

## Overview

The Habit Tracker is a full-stack web application for managing daily habits and weekly planning. It consists of a FastAPI backend with MongoDB database and a React TypeScript frontend.

## Architecture

### Backend (FastAPI + MongoDB)
- **Framework**: FastAPI with Python
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Documentation**: Auto-generated Swagger UI at `/docs`

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons, Lucide React
- **HTTP Client**: Axios

## Project Structure

```
habit_tracker/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── core/           # Security, JWT, utilities
│   │   ├── models/         # Pydantic models
│   │   ├── routes/         # API endpoints
│   │   ├── database.py     # MongoDB connection
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── run.py             # Development server
├── frontend_new/           # React frontend
│   ├── src/
│   │   ├── api/           # API service functions
│   │   ├── auth/          # Authentication context
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   └── utils/         # Utility functions
│   ├── package.json       # Node.js dependencies
│   └── public/            # Static assets
├── mcp_server/             # MCP server exposing the API to AI assistants
└── docs/                  # Documentation
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB instance

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
python run.py
```

### Frontend Setup
```bash
cd frontend_new
npm install
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Database Schema

### Collections

#### Users
```javascript
{
  _id: ObjectId,
  email: string (unique),
  username: string (optional),
  password_hash: string,
  created_at: Date
}
```

#### Habits
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  name: string,
  default_duration: number (minutes),
  created_at: Date,
  is_active: boolean
}
```

#### Weekly Plans
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  habit_id: ObjectId,
  weekday: number (0-6, Monday=0),
  plannedDuration: number (minutes),
  is_active: boolean,
  created_at: Date
}
```

#### Day Actions
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  habit_id: ObjectId,
  date: Date,
  actualDuration: number (minutes),
  completed: boolean,
  created_at: Date
}
```

#### Overrides
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  habit_id: ObjectId,
  date: Date,
  overrideType: string ("skip" | "duration"),
  newValue: any,
  created_at: Date
}
```

## API Endpoints

### Authentication
- `POST /users` - Register new user
- `POST /users/login` - Login and get JWT token
- `GET /users/me` - Get current user info

### Habits
- `GET /habits` - Get user's habits
- `POST /habits` - Create new habit
- `PUT /habits/{id}` - Update habit
- `DELETE /habits/{id}` - Delete habit

### Weekly Plans
- `GET /weekly-plans` - Get weekly plans
- `POST /weekly-plans` - Create weekly plan
- `PUT /weekly-plans/{id}` - Update weekly plan
- `DELETE /weekly-plans/{id}` - Delete weekly plan

### Day Actions
- `GET /day-actions` - Get day actions
- `POST /day-actions` - Create day action
- `PUT /day-actions/{id}` - Update day action

### Progress & Reports
- `GET /daily-progress` - Get daily progress
- `GET /week-view` - Get week view data
- `GET /weekly-report` - Get weekly report

### Chatbot
- `POST /api/chatbot/chat` - Chat with AI assistant

## Frontend Routes

### Public Routes
- `/login` - User login
- `/register` - User registration

### Protected Routes
- `/dashboard` - Main dashboard
- `/week` - Weekly planning view
- `/template` - Habit templates

## Key Features

1. **User Authentication**: Secure JWT-based authentication
2. **Habit Management**: Create, update, and track habits
3. **Weekly Planning**: Plan habits for specific days
4. **Progress Tracking**: Daily and weekly progress monitoring
5. **AI Chatbot**: Get assistance with habit formation
6. **Responsive Design**: Mobile-friendly interface

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Input validation with Pydantic
- SQL injection prevention (MongoDB)

## Development

### Environment Variables
Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=habit_tracker
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
```

### API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation.

## Deployment

### Backend Deployment
1. Set up production MongoDB instance
2. Configure environment variables
3. Install dependencies: `pip install -r requirements.txt`
4. Run with production server: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Frontend Deployment
1. Build for production: `npm run build`
2. Deploy the `build` directory to your web server
3. Configure API endpoint in production

## MCP Server (AI assistant integration)

`mcp_server/` is a Python [Model Context Protocol](https://modelcontextprotocol.io) server (official `mcp` SDK, stdio transport) that lets Claude Code and other MCP clients use the Habit Tracker in natural language. It exposes three tools, `list_habits`, `get_week_plan` and `log_habit`, which call this REST API over HTTP. It authenticates by logging in with `POST /users/login` using credentials from environment variables and re-logs in automatically when the JWT expires.

See [`mcp_server/README.md`](../mcp_server/README.md) for setup, environment variables, `claude mcp add` and example prompts.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
