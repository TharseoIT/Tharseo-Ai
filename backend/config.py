from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", protected_namespaces=("settings_",))

    groq_api_key: str
    llm_model: str = "llama-3.3-70b-versatile"
    app_name: str = "Tharseo AI"


settings = Settings()
