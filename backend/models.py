from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base

class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visitor_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False, index=True)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(100), nullable=False, index=True)
    organization = Column(String(150), nullable=False)
    address = Column(String(255), nullable=True)
    person_to_visit = Column(String(100), nullable=False)
    purpose = Column(String(150), nullable=False)
    id_type = Column(String(50), nullable=False)
    id_number = Column(String(50), nullable=False)
    vehicle_number = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    photo = Column(Text, nullable=True)  # resized JPEG data URL
    
    # Timestamps
    check_in = Column(DateTime, default=datetime.now, nullable=False)
    check_out = Column(DateTime, nullable=True)
    status = Column(String(30), default="Checked In", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    @property
    def duration(self) -> str:
        """Calculate and return human-readable visit duration."""
        if not self.check_in:
            return "N/A"
        
        end_time = self.check_out if self.check_out else datetime.now()
        # Handle naive vs aware datetime if needed
        try:
            diff = end_time - self.check_in
            total_seconds = int(diff.total_seconds())
            if total_seconds < 0:
                return "0 mins"
            
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            
            if hours > 0:
                return f"{hours}h {minutes}m"
            elif minutes > 0:
                return f"{minutes} mins"
            else:
                return "< 1 min"
        except Exception:
            return "N/A"

    def to_dict(self):
        return {
            "id": self.id,
            "visitor_id": self.visitor_id,
            "full_name": self.full_name,
            "phone": self.phone,
            "email": self.email,
            "organization": self.organization,
            "address": self.address,
            "person_to_visit": self.person_to_visit,
            "purpose": self.purpose,
            "id_type": self.id_type,
            "id_number": self.id_number,
            "vehicle_number": self.vehicle_number,
            "notes": self.notes,
            "photo": self.photo,
            "check_in": self.check_in.isoformat() if self.check_in else None,
            "check_out": self.check_out.isoformat() if self.check_out else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "duration": self.duration
        }


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)  # pbkdf2_sha256$iterations$salt$hash
    full_name = Column(String(100), nullable=False, default="Administrator")
    role = Column(String(30), nullable=False, default="admin")
    created_at = Column(DateTime, default=datetime.now, nullable=False)
