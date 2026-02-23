from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from pymongo import UpdateOne

from app.database import get_db
from app.core.security import get_current_user
from app.core.dates import weekday_from_yyyy_mm_dd
from app.models.day_actions import DayActionRequest

router = APIRouter(prefix="/day-actions", tags=["Day Actions"])

@router.post("")
async def day_action(payload: DayActionRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()

    # validate date
    try:
        weekday = weekday_from_yyyy_mm_dd(payload.date)  # Mon=0..Sun=6
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    user_id = current_user["_id"]
    now = datetime.utcnow()

    # RESET: delete all overrides for that date
    if payload.action == "reset":
        res = await db.plan_overrides.delete_many({"user_id": user_id, "date": payload.date})
        return {"message": "Day reset to template", "deletedOverrides": res.deleted_count}

    # Load weekly template items for that weekday
    weekly_items = []
    async for wp in db.weekly_plans.find({"user_id": user_id, "weekday": weekday, "is_active": True}):
        weekly_items.append(wp)

    if not weekly_items:
        return {"message": "No weekly template items for this day", "affected": 0}

    # Load existing overrides for that date (needed for DONE to respect per-item plannedDuration override)
    existing_overrides = {}
    async for ov in db.plan_overrides.find({"user_id": user_id, "date": payload.date}):
        existing_overrides[str(ov["weeklyPlanId"])] = ov

    ops = []

    if payload.action == "skip":
        for wp in weekly_items:
            wp_id = wp["_id"]
            ops.append(UpdateOne(
                {"user_id": user_id, "date": payload.date, "weeklyPlanId": wp_id},
                {
                    "$set": {
                        "status": "skipped",
                        "completedAt": None,
                        # keep any existing plannedDuration override; don't overwrite it here
                    },
                    "$setOnInsert": {
                        "user_id": user_id,
                        "date": payload.date,
                        "weeklyPlanId": wp_id,
                        "createdAt": now,
                    }
                },
                upsert=True
            ))

        result = await db.plan_overrides.bulk_write(ops, ordered=False)
        return {
            "message": "Day skipped",
            "matched": result.matched_count,
            "modified": result.modified_count,
            "upserted": len(result.upserted_ids)
        }

    if payload.action == "done":
        for wp in weekly_items:
            wp_id = wp["_id"]
            wp_id_str = str(wp_id)
            template_minutes = int(wp["plannedDuration"])

            ov = existing_overrides.get(wp_id_str)
            resolved_planned = template_minutes
            if ov and ov.get("plannedDuration") is not None:
                resolved_planned = int(ov["plannedDuration"])

            ops.append(UpdateOne(
                {"user_id": user_id, "date": payload.date, "weeklyPlanId": wp_id},
                {
                    "$set": {
                        "status": "done",
                        "actualDuration": resolved_planned,
                        "completedAt": now
                    },
                    "$setOnInsert": {
                        "user_id": user_id,
                        "date": payload.date,
                        "weeklyPlanId": wp_id,
                        "createdAt": now,
                    }
                },
                upsert=True
            ))

        result = await db.plan_overrides.bulk_write(ops, ordered=False)
        return {
            "message": "Day marked done",
            "matched": result.matched_count,
            "modified": result.modified_count,
            "upserted": len(result.upserted_ids)
        }

    raise HTTPException(status_code=400, detail="Invalid action")
