from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.core.security import get_current_user
from app.core.dates import weekday_from_yyyy_mm_dd
from app.models.overrides import OverrideUpsert, OverrideResponse

router = APIRouter(prefix="/overrides", tags=["Overrides"])
DAY_LIMIT_MINUTES = 24 * 60


async def compute_day_total_minutes(db, user_id: ObjectId, date: str, proposed_override: dict | None = None) -> int:
    """
    Rebuild total planned minutes for a date:
    - start from weekly templates for that weekday
    - apply overrides found for that date
    - if proposed_override provided, it replaces/acts as the override for that weeklyPlanId
    Total counts only items where status != "skipped".
    plannedDuration:
      - if override.plannedDuration is None -> use template plannedDuration
      - else use override plannedDuration
    """
    weekday = weekday_from_yyyy_mm_dd(date)

    # load templates
    templates = []
    async for wp in db.weekly_plans.find({"user_id": user_id, "weekday": weekday, "is_active": True}):
        templates.append(wp)

    # load overrides for that date
    overrides_by_wp = {}
    async for ov in db.plan_overrides.find({"user_id": user_id, "date": date}):
        overrides_by_wp[str(ov["weeklyPlanId"])] = ov

    # apply proposed override if passed
    if proposed_override is not None:
        overrides_by_wp[str(proposed_override["weeklyPlanId"])] = proposed_override

    total = 0
    for wp in templates:
        wp_id = str(wp["_id"])
        template_minutes = int(wp["plannedDuration"])

        ov = overrides_by_wp.get(wp_id)
        if not ov:
            # no override => template planned
            total += template_minutes
            continue

        status = ov.get("status", "planned")
        if status == "skipped":
            continue

        ov_minutes = ov.get("plannedDuration")
        if ov_minutes is None:
            total += template_minutes
        else:
            total += int(ov_minutes)

    return total


@router.patch("", response_model=OverrideResponse)
async def upsert_override(payload: OverrideUpsert, current_user: dict = Depends(get_current_user)):
    db = get_db()

    # validate date
    try:
        weekday = weekday_from_yyyy_mm_dd(payload.date)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # validate weeklyPlanId
    try:
        wp_oid = ObjectId(payload.weeklyPlanId)
    except:
        raise HTTPException(status_code=400, detail="Invalid weeklyPlanId")

    # weekly plan must exist, belong to user, and match weekday of date
    wp = await db.weekly_plans.find_one({"_id": wp_oid, "user_id": current_user["_id"], "is_active": True})
    if not wp:
        raise HTTPException(status_code=404, detail="Weekly plan not found")

    if int(wp["weekday"]) != int(weekday):
        raise HTTPException(status_code=400, detail="weeklyPlanId weekday does not match the date weekday")

    # validate durations
    if payload.plannedDuration is not None:
        if payload.plannedDuration <= 0:
            raise HTTPException(status_code=400, detail="plannedDuration must be > 0")
        if payload.plannedDuration > DAY_LIMIT_MINUTES:
            raise HTTPException(status_code=400, detail="plannedDuration cannot exceed 1440 minutes")

    if payload.actualDuration is not None and payload.actualDuration < 0:
        raise HTTPException(status_code=400, detail="actualDuration must be >= 0")

    # find existing override (if any)
    existing = await db.plan_overrides.find_one({
        "user_id": current_user["_id"],
        "date": payload.date,
        "weeklyPlanId": wp_oid
    })

    # Build the proposed override object (for limit check)
    proposed = dict(existing) if existing else {
        "user_id": current_user["_id"],
        "date": payload.date,
        "weeklyPlanId": wp_oid,
        "createdAt": datetime.utcnow(),
    }

    # Apply fields (upsert semantics)
    # status defaults to existing.status or "planned"
    if payload.status is not None:
        proposed["status"] = payload.status
    elif "status" not in proposed:
        proposed["status"] = "planned"

    # Auto-set actualDuration to 0 when status is "skipped"
    if proposed["status"] == "skipped":
        proposed["actualDuration"] = 0
    elif payload.actualDuration is not None:
        proposed["actualDuration"] = int(payload.actualDuration)
    else:
        proposed.setdefault("actualDuration", None)

    if payload.plannedDuration is not None:
        proposed["plannedDuration"] = int(payload.plannedDuration)
    else:
        # keep existing plannedDuration if any; else None meaning "use template"
        proposed.setdefault("plannedDuration", None)

    if payload.note is not None:
        proposed["note"] = payload.note
    else:
        proposed.setdefault("note", None)

    # completedAt logic
    if proposed["status"] == "done":
        proposed["completedAt"] = proposed.get("completedAt") or datetime.utcnow()
    else:
        proposed["completedAt"] = None

    # Enforce 24h/day total after this override
    total_after = await compute_day_total_minutes(db, current_user["_id"], payload.date, proposed_override=proposed)
    if total_after > DAY_LIMIT_MINUTES:
        raise HTTPException(status_code=400, detail=f"Daily limit exceeded: {total_after}/{DAY_LIMIT_MINUTES} minutes")

    # persist
    if existing:
        # If status is being set to "planned", delete the override to revert to template
        if proposed["status"] == "planned":
            await db.plan_overrides.delete_one({"_id": existing["_id"]})
            return OverrideResponse(
                id=str(existing["_id"]),
                weeklyPlanId=str(existing["weeklyPlanId"]),
                date=existing["date"],
                status="planned",
                plannedDuration=existing.get("plannedDuration"),
                actualDuration=None,
                note=None,
                createdAt=existing.get("createdAt"),
                completedAt=None
            )
        
        update_doc = {
            "status": proposed["status"],
            "plannedDuration": proposed.get("plannedDuration"),
            "actualDuration": proposed.get("actualDuration"),
            "note": proposed.get("note"),
            "completedAt": proposed.get("completedAt"),
        }
        await db.plan_overrides.update_one({"_id": existing["_id"]}, {"$set": update_doc})
        ov = await db.plan_overrides.find_one({"_id": existing["_id"]})
    else:
        # insert
        insert_doc = {
            "user_id": proposed["user_id"],
            "date": proposed["date"],
            "weeklyPlanId": proposed["weeklyPlanId"],
            "status": proposed["status"],
            "plannedDuration": proposed.get("plannedDuration"),
            "actualDuration": proposed.get("actualDuration"),
            "note": proposed.get("note"),
            "createdAt": proposed["createdAt"],
            "completedAt": proposed.get("completedAt"),
        }
        res = await db.plan_overrides.insert_one(insert_doc)
        ov = await db.plan_overrides.find_one({"_id": res.inserted_id})

    return OverrideResponse(
        id=str(ov["_id"]),
        date=ov["date"],
        weeklyPlanId=str(ov["weeklyPlanId"]),
        status=ov.get("status", "planned"),
        plannedDuration=ov.get("plannedDuration"),
        actualDuration=ov.get("actualDuration"),
        note=ov.get("note"),
        createdAt=ov["createdAt"],
        completedAt=ov.get("completedAt"),
    )


@router.delete("")
async def delete_override(
    date: str,
    weeklyPlanId: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    # validate date format
    try:
        _ = weekday_from_yyyy_mm_dd(date)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # validate weeklyPlanId
    try:
        wp_oid = ObjectId(weeklyPlanId)
    except:
        raise HTTPException(status_code=400, detail="Invalid weeklyPlanId")

    result = await db.plan_overrides.delete_one({
        "user_id": current_user["_id"],
        "date": date,
        "weeklyPlanId": wp_oid
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Override not found")

    return {"message": "Override removed (reset to template)"}
