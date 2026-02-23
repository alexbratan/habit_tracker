from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.users import router as users_router
from app.routes.habits import router as habits_router
from app.routes.weekly_plans import router as weekly_plans_router
from app.routes.overrides import router as overrides_router
from app.routes.day_actions import router as day_actions_router
from app.routes.week_view import router as week_view_router
from app.routes.daily_progress import router as daily_progress_router

app = FastAPI(title="Habit Tracker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(users_router)
app.include_router(habits_router)
app.include_router(weekly_plans_router)
app.include_router(overrides_router)
app.include_router(day_actions_router)
app.include_router(week_view_router)
app.include_router(daily_progress_router)
