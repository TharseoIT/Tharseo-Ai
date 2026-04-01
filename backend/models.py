from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)           # Display name e.g. "Casey Carter"
    email = Column(String(255), unique=True, index=True, nullable=True)  # Login identifier
    password_hash = Column(String(255), nullable=False)
    user_role = Column(String(20), nullable=False, default="security")  # admin, executive, sales, security
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_id = Column(String(20), nullable=False)  # 'lead' or 'cloud'
    role = Column(String(10), nullable=False)       # 'user' or 'ai'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="messages")
