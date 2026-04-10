# backend/controllers/lms_controller.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
import uuid
import os
import json
import fitz
import openai
from datetime import datetime

from core.database import get_db
from models.lms_core import User, Department, Document, Course, RoleEnum, ProgressStatus
from controllers.auth_controller import get_super_admin, get_current_user

# Initialize OpenAI Client (Make sure OPENAI_API_KEY is in environment)
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter(prefix="/lms", tags=["LMS"])


class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None


@router.get("/departments")
async def list_departments(
    skip: int = 0, limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func
    count_res = await db.execute(select(func.count(Department.id)))
    total = count_res.scalar_one()

    result = await db.execute(select(Department).order_by(Department.name.asc()).offset(skip).limit(limit))
    deps = result.scalars().all()
    data = [{"id": str(d.id), "name": d.name, "description": d.description, "is_active": d.is_active} for d in deps]
    return {"data": data, "total": total}

@router.put("/departments/{dep_id}/toggle")
async def toggle_department(dep_id: str, admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.id == uuid.UUID(dep_id)))
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found")
    dep.is_active = not dep.is_active
    await db.commit()
    return {"status": "success", "is_active": dep.is_active}


@router.post("/departments")
async def create_department(
    req: DepartmentCreate,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    new_dep = Department(name=req.name, description=req.description)
    db.add(new_dep)
    try:
        await db.commit()
        await db.refresh(new_dep)
    except:
        await db.rollback()
        raise HTTPException(
            status_code=400, detail="Department already exists or invalid data"
        )
    return {"id": str(new_dep.id), "name": new_dep.name}


@router.post("/courses/generate")
async def generate_course(
    file: UploadFile = File(...),
    department_id: str = Form(...),
    level: str = Form(...),
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    content_bytes = await file.read()
    text = ""
    if file.filename.endswith(".pdf"):
        doc = fitz.open(stream=content_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text()
    else:
        text = content_bytes.decode("utf-8", errors="ignore")

    doc_record = Document(
        filename=file.filename,
        department_id=uuid.UUID(department_id),
        level=level,
        uploaded_by=admin.id,
    )
    db.add(doc_record)
    await db.flush()

    prompt = f"""
You are a senior corporate curriculum designer with expertise in adult learning theory and competency-based education.

Your task is to analyze the provided training document and synthesize it into a maximum of 5 distinct, well-structured lessons for an employee at the '{level}' level.

For each lesson, the content MUST include:
1. A concise learning objective (what the employee will be able to do after this lesson)
2. Core concept explanation (clear, jargon-free explanation with real workplace examples)
3. Key takeaways (3-5 bullet points summarizing the most critical knowledge)
4. A practical application scenario (a brief real-world situation where this knowledge applies)

IMPORTANT RULES:
- Each lesson content should be at least 250 words
- Use plain, engaging language appropriate for a {level}-level professional
- Do not use markdown formatting inside the content field
- Ensure lessons flow logically from foundational to advanced concepts
- Format your response EXACTLY as a JSON array. Each object MUST have exactly these two keys:
  "title": A clear, action-oriented lesson title
  "content": The full lesson content as described above
- Do NOT wrap the output in markdown code blocks. Output only the raw JSON array.

Document Text:
{text[:12000]}
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2500,
        temperature=0.4,
    )

    raw_lessons = response.choices[0].message.content.strip()
    try:
        if raw_lessons.startswith("```"):
            lines = raw_lessons.split("\\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_lessons = "\\n".join(lines)

        lessons = json.loads(raw_lessons)
        if len(lessons) > 5:
            lessons = lessons[:5]
    except Exception as e:
        print("Parsing Failure AI output:", e)
        lessons = [{"title": "Course Overview", "content": raw_lessons[:800]}]

    new_course = Course(
        document_id=doc_record.id,
        department_id=uuid.UUID(department_id),
        title=f"Course: {file.filename.split('.')[0]}",
        level=level,
        lessons=lessons,
        quiz_questions=[],  # Initialized ready for runtime evaluation
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)

    return {
        "course_id": str(new_course.id),
        "title": new_course.title,
        "lesson_count": len(lessons),
    }


@router.get("/courses")
async def list_assigned_courses(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Return all courses explicitly assigned to this employee via EmployeeCourseProgress.
    This is populated by the admin's /courses/{id}/assign endpoint.
    Falls back to department-wide courses if no direct assignments exist.
    """
    from models.lms_core import EmployeeCourseProgress

    # Primary: get ALL progress records for this employee (direct assignments)
    prog_result = await db.execute(
        select(EmployeeCourseProgress).where(
            EmployeeCourseProgress.employee_id == user.id
        )
    )
    # Primary: get ALL progress records for this employee (direct assignments)
    prog_result = await db.execute(
        select(EmployeeCourseProgress).where(
            EmployeeCourseProgress.employee_id == user.id
        )
    )
    progresses = prog_result.scalars().all()

    out = []
    seen_ids = set()

    # Add direct assignments
    for p in progresses:
        c_res = await db.execute(select(Course).where(Course.id == p.course_id))
        course = c_res.scalar_one_or_none()
        if course and course.is_active:
            seen_ids.add(str(course.id))
            out.append({
                "id": str(course.id),
                "title": course.title,
                "level": course.level,
                "lesson_count": len(course.lessons) if course.lessons else 0,
                "completed_lessons": len(p.completed_lessons) if isinstance(p.completed_lessons, list) else 0,
                "total_lessons": len(course.lessons) if course.lessons else 5,
                "status": p.status.value,
                "score": p.score if p.score is not None else 0,
                "correct_answers_count": p.correct_answers_count or 0,
                "total_questions_asked": p.total_questions_asked or 0,
                "is_active": course.is_active,
            })

    # Add department courses if not already seen
    if user.department_id:
        result = await db.execute(
            select(Course).where(
                Course.department_id == user.department_id,
                Course.is_active == True
            )
        )
        dept_courses = result.scalars().all()
        for c in dept_courses:
            if str(c.id) not in seen_ids:
                out.append({
                    "id": str(c.id),
                    "title": c.title,
                    "level": c.level,
                    "lesson_count": len(c.lessons) if c.lessons else 0,
                    "completed_lessons": 0,
                    "total_lessons": len(c.lessons) if c.lessons else 5,
                    "status": "not_started",
                    "score": 0,
                    "is_active": c.is_active,
                })

    return out


@router.get("/employee/metrics")
async def get_employee_metrics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns per-employee LMS metrics: completed, in_progress, avg_score, course_scores."""
    try:
        from models.lms_core import EmployeeCourseProgress
        prog_result = await db.execute(
            select(EmployeeCourseProgress).where(
                EmployeeCourseProgress.employee_id == user.id
            )
        )
        progresses = prog_result.scalars().all()

        completed = [p for p in progresses if p.status.value == "completed"]
        in_progress = [p for p in progresses if p.status.value == "in_progress"]
        scores = [p.score for p in completed if p.score is not None and p.score > 0]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0
        total = len(progresses)
        completion_rate = round(len(completed) / total * 100, 1) if total > 0 else 0

        course_breakdown = []
        for p in progresses:
            c_res = await db.execute(select(Course).where(Course.id == p.course_id))
            course = c_res.scalar_one_or_none()
            if course:
                course_breakdown.append({
                    "course_id": str(p.course_id),
                    "title": course.title,
                    "level": course.level,
                    "status": p.status.value,
                    "score": p.score or 0,
                    "completed_lessons": len(p.completed_lessons) if isinstance(p.completed_lessons, list) else 0,
                    "total_lessons": len(course.lessons) if course.lessons else 5, # Fallback to 5 if no lessons
                    "correct_answers_count": p.correct_answers_count or 0,
                    "total_questions_asked": p.total_questions_asked or 0,
                    "started_at": p.started_at.isoformat() if p.started_at else None,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                })

        return {
            "employee_id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "total_assigned": total,
            "completed": len(completed),
            "in_progress": len(in_progress),
            "avg_score": avg_score,
            "completion_rate": completion_rate,
            "course_breakdown": course_breakdown,
        }
    except Exception as e:
        print(f"Metrics error: {e}")
        return {
            "error": str(e),
            "total_assigned": 0,
            "completed": 0,
            "avg_score": 0,
            "completion_rate": 0,
            "course_breakdown": []
        }

@router.get("/courses/all")
async def list_all_courses(
    skip: int = 0, limit: int = 20, q: str | None = None,
    admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func
    query = select(Course)
    if q:
        query = query.where(Course.title.ilike(f"%{q}%"))
    
    count_res = await db.execute(select(func.count(Course.id)).select_from(query.subquery()))
    total = count_res.scalar_one()

    result = await db.execute(query.order_by(Course.created_at.desc()).offset(skip).limit(limit))
    courses = result.scalars().all()
    data = [{
        "id": str(c.id),
        "title": c.title,
        "department_id": str(c.department_id),
        "level": c.level,
        "is_active": c.is_active
    } for c in courses]
    return {"data": data, "total": total}

@router.put("/courses/{course_id}/toggle")
async def toggle_course(course_id: str, admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course).where(Course.id == uuid.UUID(course_id)))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.is_active = not course.is_active
    await db.commit()
    return {"status": "success", "is_active": course.is_active}

class AssignRequest(BaseModel):
    employee_ids: list[str]

@router.post("/courses/{course_id}/assign")
async def assign_course_to_employees(course_id: str, payload: AssignRequest, admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)):
    from models.lms_core import EmployeeCourseProgress
    cid = uuid.UUID(course_id)
    c_res = await db.execute(select(Course).where(Course.id == cid))
    course = c_res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    for emp_id in payload.employee_ids:
        uid = uuid.UUID(emp_id)
        # Check if already assigned
        existing = await db.execute(select(EmployeeCourseProgress).where(
            EmployeeCourseProgress.employee_id == uid,
            EmployeeCourseProgress.course_id == cid
        ))
        if not existing.scalar_one_or_none():
            p = EmployeeCourseProgress(employee_id=uid, course_id=cid, status="not_started", chat_history=[])
            db.add(p)
    await db.commit()
    return {"status": "success", "assigned_count": len(payload.employee_ids)}


@router.get("/courses/{course_id}")
async def get_course_details(
    course_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == uuid.UUID(course_id)))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    from models.lms_core import EmployeeCourseProgress
    p_res = await db.execute(select(EmployeeCourseProgress).where(
        EmployeeCourseProgress.employee_id == user.id,
        EmployeeCourseProgress.course_id == course.id
    ))
    progress = p_res.scalar_one_or_none()

    return {
        "id": str(course.id),
        "title": course.title,
        "level": course.level,
        "lessons": course.lessons,
        "is_active": course.is_active,
        "progress": {
            "status": progress.status.value if progress else "not_started",
            "score": progress.score if progress else 0,
            "correct_answers_count": progress.correct_answers_count if progress else 0,
            "total_questions_asked": progress.total_questions_asked if progress else 0,
        } if progress else None
    }


@router.get("/enrollments")
async def list_enrollments(
    skip: int = 0, limit: int = 10,
    admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)
):
    from models.lms_core import EmployeeCourseProgress
    from sqlalchemy import func
    # Joins to get employee and course names
    from sqlalchemy.orm import joinedload
    
    count_res = await db.execute(select(func.count(EmployeeCourseProgress.id)))
    total = count_res.scalar_one()

    result = await db.execute(
        select(EmployeeCourseProgress)
        .options(joinedload(EmployeeCourseProgress.employee), joinedload(EmployeeCourseProgress.course))
        .offset(skip).limit(limit)
    )
    progresses = result.scalars().all()
    
    data = []
    for p in progresses:
        data.append({
            "id": str(p.id),
            "employee_name": p.employee.full_name,
            "employee_id": str(p.employee_id),
            "course_title": p.course.title,
            "course_id": str(p.course_id),
            "status": p.status.value,
            "score": p.score,
            "started_at": p.started_at.isoformat() if p.started_at else None,
            "completed_lessons": p.completed_lessons,
            "total_time_seconds": p.total_time_seconds,
            "lesson_count": len(p.course.lessons) if p.course.lessons else 0
        })
    return {"data": data, "total": total}


class ChatMessage(BaseModel):
    message: str


@router.post("/courses/{course_id}/view")
async def track_course_view(
    course_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Tracks when an employee views a course material/page."""
    from models.lms_core import EmployeeCourseProgress
    cid = uuid.UUID(course_id)
    
    # Ensure entry exists
    result = await db.execute(
        select(EmployeeCourseProgress).where(
            EmployeeCourseProgress.employee_id == user.id,
            EmployeeCourseProgress.course_id == cid
        )
    )
    progress = result.scalar_one_or_none()
    if not progress:
        progress = EmployeeCourseProgress(employee_id=user.id, course_id=cid)
        db.add(progress)

    # Update activity
    progress.updated_at = datetime.utcnow()
    
    # Track lesson viewing (simple implementation: append if not there)
    # We could take lesson_id from body if we want more detail
    
    await db.commit()
    return {"status": "success"}


@router.post("/courses/{course_id}/chat")
async def quiz_chat(
    course_id: str,
    payload: ChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from models.lms_core import EmployeeCourseProgress

    c_res = await db.execute(select(Course).where(Course.id == uuid.UUID(course_id)))
    course = c_res.scalar_one_or_none()

    p_res = await db.execute(
        select(EmployeeCourseProgress).where(
            EmployeeCourseProgress.employee_id == user.id,
            EmployeeCourseProgress.course_id == course.id,
        )
    )
    progress = p_res.scalar_one_or_none()
    if not progress:
        progress = EmployeeCourseProgress(
            employee_id=user.id,
            course_id=course.id,
            status="in_progress",
            chat_history=[],
        )
        db.add(progress)
    
    # Increment total questions count
    progress.total_questions_asked = (progress.total_questions_asked or 0) + 1
    progress.updated_at = datetime.utcnow()
    await db.commit()

    if progress.status == "completed":
        return {
            "response": "Congratulations, you have already secured the Certificate for this course!",
            "score": progress.score,
            "passed": True,
        }

    history = list(progress.chat_history or [])
    history.append({"role": "user", "content": payload.message})

    system_prompt = f"""
    You are a strict LMS Evaluator testing the employee on the course: '{course.title}'.
    Course Lessons: {json.dumps(course.lessons)}
    Ask them questions dynamically based on these lessons. 
    
    PROGRESS TRACKING:
    - Every time the employee answers a question correctly/demonstrates mastery of a sub-topic, include "[PROGRESS: +1]" somewhere in your response.
    - If they answer incorrectly, do NOT include the marker.
    
    IMPORTANT DIRECTIVE: Determine their proficiency. Once you assess they know the material (must require answering at least 2 questions decently), output "[PASSED: XX%]" in your response where XX is a score from 70 to 100.
    If they do poorly, you can keep asking or output "[FAILED: XX%]" (below 70).
    Be conversational, clear, and act as a chat-style quiz bot.
    """

    messages = [{"role": "system", "content": system_prompt}] + history[-10:]
    gpt_res = client.chat.completions.create(
        model="gpt-3.5-turbo", messages=messages, max_tokens=600, temperature=0.6
    )
    reply = gpt_res.choices[0].message.content.strip()
    history.append({"role": "assistant", "content": reply})
    progress.chat_history = history

    # Update dynamic progress based on AI markers
    if "[PROGRESS: +1]" in reply:
        progress.correct_answers_count = (progress.correct_answers_count or 0) + 1
        current_list = list(progress.completed_lessons or [])
        current_list.append(f"milestone_{len(current_list) + 1}")
        progress.completed_lessons = current_list
        if progress.status == ProgressStatus.not_started:
            progress.status = ProgressStatus.in_progress
            progress.started_at = datetime.utcnow()

    passed = False
    if "[PASSED:" in reply:
        try:
            score_str = reply.split("[PASSED:")[1].split("%")[0].strip()
            score = float(score_str)
            if score >= 70:
                progress.status = "completed"
                progress.score = score
                passed = True
        except:
            pass

    await db.commit()
    return {
        "response": reply,
        "passed": passed,
        "score": progress.score,
        "history": progress.chat_history,
    }
