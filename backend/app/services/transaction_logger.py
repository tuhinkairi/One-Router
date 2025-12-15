import time
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import TransactionLog

class TransactionLogger:
    """Logs all API transactions for analytics"""

    async def log_request(
        self,
        db: AsyncSession,
        user_id: str,
        method: str,
        endpoint: str,
        request_data: dict,
        provider: str
    ) -> str:
        """Log outgoing request"""

        transaction_id = f"txn_{user_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        log_entry = TransactionLog(
            user_id=user_id,
            transaction_id=transaction_id,
            service_name=provider,
            endpoint=endpoint,
            http_method=method,
            request_payload=request_data,
            status="pending"
        )

        db.add(log_entry)
        return transaction_id

    async def log_response(
        self,
        db: AsyncSession,
        transaction_id: str,
        response_data: dict,
        status_code: int,
        response_time_ms: int
    ):
        """Update log with response"""
        # Find and update the log entry
        result = await db.execute(
            select(TransactionLog).where(TransactionLog.transaction_id == transaction_id)
        )
        log_entry = result.scalar_one_or_none()

        if log_entry:
            # Update the log entry
            from sqlalchemy import update
            await db.execute(
                update(TransactionLog)
                .where(TransactionLog.transaction_id == transaction_id)
                .values(
                    response_payload=response_data,
                    response_status=status_code,
                    response_time_ms=response_time_ms,
                    status="completed" if status_code < 400 else "failed"
                )
            )