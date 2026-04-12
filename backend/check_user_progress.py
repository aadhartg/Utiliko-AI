import asyncio
import uuid
from sqlalchemy.future import select
from core.database import AsyncSessionLocal as SessionLocal
from models.lms_core import User, EmployeeCourseProgress, Course

async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "johndeo@gmail.com"))
        user = res.scalar_one_or_none()
        if not user:
            print("User not found")
            return
        print(f"User ID: {user.id}, Email: {user.email}")
        
        res = await db.execute(select(EmployeeCourseProgress).where(EmployeeCourseProgress.employee_id == user.id))
        progresses = res.scalars().all()
        print(f"Found {len(progresses)} progress records")
        for p in progresses:
            c_res = await db.execute(select(Course).where(Course.id == p.course_id))
            course = c_res.scalar_one_or_none()
            course_title = course.title if course else "Unknown"
            print(f"Course: {course_title} ({p.course_id})")
            print(f"  Status: {p.status}")
            print(f"  Score: {p.score}")
            print(f"  Correct Answers: {p.correct_answers_count}")
            print(f"  Total Questions: {p.total_questions_asked}")
            print(f"  Completed Lessons: {p.completed_lessons}")
            print(f"  Chat History Len: {len(p.chat_history) if p.chat_history else 0}")
            if p.chat_history:
                print("  Last 2 messages in history:")
                for msg in p.chat_history[-2:]:
                    print(f"    {msg['role']}: {msg['content'][:100]}...")

if __name__ == "__main__":
    import sys
    import os
    # Add backend to sys.path
    sys.path.append(os.getcwd())
    asyncio.run(check())
