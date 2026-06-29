from datetime import datetime
from typing import Any, Literal

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from pydantic.functional_validators import BeforeValidator
from typing_extensions import Annotated


def _validate_object_id(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, str) and ObjectId.is_valid(value):
        return value
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class MongoModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        protected_namespaces=(),
    )


class UserBase(MongoModel):
    name: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    role: Literal["doctor", "admin"] = "doctor"
    specialization: str | None = Field(default=None, max_length=120)
    status: Literal["Aktif", "Nonaktif"] = "Aktif"
    lastLogin: datetime | None = None


class UserCreate(UserBase):
    name: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    specialization: str | None = Field(default=None, max_length=120)
    status: Literal["Aktif", "Nonaktif"] = "Aktif"
    role: Literal["doctor"] = "doctor"


class UserUpdate(MongoModel):
    name: str | None = Field(default=None, min_length=3, max_length=150)
    specialization: str | None = Field(default=None, max_length=120)
    status: Literal["Aktif", "Nonaktif"] | None = None


class UserInDB(UserBase):
    id: PyObjectId | None = Field(default=None, alias="_id")
    password: str
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class UserPublic(UserBase):
    id: PyObjectId | None = Field(default=None, alias="_id")
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class AnalysisBase(MongoModel):
    patientId: str = Field(..., min_length=3, max_length=50)
    patientName: str = Field(..., min_length=3, max_length=150)
    imageFileId: PyObjectId | None = None
    heatmapFileId: PyObjectId | None = None
    imageFormat: Literal["jpg", "png", "dicom"] | None = None
    imageSizeBytes: int | None = None
    aiPrediction: Literal["Malignant", "Benign", "Follow-up"] | None = None
    confidenceScore: float | None = Field(default=None, ge=0, le=100)
    biradsCategory: str | None = Field(default=None, max_length=4)
    biradsAiSuggestion: str | None = Field(default=None, max_length=4)
    doctorNotes: str | None = None
    recommendation: str | None = None
    status: Literal["processing", "pending_validation", "validated"] = "processing"
    modelUsed: PyObjectId | None = None
    validatedBy: PyObjectId | None = None
    validatedAt: datetime | None = None
    gradcamData: dict[str, Any] | None = None


class AnalysisCreate(AnalysisBase):
    pass


class AnalysisValidate(MongoModel):
    biradsCategory: str = Field(..., min_length=1, max_length=4)
    doctorNotes: str = Field(..., min_length=3)
    recommendation: str | None = None


class AnalysisUploadResponse(MongoModel):
    id: str = Field(alias="_id")
    patientId: str
    patientName: str
    status: str
    aiPrediction: str | None = None
    confidenceScore: float | None = None
    biradsAiSuggestion: str | None = None
    imageUrl: str
    heatmapUrl: str | None = None
    modelUsed: str | None = None


class AnalysisInDB(AnalysisBase):
    id: PyObjectId | None = Field(default=None, alias="_id")
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class AIModelBase(MongoModel):
    modelId: str = Field(..., min_length=3, max_length=120)
    label: str = Field(..., min_length=3, max_length=150)
    architecture: str = Field(..., min_length=3, max_length=100)
    accuracy: float = Field(..., ge=0, le=100)
    fileId: PyObjectId | None = None
    fileSizeBytes: int | None = None
    isActive: bool = False
    notes: str | None = None
    uploadedBy: PyObjectId | None = None


class AIModelCreate(AIModelBase):
    pass


class AIModelInDB(AIModelBase):
    id: PyObjectId | None = Field(default=None, alias="_id")
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class AuditLogInDB(MongoModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    actor: PyObjectId | None = None
    action: str = Field(..., min_length=3, max_length=100)
    targetId: PyObjectId | None = None
    targetType: Literal["analysis", "user", "ai_model"] | None = None
    meta: dict[str, Any] | None = None
    ip: str | None = None
    userAgent: str | None = None
    createdAt: datetime | None = None


class RefreshTokenInDB(MongoModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    userId: PyObjectId
    token: str
    expiresAt: datetime
    createdAt: datetime | None = None


class LoginRequest(MongoModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class RefreshResponse(MongoModel):
    accessToken: str


class LoginResponse(RefreshResponse):
    user: UserPublic


class UserListResponse(MongoModel):
    total: int
    data: list[UserPublic]


class AnalysisListResponse(MongoModel):
    total: int
    page: int
    limit: int
    data: list[dict[str, Any]]


class DoctorCreateRequest(MongoModel):
    full_name: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    specialization: str = Field(..., min_length=2, max_length=120)
    status: Literal["Aktif", "Nonaktif"] = "Aktif"

    @model_validator(mode="after")
    def validate_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("password dan confirm_password harus sama")
        return self


class DoctorUpdateRequest(MongoModel):
    full_name: str | None = Field(default=None, min_length=3, max_length=150)
    email: EmailStr | None = None
    specialization: str | None = Field(default=None, min_length=2, max_length=120)
    status: Literal["Aktif", "Nonaktif"] | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    confirm_password: str | None = Field(default=None, min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_optional_password_match(self):
        if self.password is None and self.confirm_password is None:
            return self
        if not self.password or not self.confirm_password or self.password != self.confirm_password:
            raise ValueError("password dan confirm_password harus diisi dan sama")
        return self


class DoctorResponse(MongoModel):
    id: str = Field(alias="_id")
    full_name: str
    email: EmailStr
    specialization: str | None = None
    created_at: datetime | None = None
    is_active: bool
    status: Literal["Aktif", "Nonaktif"]


class DoctorListResponse(MongoModel):
    total: int
    data: list[DoctorResponse]


class AIModelUploadRequest(MongoModel):
    model_id: str = Field(..., min_length=3, max_length=120)
    architecture: str = Field(..., min_length=2, max_length=100)
    display_name: str = Field(..., min_length=3, max_length=150)
    validation_accuracy: float = Field(..., ge=0, le=100)
    admin_notes: str | None = None


class AIModelResponse(MongoModel):
    id: str = Field(alias="_id")
    model_id: str
    architecture: str
    display_name: str
    validation_accuracy: float
    file_id: str
    file_size: float
    upload_date: datetime
    is_active: bool
    admin_notes: str | None = None


class OAuth2LoginResponse(MongoModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    name: str
    email: EmailStr


class WorkspaceValidateRequest(MongoModel):
    final_birads: str = Field(..., min_length=1, max_length=4)
    clinical_findings: str | None = None
    follow_up_recommendation: str | None = None


class DashboardStatsResponse(MongoModel):
    analyses_today: int
    pending_validation: int
    total_patients: int
