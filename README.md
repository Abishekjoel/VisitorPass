# VisitorPass

A visitor management system for front desks and security teams. Register visitors, issue printable passes, track who is on premises, check people out, and export reports.

**Stack:** FastAPI · SQLAlchemy · SQLite · plain HTML/CSS/JavaScript (no build step)

## Features

- **Secure login** with hashed passwords
- **Visitor registration** with unique visitor IDs, ID details, vehicle number, notes and optional photo
- **Printable visitor pass** with print-only styling
- **Check-in / check-out** with automatic time and duration tracking
- **Dashboard** with live stats, recent visitors and a weekly chart
- **Currently inside** view of everyone on premises
- **Search and filters** by name, phone, visitor ID, organization, status or date
- **Reports** with date/status filters and **CSV export**
- **REST API** with interactive docs (Swagger UI)

## Project structure

```
VisitorPass/
├── backend/          FastAPI app (main.py, crud.py, models.py, schemas.py,
│                     security.py, database.py, seed_admin.py)
├── visitorpass/      Frontend served by the backend at /
└── frontend/         Earlier frontend version (API-driven pages)
```

## Getting started

Requires Python 3.10+.

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000> and sign in with the default admin account:

| Username | Password     |
|----------|--------------|
| `admin`  | `Visitor@123` |

> Change the default password before using this anywhere real.

On first start the app creates the SQLite database, seeds a few sample visitors, and creates the admin user.

### Configuration

| Variable        | Purpose                          | Default       |
|-----------------|----------------------------------|---------------|
| `VP_ADMIN_USER` | Admin username created on first run | `admin`       |
| `VP_ADMIN_PASS` | Admin password created on first run | `Visitor@123` |

To create or reset an admin login:

```powershell
python seed_admin.py                     # admin / Visitor@123
python seed_admin.py myuser MyPassword1  # custom credentials
```

## API

Interactive docs are available at <http://127.0.0.1:8000/docs> while the server runs.

| Method | Endpoint                          | Description                        |
|--------|-----------------------------------|------------------------------------|
| POST   | `/api/auth/login`                 | Sign in                            |
| POST   | `/api/visitors`                   | Register a visitor (auto check-in) |
| GET    | `/api/visitors`                   | List visitors (search, filters)    |
| GET    | `/api/visitors/current`           | Visitors currently inside          |
| GET    | `/api/visitors/{id}`              | Visitor details                    |
| PUT    | `/api/visitors/{id}`              | Update a visitor                   |
| DELETE | `/api/visitors/{id}`              | Delete a visitor record            |
| POST   | `/api/visitors/{id}/checkout`     | Check out a visitor                |
| GET    | `/api/dashboard/stats`            | Dashboard statistics               |
| GET    | `/api/reports`                    | Filtered report data               |
| GET    | `/api/reports/export`             | Download report as CSV             |

## Notes

- Data is stored in `backend/visitorpass.db` (SQLite), which is git-ignored.
- CORS is currently open (`*`) for development; restrict it for production.
- The QR block on the pass is decorative, not machine readable.
