import os
import io
import csv
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
import crud
from security import hash_password, verify_password

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Lightweight migration: add the photo column to databases created before it existed
with engine.begin() as _conn:
    _cols = [r[1] for r in _conn.exec_driver_sql("PRAGMA table_info(visitors)")]
    if "photo" not in _cols:
        _conn.exec_driver_sql("ALTER TABLE visitors ADD COLUMN photo TEXT")

app = FastAPI(
    title="VisitorPass API",
    description="Visitor Management System REST API for organizations and front-desk security.",
    version="1.0.0"
)

# CORS configuration allowing cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed realistic demo data if database is empty
def seed_initial_data():
    db = next(get_db())
    try:
        count = db.query(models.Visitor).count()
        if count == 0:
            now = datetime.now()
            sample_records = [
                {
                    "visitor_id": "VP-20260930-1001",
                    "full_name": "Alexander Hayes",
                    "phone": "+1-555-0192",
                    "email": "alex.hayes@apextech.com",
                    "organization": "Apex Technologies",
                    "person_to_visit": "Sarah Jenkins (Engineering)",
                    "purpose": "Technical Architecture Review",
                    "id_type": "Passport",
                    "id_number": "P8921045",
                    "address": "742 Evergreen Terrace, Springfield",
                    "vehicle_number": "TX-992-AK",
                    "notes": "Requires visitor badge for 3rd floor server room",
                    "check_in": now - timedelta(hours=2, minutes=15),
                    "check_out": None,
                    "status": "Checked In"
                },
                {
                    "visitor_id": "VP-20260930-1002",
                    "full_name": "Elena Rostova",
                    "phone": "+1-555-0284",
                    "email": "elena.r@financesolutions.org",
                    "organization": "Finance Solutions LLC",
                    "person_to_visit": "Michael Chang (CFO)",
                    "purpose": "Quarterly Financial Audit",
                    "id_type": "Driver's License",
                    "id_number": "DL-55291-C",
                    "address": "120 Bay Street, Suite 400",
                    "vehicle_number": None,
                    "notes": "Escorted by security",
                    "check_in": now - timedelta(hours=3, minutes=40),
                    "check_out": now - timedelta(minutes=45),
                    "status": "Checked Out"
                },
                {
                    "visitor_id": "VP-20260930-1003",
                    "full_name": "Marcus Vance",
                    "phone": "+1-555-0377",
                    "email": "m.vance@cloudmatrix.io",
                    "organization": "Cloud Matrix Systems",
                    "person_to_visit": "David Miller (HR)",
                    "purpose": "Job Interview - Principal DevOps",
                    "id_type": "National ID",
                    "id_number": "NID-772183",
                    "address": "45 Market Boulevard",
                    "vehicle_number": "CA-441-MX",
                    "notes": "Candidate for senior cloud role",
                    "check_in": now - timedelta(minutes=55),
                    "check_out": None,
                    "status": "Checked In"
                },
                {
                    "visitor_id": "VP-20260930-1004",
                    "full_name": "Priya Sharma",
                    "phone": "+1-555-0419",
                    "email": "priya.s@logixlogistics.com",
                    "organization": "Logix Logistics",
                    "person_to_visit": "Rachel Green (Procurement)",
                    "purpose": "Vendor Contract Signing",
                    "id_type": "Driver's License",
                    "id_number": "DL-88124-B",
                    "address": "88 Industrial Way",
                    "vehicle_number": "NY-789-LL",
                    "notes": "Delivered hardcopy contract copies",
                    "check_in": now - timedelta(hours=4),
                    "check_out": now - timedelta(hours=1, minutes=10),
                    "status": "Checked Out"
                },
                {
                    "visitor_id": "VP-20260930-1005",
                    "full_name": "Daniel Kim",
                    "phone": "+1-555-0562",
                    "email": "dkim@quantumdevices.net",
                    "organization": "Quantum Devices Corp",
                    "person_to_visit": "Dr. Aris Thorne (R&D)",
                    "purpose": "Equipment Demonstration",
                    "id_type": "Employee ID",
                    "id_number": "QD-9902",
                    "address": "500 Silicon Alley",
                    "vehicle_number": "WA-102-QD",
                    "notes": "Carrying demo sensor equipment",
                    "check_in": now - timedelta(minutes=25),
                    "check_out": None,
                    "status": "Checked In"
                }
            ]

            for item in sample_records:
                v = models.Visitor(**item, created_at=item["check_in"])
                db.add(v)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Initial seed warning: {e}")
    finally:
        db.close()

seed_initial_data()

# ----------------- AUTH -----------------
# The admin account lives in the `users` table (password stored hashed).
# It is created on first startup from VP_ADMIN_USER / VP_ADMIN_PASS
# (defaults: admin / Visitor@123). Existing users are never overwritten.
def seed_admin_user():
    username = os.environ.get("VP_ADMIN_USER", "admin")
    password = os.environ.get("VP_ADMIN_PASS", "Visitor@123")
    db = next(get_db())
    try:
        if not db.query(models.User).filter(models.User.username == username).first():
            db.add(models.User(
                username=username,
                password_hash=hash_password(password),
                full_name="Administrator",
                role="admin",
            ))
            db.commit()
    finally:
        db.close()

