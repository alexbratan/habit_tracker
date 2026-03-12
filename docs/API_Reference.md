# API Reference

## Base URL
```
Development: http://localhost:8000
Production: https://your-api-domain.com
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "data": {},
  "message": "Success"
}
```

### Error Response
```json
{
  "detail": "Error message"
}
```

---

## Authentication Endpoints

### Register User
```http
POST /users
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "optional_username"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "username": "optional_username"
}
```

### Login
```http
POST /users/login
```

**Request Body (form-data):**
```
username: user@example.com
password: password123
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

### Get Current User
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "username": "optional_username"
}
```

---

## Habit Management

### Get Habits
```http
GET /habits
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Morning Exercise",
    "default_duration": 30,
    "created_at": "2024-01-01T00:00:00Z",
    "user_id": "507f1f77bcf86cd799439012"
  }
]
```

### Create Habit
```http
POST /habits
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Morning Exercise",
  "default_duration": 30
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Morning Exercise",
  "default_duration": 30,
  "created_at": "2024-01-01T00:00:00Z",
  "user_id": "507f1f77bcf86cd799439012"
}
```

### Update Habit
```http
PUT /habits/{habit_id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Exercise",
  "default_duration": 45
}
```

### Delete Habit
```http
DELETE /habits/{habit_id}
Authorization: Bearer <token>
```

---

## Weekly Planning

### Get Weekly Plans
```http
GET /weekly-plans
Authorization: Bearer <token>
```

**Query Parameters:**
- `week_start` (optional): ISO date string for week start (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "habitId": "507f1f77bcf86cd799439012",
    "weekday": 1,
    "plannedDuration": 30,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Create Weekly Plan
```http
POST /weekly-plans
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "habitId": "507f1f77bcf86cd799439012",
  "weekday": 1,
  "plannedDuration": 30
}
```

**Validation:**
- `weekday`: 0-6 (Monday=0, Sunday=6)
- `plannedDuration`: 1-1440 minutes

### Update Weekly Plan
```http
PUT /weekly-plans/{plan_id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "weekday": 2,
  "plannedDuration": 45,
  "is_active": false
}
```

### Delete Weekly Plan
```http
DELETE /weekly-plans/{plan_id}
Authorization: Bearer <token>
```

---

## Day Actions

### Get Day Actions
```http
GET /day-actions
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (optional): ISO date string (YYYY-MM-DD)
- `habit_id` (optional): Habit ID

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "habit_id": "507f1f77bcf86cd799439012",
    "date": "2024-01-01T00:00:00Z",
    "actualDuration": 25,
    "completed": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Create Day Action
```http
POST /day-actions
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "habit_id": "507f1f77bcf86cd799439012",
  "date": "2024-01-01",
  "actualDuration": 25,
  "completed": true
}
```

### Update Day Action
```http
PUT /day-actions/{action_id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "actualDuration": 30,
  "completed": false
}
```

---

## Overrides

### Get Overrides
```http
GET /overrides
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (optional): ISO date string
- `habit_id` (optional): Habit ID

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "habit_id": "507f1f77bcf86cd799439012",
    "date": "2024-01-01T00:00:00Z",
    "overrideType": "skip",
    "newValue": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Create Override
```http
POST /overrides
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "habit_id": "507f1f77bcf86cd799439012",
  "date": "2024-01-01",
  "overrideType": "duration",
  "newValue": 45
}
```

**Override Types:**
- `skip`: Skip habit for the date
- `duration`: Change planned duration

---

## Progress & Analytics

