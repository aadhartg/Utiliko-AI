from fastapi import APIRouter
from controllers.ai_workflow_controller import router as ai_workflow_router
from controllers.audit_controller import router as audit_router
from controllers.monitor_controller import router as monitor_router
from controllers.upload_controller import router as upload_router

# Create a new APIRouter instance to combine all routers
api_router = APIRouter()

# Inlcude all routes from the ai workflow controller
api_router.include_router(ai_workflow_router)

# Inlcude all routes from the audit controller
api_router.include_router(audit_router)

# Include all routes from the monitor controller
api_router.include_router(monitor_router)

# Include all routes from the upload controller
api_router.include_router(upload_router)

# Include Auth controller
from controllers.auth_controller import router as auth_router

api_router.include_router(auth_router)

# Include core LMS portal controller
from controllers.lms_controller import router as lms_router

api_router.include_router(lms_router)
