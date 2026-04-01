from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", protected_namespaces=("settings_",))

    groq_api_key: str
    llm_model: str = "llama-3.3-70b-versatile"
    app_name: str = "Tharseo AI"
    database_url: str = "postgresql://tharseo:tharseo_ai_2026@localhost/tharseo_ai"
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours
    teams_webhook_secret: str = ""  # Set after creating Teams outgoing webhook
    admin_secret: str = ""  # Required to create new accounts when registration is closed
    registration_open: bool = False  # Set to True temporarily to allow self-registration


settings = Settings()
