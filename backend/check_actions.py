import asyncio
from sqlalchemy import select, func
from core.database import AsyncSessionLocal
from models.workflow_models import AIAction, ActionStatus


async def check_actions():
    async with AsyncSessionLocal() as session:
        pending_count = (
            await session.execute(
                select(func.count(AIAction.action_id)).where(
                    AIAction.status == ActionStatus.PENDING
                )
            )
        ).scalar()
        total_count = (
            await session.execute(select(func.count(AIAction.action_id)))
        ).scalar()

        print(f"Pending actions: {pending_count}")
        print(f"Total actions: {total_count}")

        if total_count > 0:
            latest_actions = (
                (
                    await session.execute(
                        select(AIAction).order_by(AIAction.created_at.desc()).limit(5)
                    )
                )
                .scalars()
                .all()
            )
            for a in latest_actions:
                print(
                    f"Action: {a.action_type}, Status: {a.status}, Created: {a.created_at}"
                )


if __name__ == "__main__":
    asyncio.run(check_actions())
