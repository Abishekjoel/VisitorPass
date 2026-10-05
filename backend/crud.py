import random
from datetime import datetime, timedelta, time
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_
from models import Visitor
from schemas import VisitorCreate, VisitorUpdate

def generate_visitor_id(db: Session) -> str:
    """Generate a unique human-friendly visitor ID like VP-YYYYMMDD-XXXX."""
    date_prefix = datetime.now().strftime("%Y%m%d")
    
    # Try sequential/random combination to ensure uniqueness
    for _ in range(50):
        suffix = f"{random.randint(1000, 9999)}"
        cand_id = f"VP-{date_prefix}-{suffix}"
        exists = db.query(Visitor).filter(Visitor.visitor_id == cand_id).first()
        if not exists:
            return cand_id
            
    # Fallback to timestamp microsecond
    return f"VP-{datetime.now().strftime('%Y%m%d%H%M%S')}"

def get_visitor(db: Session, visitor_id_or_pk: str) -> Optional[Visitor]:
    """Retrieve visitor by custom visitor_id string (e.g. VP-2026...) or numeric primary key."""
    visitor = db.query(Visitor).filter(Visitor.visitor_id == visitor_id_or_pk).first()
    if not visitor and visitor_id_or_pk.isdigit():
        visitor = db.query(Visitor).filter(Visitor.id == int(visitor_id_or_pk)).first()
    return visitor

def get_visitors(
    db: Session,
    skip: int = 0,
    limit: int = 500,
    search: Optional[str] = None,
    status: Optional[str] = None,
    date_str: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Visitor]:
    """Fetch visitors with multi-criteria filtering and search."""
    query = db.query(Visitor)

    # Search filter (name, phone, visitor_id, organization, person to visit)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Visitor.full_name.ilike(search_term),
                Visitor.phone.ilike(search_term),
                Visitor.visitor_id.ilike(search_term),
                Visitor.organization.ilike(search_term),
                Visitor.person_to_visit.ilike(search_term)
            )
        )

    # Status filter
    if status and status.lower() != "all":
        query = query.filter(Visitor.status == status)

    # Single date filter
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_of_day = datetime.combine(target_date, time.min)
            end_of_day = datetime.combine(target_date, time.max)
            query = query.filter(Visitor.check_in.between(start_of_day, end_of_day))
        except ValueError:
            pass

    # Date range filter
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Visitor.check_in >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Visitor.check_in < end_dt)
        except ValueError:
            pass

    return query.order_by(Visitor.check_in.desc()).offset(skip).limit(limit).all()

def create_visitor(db: Session, visitor_in: VisitorCreate) -> Visitor:
    """Create and persist a new visitor record."""
    new_visitor_id = generate_visitor_id(db)
    now = datetime.now()

    db_visitor = Visitor(
        visitor_id=new_visitor_id,
        full_name=visitor_in.full_name.strip(),
        phone=visitor_in.phone.strip(),
        email=visitor_in.email.strip().lower(),
        organization=visitor_in.organization.strip(),
        person_to_visit=visitor_in.person_to_visit.strip(),
        purpose=visitor_in.purpose.strip(),
        id_type=visitor_in.id_type.strip(),
        id_number=visitor_in.id_number.strip(),
        address=visitor_in.address.strip() if visitor_in.address else None,
        vehicle_number=visitor_in.vehicle_number.strip() if visitor_in.vehicle_number else None,
        notes=visitor_in.notes.strip() if visitor_in.notes else None,
        photo=visitor_in.photo,
        check_in=now,
        check_out=None,
        status="Checked In",
        created_at=now
    )
    db.add(db_visitor)
    db.commit()
    db.refresh(db_visitor)
    return db_visitor

def update_visitor(db: Session, visitor_id: str, visitor_in: VisitorUpdate) -> Optional[Visitor]:
    """Update existing visitor record."""
    visitor = get_visitor(db, visitor_id)
    if not visitor:
        return None

    update_data = visitor_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if isinstance(value, str):
                value = value.strip()
            setattr(visitor, field, value)

    db.commit()
    db.refresh(visitor)
    return visitor

def delete_visitor(db: Session, visitor_id: str) -> bool:
    """Delete a visitor record."""
    visitor = get_visitor(db, visitor_id)
    if not visitor:
        return False
    db.delete(visitor)
    db.commit()
    return True

def checkout_visitor(db: Session, visitor_id: str) -> Tuple[Visitor, str]:
    """Check out a visitor and calculate visit duration."""
    visitor = get_visitor(db, visitor_id)
    if not visitor:
        raise KeyError(f"Visitor with ID '{visitor_id}' not found.")
    
    if visitor.status == "Checked Out":
        raise ValueError(f"Visitor '{visitor.full_name}' ({visitor.visitor_id}) has already been checked out at {visitor.check_out.strftime('%I:%M %p')}.")

    now = datetime.now()
    visitor.check_out = now
    visitor.status = "Checked Out"
    db.commit()
    db.refresh(visitor)
    
    return visitor, visitor.duration

def get_currently_inside(db: Session) -> List[Visitor]:
    """Get all visitors currently inside the premises."""
    return db.query(Visitor).filter(Visitor.status == "Checked In").order_by(Visitor.check_in.desc()).all()

def get_dashboard_stats(db: Session) -> dict:
    """Calculate aggregated stats for the dashboard."""
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    today_end = datetime.combine(now.date(), time.max)

    total_visitors_today = db.query(Visitor).filter(
        Visitor.check_in.between(today_start, today_end)
    ).count()

    currently_inside = db.query(Visitor).filter(
        Visitor.status == "Checked In"
    ).count()

    visitors_checked_out_today = db.query(Visitor).filter(
        and_(
            Visitor.status == "Checked Out",
            Visitor.check_out.between(today_start, today_end)
        )
    ).count()

    total_visits = db.query(Visitor).count()

    recent_visitors = db.query(Visitor).order_by(Visitor.check_in.desc()).limit(8).all()

    return {
        "total_visitors_today": total_visitors_today,
        "currently_inside": currently_inside,
        "visitors_checked_out_today": visitors_checked_out_today,
        "total_visits": total_visits,
        "recent_visitors": recent_visitors
    }

def get_reports_data(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
) -> dict:
    """Generate reports data with summary counters and filtered visitor list."""
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # General overview metrics
    total_visitors = db.query(Visitor).count()
    daily_visitors = db.query(Visitor).filter(Visitor.check_in >= today_start).count()
    weekly_visitors = db.query(Visitor).filter(Visitor.check_in >= week_start).count()
    monthly_visitors = db.query(Visitor).filter(Visitor.check_in >= month_start).count()
    currently_inside = db.query(Visitor).filter(Visitor.status == "Checked In").count()
    checked_out_visitors = db.query(Visitor).filter(Visitor.status == "Checked Out").count()

    # Filtered visitors for the requested criteria
    filtered_visitors = get_visitors(
        db,
        limit=1000,
        status=status,
        start_date=start_date,
        end_date=end_date
    )

    return {
        "summary": {
            "total_visitors": total_visitors,
            "daily_visitors": daily_visitors,
            "weekly_visitors": weekly_visitors,
            "monthly_visitors": monthly_visitors,
            "currently_inside": currently_inside,
            "checked_out_visitors": checked_out_visitors
        },
        "visitors": filtered_visitors
    }
