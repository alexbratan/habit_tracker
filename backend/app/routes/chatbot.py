from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import random
import google.generativeai as genai
from app.database import get_db
from app.core.security import get_current_user
from app.models.habit import HabitCreate, HabitResponse
from bson import ObjectId
from datetime import datetime

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_habits: Optional[List[dict]] = None
    weekly_plan: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    suggested_schedule: Optional[dict] = None
    suggested_habits: Optional[List[dict]] = None

class HabitSuggestion(BaseModel):
    name: str
    default_duration: int

# Function to fetch user habits from database
async def get_user_habits(db, user_id: str) -> List[dict]:
    habits = []
    async for habit in db.habits.find({
        "user_id": ObjectId(user_id),
        "is_active": True
    }):
        habits.append({
            "id": str(habit["_id"]),
            "name": habit["name"],
            "default_duration": habit.get("default_duration"),
            "created_at": habit["created_at"].isoformat() if habit.get("created_at") else None
        })
    return habits

# Function to fetch user weekly plans from database
async def get_user_weekly_plans(db, user_id: str) -> dict:
    plans = {}
    async for plan in db.weekly_plans.find({
        "user_id": ObjectId(user_id),
        "is_active": True
    }):
        plan_id_str = str(plan["_id"])
        plans[plan_id_str] = {
            "weekday": plan.get("weekday"),
            "plannedDuration": plan.get("plannedDuration"),
            "habitId": str(plan.get("habitId")) if plan.get("habitId") else None
        }
    return plans

# Initialize Gemini AI
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    
    # List available models and find a suitable one
    print("Available Gemini models:")
    available_models = []
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            available_models.append(m.name)
            print(f"- {m.name}")
    
    # Try different models in order of preference
    model = None
    preferred_models = ['models/gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-3-flash', 'gemini-flash-latest', 'gemini-pro']
    
    for preferred in preferred_models:
        if preferred in available_models:
            model = genai.GenerativeModel(preferred)
            print(f"Using real Gemini AI: {preferred}")
            break
    
    if not model:
        print("No preferred models available, using fallback")
        model = genai.GenerativeModel(available_models[0]) if available_models else None
        print(f"Using fallback model: {available_models[0] if available_models else 'None'}")
