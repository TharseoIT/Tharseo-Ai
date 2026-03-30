from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    model_name: str = "llama-3.3-70b-versatile"
    app_name: str = "Tharseo AI"

    class Config:
        env_file = ".env"


settings = Settings()
