# Backend Documentation

## Overview

The backend is a FastAPI-based REST API that provides the core functionality for the Habit Tracker application. It uses MongoDB as the database and includes features for user authentication, habit management, weekly planning, and AI-powered chatbot assistance.

## Technology Stack

- **FastAPI** - Modern, fast web framework for building APIs
- **MongoDB** - NoSQL document database
- **Motor** - Async MongoDB driver for Python
- **Pydantic** - Data validation and settings management
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Google Generative AI** - AI chatbot integration

## Project Structure

```
backend/app/
├── core/                   # Core functionality
│   ├── security.py        # Authentication & security
│   ├── jwt.py            # JWT token handling
│   ├── dates.py          # Date utilities
│   └── config.py         # Configuration settings
├── models/                # Pydantic models
│   ├── user.py           # User models
│   ├── habit.py          # Habit models
│   ├── weekly_plan.py    # Weekly plan models
│   ├── day_actions.py    # Day action models
│   ├── overrides.py      # Override models
│   └── weekly_report.py  # Weekly report models
├── routes/                # API endpoints
│   ├── users.py          # User management
│   ├── habits.py         # Habit CRUD
│   ├── weekly_plans.py   # Weekly planning
│   ├── day_actions.py    # Daily actions
│   ├── overrides.py      # Schedule overrides
│   ├── daily_progress.py # Progress tracking
│   ├── week_view.py      # Week view data
│   ├── weekly_report.py  # Reports
│   └── chatbot.py        # AI chatbot
├── database.py            # MongoDB connection
└── main.py               # FastAPI application
```

## Core Architecture

### FastAPI Application (main.py)

```python
app = FastAPI(title="Habit Tracker API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Registration
app.include_router(users_router)
app.include_router(habits_router)
app.include_router(weekly_plans_router)
app.include_router(overrides_router)
app.include_router(day_actions_router)
app.include_router(week_view_router)
app.include_router(daily_progress_router)
app.include_router(weekly_report_router)
app.include_router(chatbot_router, prefix="/api/chatbot", tags=["chatbot"])
```

### Database Connection (database.py)

```python
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
db = client[os.getenv("DB_NAME", "habit_tracker")]

def get_db():
    return db
```

## Security Architecture

### Authentication System (core/security.py)

#### Password Hashing
```python
def hash_password(password: str) -> str:
    password_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password[:72].encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except:
        # Fallback for legacy users
        return hashed_password == hashlib.sha256(plain_password.encode()).hexdigest()
```

#### JWT Authentication
```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    return user
```

## API Routes

### User Management (/users)

#### Endpoints
- `POST /users` - Register new user
- `GET /users` - Get all users (admin)
- `GET /users/me` - Get current user
- `GET /users/{user_id}` - Get user by ID
- `PUT /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user
- `POST /users/login` - User login

#### Key Features
- Email validation with Pydantic
- Password strength requirements (min 8 characters)
- Duplicate email prevention
- JWT token generation

### Habit Management (/habits)

#### Endpoints
- `GET /habits` - Get user's habits
- `POST /habits` - Create new habit
- `PUT /habits/{habit_id}` - Update habit
- `DELETE /habits/{habit_id}` - Delete habit (soft delete)

#### Validation Rules
```python
class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    default_duration: int = Field(..., ge=1, description="Default duration in minutes")
```

#### Business Logic
- Prevent duplicate active habits per user
- Soft delete with `is_active` flag
- User-scoped habit access

### Weekly Planning (/weekly-plans)

#### Endpoints
- `GET /weekly-plans` - Get weekly plans
- `POST /weekly-plans` - Create weekly plan
- `PUT /weekly-plans/{plan_id}` - Update weekly plan
- `DELETE /weekly-plans/{plan_id}` - Delete weekly plan

#### Validation Rules
```python
# Weekday validation (0-6, Monday=0)
if payload.weekday < 0 or payload.weekday > 6:
    raise HTTPException(status_code=400, detail="weekday must be in [0..6]")

# Duration validation (1-1440 minutes)
if payload.plannedDuration <= 0 or payload.plannedDuration > DAY_LIMIT_MINUTES:
    raise HTTPException(status_code=400, detail="Invalid duration")
