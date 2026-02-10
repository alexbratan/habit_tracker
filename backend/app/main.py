from fastapi import FastAPI
from app.routes.users import router as users_router
from app.routes.habits import router as habits_router
from app.routes.weekly_plans import router as weekly_plans_router
from app.routes.overrides import router as overrides_router

app = FastAPI(title="Habit Tracker API")

app.include_router(users_router)
app.include_router(habits_router)
app.include_router(weekly_plans_router)
app.include_router(overrides_router)
