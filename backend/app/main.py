from fastapi import FastAPI
from app.routes.users import router as users_router
from app.routes.habits import router as habits_router
from app.routes.plans import router as plans_router

app = FastAPI(title="Habit Tracker API")

app.include_router(users_router)
app.include_router(habits_router)
app.include_router(plans_router)