else:
    print("GEMINI_API_KEY not found, using mock responses")
    model = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        print(f"Received chat request: {request}")
        
        # Get database connection
        db = get_db()
        
        # Fetch user's habits and weekly plans from database
        user_habits = await get_user_habits(db, current_user["_id"])
        user_weekly_plans = await get_user_weekly_plans(db, current_user["_id"])
        
        print(f"Fetched {len(user_habits)} habits and {len(user_weekly_plans)} weekly plans")
        
        # Get the latest user message
        user_messages = [msg.content for msg in request.messages if msg.role == 'user']
        if not user_messages:
            return ChatResponse(response="Hello! I'm your AI habit assistant. I can see you have habits and plans set up. How can I help you today?")
        
        latest_message = user_messages[-1]
        print(f"Processing message: {latest_message}")
        
        # Use real Gemini AI if available, otherwise fall back to mock
        if model:
            # Build system prompt with user context (more compact)
            system_prompt = """AI habit assistant. Be concise and conversational. 
            Help with schedules and habits. Reference user's existing data.
            Give natural, friendly responses. Don't show JSON in chat.
            
            If user asks for schedule, create one internally but respond conversationally.
            """
            
            # Add context about user's current habits and plans
            context_info = ""
            if user_habits:
                context_info += f"\nCurrent habits: {json.dumps(user_habits, indent=2)}"
            if user_weekly_plans:
                context_info += f"\nWeekly plans: {json.dumps(user_weekly_plans, indent=2)}"
            
            # Create full prompt with conversation history
            conversation_history = "\n".join([f"User: {msg.content}" for msg in request.messages if msg.role == 'user'])
            full_prompt = f"{system_prompt}{context_info}\n\n{conversation_history}\n\nUser: {latest_message}"
            
            print(f"Sending to Gemini: {full_prompt[:200]}...")
            
            # Get response from Gemini
            response = model.generate_content(full_prompt)
            ai_response = response.text
            
            print(f"Received Gemini response: {ai_response[:100]}...")
            
            # Try to extract JSON schedule from response but don't show it in chat
            suggested_schedule = None
            suggested_habits = None
            try:
                if "suggested_schedule" in ai_response.lower():
                    # Extract JSON from the response
                    start = ai_response.find("{")
                    end = ai_response.rfind("}") + 1
                    if start != -1 and end != 0:
                        json_str = ai_response[start:end]
                        schedule_data = json.loads(json_str)
                        suggested_schedule = schedule_data.get("suggested_schedule")
            except json.JSONDecodeError:
                pass  # If JSON parsing fails, continue without schedule
            
            # Clean response - remove JSON from chat display
            response_text = ai_response
            if suggested_schedule:
                # Remove JSON block from the displayed response
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                if json_start != -1 and json_end != 0:
                    response_text = response_text[:json_start] + response_text[json_end:]
            
            response_text = response_text.strip()
        else:
            # Fallback to mock responses
            print("Using mock responses (no Gemini API key)")
            response_text, suggested_schedule, suggested_habits = generate_fallback_response(latest_message, user_habits, user_weekly_plans)
        
        return ChatResponse(
            response=response_text,
            suggested_schedule=suggested_schedule,
            suggested_habits=suggested_habits
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@router.post("/create-suggested-habits")
async def create_suggested_habits(
    habits: List[HabitSuggestion],
    current_user: dict = Depends(get_current_user)
):
    """Create habits from chatbot suggestions"""
    try:
        db = get_db()
        created_habits = []
        
        for habit_suggestion in habits:
            # Check if habit already exists
            existing = await db.habits.find_one({
                "user_id": current_user["_id"],
                "name": habit_suggestion.name,
                "is_active": True
            })
            
            if existing:
                continue  # Skip if already exists
            
            # Create new habit
            doc = {
                "user_id": current_user["_id"],
                "name": habit_suggestion.name,
                "default_duration": habit_suggestion.default_duration,
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            
            result = await db.habits.insert_one(doc)
            created_habits.append({
                "id": str(result.inserted_id),
                "name": habit_suggestion.name,
                "default_duration": habit_suggestion.default_duration
            })
        
        return {
            "message": f"Created {len(created_habits)} new habits",
            "habits": created_habits
        }
        
    except Exception as e:
        print(f"Error creating suggested habits: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating habits: {str(e)}")

# Fallback response function when Gemini is not available
def generate_fallback_response(user_message: str, user_habits: List[dict] = None, weekly_plan: dict = None):
    user_message_lower = user_message.lower()
    
    # Habit suggestion responses
    if any(word in user_message_lower for word in ['suggest', 'add', 'new', 'recommend', 'habit']):
        habit_suggestions = [
            {"name": "Walking", "default_duration": 30},
            {"name": "Meditation", "default_duration": 15},
            {"name": "Reading", "default_duration": 20},
            {"name": "Exercise", "default_duration": 45},
            {"name": "Journaling", "default_duration": 10}
        ]
        
        # Select 2-3 random suggestions
        selected_habits = random.sample(habit_suggestions, min(3, len(habit_suggestions)))
        
        response_text = f"I suggest adding these habits to your routine:\n"
        for habit in selected_habits:
            response_text += f"• {habit.name} ({habit.default_duration} minutes)\n"
        response_text += "\nWould you like me to add these to your habit list?"
        
        return response_text, None, selected_habits
    
    # Schedule-related responses
    elif any(word in user_message_lower for word in ['schedule', 'plan', 'routine', 'time']):
        if user_habits:
            habit_names = [h.get('name', 'your habit') for h in user_habits[:3]]
            schedule = {
                "suggested_schedule": {
                    "habits": [
                        {"name": habit_names[0] if len(habit_names) > 0 else "Morning Exercise", "frequency": "daily", "suggested_time": "07:00", "duration_minutes": 30},
                        {"name": habit_names[1] if len(habit_names) > 1 else "Healthy Breakfast", "frequency": "daily", "suggested_time": "08:00", "duration_minutes": 20},
                        {"name": habit_names[2] if len(habit_names) > 2 else "Focus Work", "frequency": "daily", "suggested_time": "09:00", "duration_minutes": 90},
                    ],
                    "notes": f"Schedule based on: {', '.join(habit_names[:3]) if len(habit_names) > 0 else 'your activities'}"
                }
            }
            return f"Created schedule with your habits: {', '.join(habit_names[:3]) if len(habit_names) > 0 else 'your activities'}. Start early and stay consistent!", schedule, None
        else:
            return "What habits would you like in your schedule? I can create a personalized routine.", None, None
    
    # Habit-related responses
    elif any(word in user_message_lower for word in ['track', 'goal']):
        return "Start with 1-2 small habits. Track daily and build gradually. What habit interests you?", None, None
    
    # General responses (shorter)
    responses = [
        "How can I help with your habits today?",
        "What habit or schedule assistance do you need?",
        "Ready to help with your goals!",
        "What can I assist you with?"
    ]
    
    return random.choice(responses), None, None

@router.get("/models")
async def list_models():
    """List available Gemini models"""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"error": "GEMINI_API_KEY not configured"}
        
        genai.configure(api_key=api_key)
        
        models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                models.append({
                    "name": m.name,
                    "display_name": m.display_name,
                    "description": m.description,
                    "supported_methods": m.supported_generation_methods
                })
        
        return {
            "models": models,
            "total_available": len(models)
        }
        
    except Exception as e:
        return {"error": f"Failed to list models: {str(e)}"}

@router.post("/generate-schedule")
async def generate_schedule(habits: List[dict], preferences: Optional[dict] = None):
    try:
        # Generate a simple mock schedule
        schedule = {
            "monday": [
                {"time": "07:00", "activity": "Morning Routine", "duration": 30},
                {"time": "08:00", "activity": "Breakfast", "duration": 20},
                {"time": "09:00", "activity": "Focus Work", "duration": 120},
                {"time": "12:00", "activity": "Lunch Break", "duration": 60},
                {"time": "14:00", "activity": "Afternoon Tasks", "duration": 120},
                {"time": "17:00", "activity": "Exercise", "duration": 45},
                {"time": "19:00", "activity": "Dinner", "duration": 60},
                {"time": "20:00", "activity": "Evening Relaxation", "duration": 60}
            ],
            "notes": "This is a balanced daily schedule. Adjust times based on your specific habits and preferences."
        }
        
        return {"schedule": json.dumps(schedule, indent=2)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating schedule: {str(e)}")