### Get Daily Progress
```http
GET /daily-progress
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (optional): ISO date string

**Response:**
```json
{
  "date": "2024-01-01",
  "total_planned": 120,
  "total_completed": 90,
  "completion_rate": 75.0,
  "habits": [
    {
      "habit_id": "507f1f77bcf86cd799439012",
      "habit_name": "Morning Exercise",
      "planned_duration": 30,
      "actual_duration": 25,
      "completed": true
    }
  ]
}
```

### Get Week View
```http
GET /week-view
Authorization: Bearer <token>
```

**Query Parameters:**
- `week_start` (required): ISO date string for Monday

**Response:**
```json
{
  "week_start": "2024-01-01",
  "week_end": "2024-01-07",
  "days": [
    {
      "date": "2024-01-01",
      "weekday": 0,
      "planned_minutes": 120,
      "completed_minutes": 90,
      "completion_rate": 75.0,
      "habits_count": 3,
      "completed_habits": 2
    }
  ],
  "week_summary": {
    "total_planned": 840,
    "total_completed": 630,
    "completion_rate": 75.0
  }
}
```

### Get Weekly Report
```http
GET /weekly-report
Authorization: Bearer <token>
```

**Query Parameters:**
- `week_start` (required): ISO date string for Monday

**Response:**
```json
{
  "week_start": "2024-01-01",
  "week_end": "2024-01-07",
  "summary": {
    "total_habits": 5,
    "active_habits": 4,
    "completion_rate": 75.0,
    "total_time_planned": 840,
    "total_time_completed": 630
  },
  "habit_performance": [
    {
      "habit_id": "507f1f77bcf86cd799439012",
      "habit_name": "Morning Exercise",
      "planned_sessions": 7,
      "completed_sessions": 6,
      "completion_rate": 85.7,
      "total_time_planned": 210,
      "total_time_completed": 180
    }
  ],
  "streaks": {
    "current_streak": 5,
    "longest_streak": 12
  }
}
```

---

## AI Chatbot

### Chat with Bot
```http
POST /api/chatbot/chat
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "message": "How can I improve my habit consistency?",
  "context": {
    "current_habits": ["Morning Exercise", "Reading"],
    "completion_rate": 75.0
  }
}
```

**Response:**
```json
{
  "response": "Based on your current habits and 75% completion rate...",
  "suggestions": [
    "Try habit stacking with existing routines",
    "Set smaller, more achievable goals"
  ],
  "insights": {
    "best_performing_day": "Monday",
    "improvement_areas": ["Weekend consistency"]
  }
}
```

---

## Error Codes

| Status Code | Description | Example |
|-------------|-------------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Validation Error | Invalid data format |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Standard endpoints**: 100 requests per minute
- **Chatbot endpoint**: 20 requests per minute

---

## Pagination

For endpoints returning lists, use these query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Example:**
```http
GET /habits?page=2&limit=10
```

**Response:**
```json
{
  "items": [],
  "total": 50,
  "page": 2,
  "limit": 10,
  "pages": 5
}
```

---

## Data Types

### Date Format
All dates use ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

### Weekday Numbers
- 0: Monday
- 1: Tuesday
- 2: Wednesday
- 3: Thursday
- 4: Friday
- 5: Saturday
- 6: Sunday

### Duration
All durations are in minutes.

---

## SDK Examples

### JavaScript/TypeScript
```typescript
// Authentication
const login = async (email: string, password: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  
  const response = await fetch('/users/login', {
    method: 'POST',
    body: formData
  });
  
  const { access_token } = await response.json();
  localStorage.setItem('token', access_token);
};

// Get habits
const getHabits = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/habits', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

### Python
```python
import requests

# Authentication
def login(email: str, password: str):
    response = requests.post('/users/login', data={
        'username': email,
        'password': password
    })
    token = response.json()['access_token']
    return token

# Get habits
def get_habits(token: str):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get('/habits', headers=headers)
    return response.json()
```

---

## Testing

### Using Swagger UI
Visit `/docs` for interactive API testing.

### Using curl
```bash
# Login
curl -X POST "http://localhost:8000/users/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"

# Get habits
curl -X GET "http://localhost:8000/habits" \
  -H "Authorization: Bearer <token>"
```

---

## Webhooks (Future Feature)

Planned webhook support for:
- Habit completion notifications
- Weekly progress summaries
- Streak achievements

---

## Changelog

### v1.0.0
- Initial API release
- User authentication
- Habit management
- Weekly planning
- Progress tracking
- AI chatbot integration
