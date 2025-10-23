import json
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
# from sqlalchemy_bind_manager import SQLAlchemyConfig

TYPE_ENVIRONMENT = Literal["local", "production"]


class NodeCategoryConfig(BaseModel):
    name: str
    icon: Optional[str] = None


class UIConfig(BaseModel):
    node_categories: list[NodeCategoryConfig] = Field(default_factory=list)
    color_schemes: Dict[str, Any] = Field(default_factory=dict)


class DramatiqConfig(BaseModel):
    REDIS_URL: Optional[str] = None


class AuthConfig(BaseModel):
    JWT_ALGORITHM: str = "RS256"
    JWKS_URL: Optional[str] = None


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(env_nested_delimiter="__")

    APP_NAME: str = "IR-Graph"
    CORS_ORIGINS: list[str] = Field(default_factory=list)
    CORS_METHODS: list[str] = ["*"]
    CORS_HEADERS: list[str] = ["*"]
    # AUTH: AuthConfig = AuthConfig()
    # DRAMATIQ: DramatiqConfig = DramatiqConfig()
    DEBUG: bool = False
    ENVIRONMENT: TYPE_ENVIRONMENT = "local"
    UI_CONFIG: UIConfig = Field(default_factory=UIConfig)
    # SQLALCHEMY_CONFIG: Dict[str, SQLAlchemyConfig] = dict(
    #     default=SQLAlchemyConfig(
    #         engine_url="mysql+asyncmy://corinna:gioieiiere@127.0.0.1/backend?charset=utf8mb4",
    #         async_engine=True,
    #     ),
    # )
    # OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None
    # OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Optional[str] = None
    # OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: Optional[str] = None
    # OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: Optional[str] = None

    def load_ui_config(self, path: str = "data/config.json") -> None:
        try:
            with open(path, "r") as f:
                config_data = json.load(f)
                self.UI_CONFIG = UIConfig.model_validate(config_data)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Warning: Could not load UI config from {path}. Using defaults. Error: {e}")