```

#### Business Logic
- Daily duration limits (24 hours max)
- Habit existence validation
- User-scoped planning access

### Day Actions (/day-actions)

#### Endpoints
- `GET /day-actions` - Get day actions
- `POST /day-actions` - Create day action
- `PUT /day-actions/{action_id}` - Update day action

#### Features
- Track actual habit completion
- Duration recording
- Completion status management

### Overrides (/overrides)

#### Endpoints
- `GET /overrides` - Get overrides
- `POST /overrides` - Create override
- `PUT /overrides/{override_id}` - Update override
- `DELETE /overrides/{override_id}` - Delete override

#### Override Types
- `skip` - Skip habit for specific date
- `duration` - Change planned duration

### Progress Tracking

#### Daily Progress (/daily-progress)
```python
@router.get("/daily-progress")
async def get_daily_progress(
    date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    # Calculate completion percentages
    # Track streak information
    # Generate progress insights
```

#### Week View (/week-view)
```python
@router.get("/week-view")
async def get_week_view(
    week_start: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    # Aggregate weekly data
    # Calculate completion rates
    # Generate week summaries
```

#### Weekly Report (/weekly-report)
```python
@router.get("/weekly-report")
async def get_weekly_report(
    week_start: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    # Generate comprehensive analytics
    # Performance metrics
    # Habit insights
```

### AI Chatbot (/api/chatbot)

#### Integration with Google Generative AI
```python
@router.post("/chat")
async def chat_with_bot(request: ChatRequest):
    # Initialize AI model
    # Process user message
    # Generate contextual response
    # Include habit-specific advice
```

#### Features
- Habit formation advice
- Progress insights
- Motivational support
- Personalized recommendations

## Data Models

### User Models (models/user.py)

```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class UserInDB(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password_hash: str
    created_at: datetime

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: Optional[str] = None
    created_at: datetime
```

### Habit Models (models/habit.py)

```python
class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    default_duration: int = Field(..., ge=1)

class HabitResponse(BaseModel):
    id: str
    name: str
    default_duration: Optional[int] = None
    created_at: datetime
    user_id: str
```

### Weekly Plan Models (models/weekly_plan.py)

```python
class WeeklyPlanCreate(BaseModel):
    habitId: str
    weekday: int = Field(..., ge=0, le=6)
    plannedDuration: int = Field(..., gt=0, le=1440)

class WeeklyPlanResponse(BaseModel):
    id: str
    habitId: str
    weekday: int
    plannedDuration: int
    is_active: bool
    created_at: datetime
```

## Database Schema

### Collections and Indices

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: string (unique),
  username: string (optional),
  password_hash: string,
  created_at: Date
}

// Indices
db.users.createIndex({ "email": 1 }, { unique: true })
```

#### Habits Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  name: string,
  default_duration: number,
  created_at: Date,
  is_active: boolean
}

// Indices
db.habits.createIndex({ "user_id": 1, "is_active": 1 })
db.habits.createIndex({ "user_id": 1, "name": 1 })
```

#### Weekly Plans Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  habit_id: ObjectId,
  weekday: number,
  plannedDuration: number,
  is_active: boolean,
  created_at: Date
}

// Indices
db.weekly_plans.createIndex({ "user_id": 1, "weekday": 1, "is_active": 1 })
db.weekly_plans.createIndex({ "user_id": 1, "habit_id": 1 })
```

## Error Handling

### HTTP Exception Handling
```python
# Validation errors
raise HTTPException(status_code=400, detail="Invalid input")

# Authentication errors
raise HTTPException(status_code=401, detail="Invalid credentials")

# Authorization errors
raise HTTPException(status_code=403, detail="Access denied")

# Not found errors
raise HTTPException(status_code=404, detail="Resource not found")

# Conflict errors
raise HTTPException(status_code=409, detail="Resource already exists")
```

### Validation with Pydantic
- Automatic request validation
- Response serialization
- Type safety
- Error message generation

## Performance Optimization

### Database Optimization
- Async database operations
- Efficient indexing strategies
- Aggregation pipelines for analytics
- Connection pooling

### API Performance
- Response caching
- Pagination for large datasets
- Efficient query patterns
- Minimal data transfer

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Password hashing with bcrypt
- Token expiration handling
- User context injection

### Data Protection
- Input validation and sanitization
- SQL injection prevention (MongoDB)
- XSS protection
- CORS configuration

### Rate Limiting
- API endpoint throttling
- Login attempt limits
- Request size validation

## Development Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=habit_tracker
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30
GOOGLE_AI_API_KEY=your-google-ai-key
```

### Dependencies (requirements.txt)
```
fastapi
uvicorn
motor
pydantic
python-dotenv
google-generativeai
```

## Testing Strategy

### Unit Testing
- Model validation testing
- Business logic testing
- Utility function testing

### Integration Testing
- API endpoint testing
- Database operation testing
- Authentication flow testing

### API Documentation
- Auto-generated Swagger UI
- Interactive API exploration
- Request/response examples
- Authentication testing

## Deployment Considerations

### Production Setup
- Environment-specific configuration
- Database connection pooling
- Logging and monitoring
- Error tracking

### Scaling Considerations
- Horizontal scaling with load balancers
- Database replication
- Caching strategies
- CDN integration

## Monitoring and Logging

### Application Logging
- Request/response logging
- Error tracking
- Performance metrics
- User activity monitoring

### Health Checks
- Database connectivity
- API endpoint availability
- External service status
