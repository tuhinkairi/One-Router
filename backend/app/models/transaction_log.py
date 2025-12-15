from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .user import Base


class TransactionLog(Base):
    __tablename__ = "transaction_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True)
    transaction_id = Column(String, unique=True, nullable=False)
    service_name = Column(String, nullable=False)
    provider_txn_id = Column(String, nullable=True)
    endpoint = Column(String, nullable=False)
    http_method = Column(String, nullable=False)
    request_payload = Column(JSONB, nullable=True)
    response_payload = Column(JSONB, nullable=True)
    response_status = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    error_message = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    environment = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_transaction_logs_user_created', 'user_id', 'created_at'),
        Index('idx_transaction_logs_transaction_id', 'transaction_id'),
        Index('idx_transaction_logs_service_name', 'service_name'),
    )