seed_admin_user()

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == creds.username.strip()).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {"message": "Signed in.", "username": user.username, "full_name": user.full_name, "role": user.role}

# ----------------- VISITOR ENDPOINTS -----------------

@app.post("/api/visitors", response_model=schemas.VisitorResponse, status_code=status.HTTP_201_CREATED)
def register_visitor(visitor_in: schemas.VisitorCreate, db: Session = Depends(get_db)):
    """Register a new incoming visitor with automatic check-in time and unique Visitor ID."""
    try:
        new_visitor = crud.create_visitor(db, visitor_in)
        return new_visitor
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to register visitor: {str(e)}")

@app.get("/api/visitors/current", response_model=List[schemas.VisitorResponse])
def get_currently_inside_visitors(db: Session = Depends(get_db)):
    """Retrieve all visitors who are currently checked in and on premise."""
    return crud.get_currently_inside(db)

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """Retrieve summarized statistics for the front-desk dashboard."""
    stats = crud.get_dashboard_stats(db)
    return stats

@app.get("/api/reports", response_model=schemas.ReportResponse)
def get_reports(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status: 'Checked In', 'Checked Out', or 'all'"),
    db: Session = Depends(get_db)
):
    """Retrieve aggregated reporting figures and filtered visitor records."""
    data = crud.get_reports_data(db, start_date=start_date, end_date=end_date, status=status)
    return data

@app.get("/api/reports/export")
def export_reports_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Export filtered visitor records as a CSV file."""
    visitors = crud.get_visitors(db, limit=5000, status=status, start_date=start_date, end_date=end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "Visitor ID",
        "Full Name",
        "Phone",
        "Email",
        "Organization",
        "Person to Visit",
        "Purpose",
        "ID Type",
        "ID Number",
        "Vehicle Number",
        "Address",
        "Check-In Time",
        "Check-Out Time",
        "Duration",
        "Status",
        "Notes"
    ])

    for v in visitors:
        writer.writerow([
            v.visitor_id,
            v.full_name,
            v.phone,
            v.email,
            v.organization,
            v.person_to_visit,
            v.purpose,
            v.id_type,
            v.id_number,
            v.vehicle_number or "",
            v.address or "",
            v.check_in.strftime("%Y-%m-%d %H:%M:%S") if v.check_in else "",
            v.check_out.strftime("%Y-%m-%d %H:%M:%S") if v.check_out else "",
            v.duration,
            v.status,
            v.notes or ""
        ])

    csv_data = output.getvalue()
    filename = f"visitor_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/visitors", response_model=List[schemas.VisitorResponse])
def list_visitors(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Search by name, phone, visitor ID, or organization"),
    status: Optional[str] = Query(None, description="Filter by status ('Checked In', 'Checked Out')"),
    date: Optional[str] = Query(None, description="Filter by check-in date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Get all visitors with optional search and filters."""
    return crud.get_visitors(db, skip=skip, limit=limit, search=search, status=status, date_str=date)

@app.get("/api/visitors/{visitor_id}", response_model=schemas.VisitorResponse)
def get_visitor_details(visitor_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed information for a specific visitor."""
    visitor = crud.get_visitor(db, visitor_id)
    if not visitor:
        raise HTTPException(status_code=404, detail=f"Visitor '{visitor_id}' not found.")
    return visitor

@app.put("/api/visitors/{visitor_id}", response_model=schemas.VisitorResponse)
def update_visitor_details(visitor_id: str, visitor_in: schemas.VisitorUpdate, db: Session = Depends(get_db)):
    """Update visitor details."""
    visitor = crud.update_visitor(db, visitor_id, visitor_in)
    if not visitor:
        raise HTTPException(status_code=404, detail=f"Visitor '{visitor_id}' not found.")
    return visitor

@app.delete("/api/visitors/{visitor_id}")
def delete_visitor_record(visitor_id: str, db: Session = Depends(get_db)):
    """Delete a visitor record."""
    success = crud.delete_visitor(db, visitor_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Visitor '{visitor_id}' not found.")
    return {"message": f"Visitor record '{visitor_id}' has been permanently deleted.", "visitor_id": visitor_id}

@app.post("/api/visitors/{visitor_id}/checkout", response_model=schemas.VisitorCheckoutResponse)
def checkout_visitor_record(visitor_id: str, db: Session = Depends(get_db)):
    """Check out a visitor and automatically record check-out time and duration."""
    try:
        visitor, duration = crud.checkout_visitor(db, visitor_id)
        return {
            "message": f"Visitor {visitor.full_name} has successfully checked out.",
            "visitor_id": visitor.visitor_id,
            "check_out": visitor.check_out,
            "duration": duration,
            "visitor": visitor
        }
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during check out: {str(e)}")

# ----------------- STATIC FRONTEND MOUNTING -----------------
# Resolve frontend path — use the existing visitorpass/ folder
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "visitorpass"))

if os.path.exists(FRONTEND_DIR):
    # Mount visitorpass frontend at root so http://127.0.0.1:8000/ opens it
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    @app.get("/")
    def index_placeholder():
        return {"message": "VisitorPass API is online. visitorpass folder not found at ../visitorpass"}
