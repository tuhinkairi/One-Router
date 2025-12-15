from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .user import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSONB, nullable=False)
    signature = Column(String, nullable=True)
    processed = Column(Boolean, default=False)
    processed_at = Column(TIMESTAMP, nullable=True)
    related_txn_id = Column(UUID(as_uuid=True), ForeignKey("transaction_logs.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_webhook_events_user_created', 'user_id', 'created_at'),
    )
