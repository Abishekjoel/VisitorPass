from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

class VisitorBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full Name of the visitor")
    phone: str = Field(..., min_length=7, max_length=20, description="Contact phone number")
    email: str = Field(..., max_length=100, description="Email address")
    organization: str = Field(..., min_length=2, max_length=150, description="Company or Organization")
    person_to_visit: str = Field(..., min_length=2, max_length=100, description="Host / person to visit")
    purpose: str = Field(..., min_length=2, max_length=150, description="Purpose of visit")
    id_type: str = Field(..., min_length=2, max_length=50, description="Identification type")
    id_number: str = Field(..., min_length=2, max_length=50, description="Identification number")
    address: Optional[str] = Field(None, max_length=255, description="Residential or office address")
    vehicle_number: Optional[str] = Field(None, max_length=50, description="Vehicle registration number")
    notes: Optional[str] = Field(None, description="Additional notes or remarks")
    photo: Optional[str] = Field(None, max_length=700000, description="Visitor photo as a data URL")

    @field_validator("photo")
    @classmethod
    def validate_photo(cls, v):
        if v and not re.match(r"^data:image/(jpeg|png|webp);base64,", v):
            raise ValueError("Photo must be a JPEG, PNG or WebP data URL.")
        return v or None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v_clean = v.strip().lower()
        # Basic robust email regex validation
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(pattern, v_clean):
            raise ValueError("Invalid email address format.")
        return v_clean

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, v: str) -> str:
        v_clean = v.strip()
        # Allows digits, spaces, hyphens, plus sign, min 7 digits
        digits = re.sub(r"\D", "", v_clean)
        if len(digits) < 7:
            raise ValueError("Phone number must contain at least 7 digits.")
        return v_clean

class VisitorCreate(VisitorBase):
    pass

class VisitorUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=7, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    organization: Optional[str] = Field(None, min_length=2, max_length=150)
    person_to_visit: Optional[str] = Field(None, min_length=2, max_length=100)
    purpose: Optional[str] = Field(None, min_length=2, max_length=150)
    id_type: Optional[str] = Field(None, min_length=2, max_length=50)
    id_number: Optional[str] = Field(None, min_length=2, max_length=50)
    address: Optional[str] = None
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None

class VisitorResponse(VisitorBase):
    id: int
    visitor_id: str
    check_in: datetime
    check_out: Optional[datetime] = None
    status: str
    created_at: datetime
    duration: str

    class Config:
        from_attributes = True

class VisitorCheckoutResponse(BaseModel):
    message: str
    visitor_id: str
    check_out: datetime
    duration: str
    visitor: VisitorResponse

class DashboardStats(BaseModel):
    total_visitors_today: int
    currently_inside: int
    visitors_checked_out_today: int
    total_visits: int
    recent_visitors: List[VisitorResponse]

class ReportSummary(BaseModel):
    total_visitors: int
    daily_visitors: int
    weekly_visitors: int
    monthly_visitors: int
    currently_inside: int
    checked_out_visitors: int

class ReportResponse(BaseModel):
    summary: ReportSummary
    visitors: List[VisitorResponse]
