# Vehicle Parking Management System V2

A multi-user application for managing parking lots, parking spots, and parked vehicles. Built with Flask backend and Vue.js frontend, using Redis for caching and Celery for background jobs.

## Features

### Admin Features
- Create/Edit/Delete parking lots
- Manage parking spots (auto-created based on lot capacity)
- View all registered users
- View parking spot status and parked vehicle details
- Summary charts for parking lots/spots
- Trigger scheduled tasks manually

### User Features
- Register/Login with JWT authentication
- Choose available parking lot (spot auto-allocated)
- Book parking spot with **real-time time tracking**
- **Live duration counter** and **current cost display** during parking
- Release/vacate parking spot with **automatic time-based billing**
- View booking summary with charts showing hours parked
 - Review historical spending, duration, and rating data in dashboards

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Flask 3.1.0 |
| Frontend | Vue.js 2 (CDN) |
| Database | SQLite |
| Caching | **Redis** (required) |
| Background Jobs | **Celery** (required) |
| Styling | Bootstrap 5 |
| Charts | Chart.js |
| Authentication | Flask-JWT-Extended |

## Project Structure

```
PROJECT/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # SQLAlchemy models
│   ├── tasks.py            # Celery background tasks
│   ├── celery_config.py    # Celery configuration
│   ├── requirements.txt    # Python dependencies
│   └── instance/           # SQLite database (parking.db)
├── frontend/
│   ├── index.html          # SPA entry point
│   ├── app.js              # Vue root instance
│   ├── components/
│   │   └── Navbar.js
│   ├── pages/              # All page components
│   └── utils/
│       ├── api.js          # API configuration
│       └── router.js       # Vue Router
├── start.sh                # Start all services
├── stop.sh                 # Stop all services
└── README.md
```

## Prerequisites

1. **Python 3.9+**
2. **Redis Server** (required for caching and Celery)
   ```bash
   # macOS
   brew install redis

   ```

## Installation & Setup

### 1. Clone and Navigate
```bash
cd PROJECT
```

### 2. Quick Start (Recommended)
```bash
chmod +x start.sh stop.sh
./start.sh
```

This will:
- Start Redis server
- Create virtual environment
- Install dependencies
- Start Celery worker (background tasks)
- Start Celery beat (scheduled tasks)
- Start Flask server

### 3. Manual Setup

#### Start Redis
```bash
redis-server

```
brew services start redis
brew services restart redis
redis-cli shutdown
#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Start Celery Worker
```bash
cd backend
celery -A app.celery worker --loglevel=info
```

#### Start Celery Beat (Scheduler)
```bash
cd backend
celery -A app.celery beat --loglevel=info
```

#### Start Flask Server
```bash
cd backend
python3 app.py
```

### 4. Access the Application
- **Web App**: http://localhost:5001
- **API Docs (Swagger)**: http://localhost:5001/apidocs

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin@parking.com | admin123 |

## Dev Notes From Daily Use

- After pulling fresh migrations, run `flask db upgrade` inside `backend/venv` or the login screen will keep 500-ing.
- Redis likes to linger after crashes; `redis-cli ping` is my quick smoke test before blaming Vue.
- When tweaking charts, hot-reload via `python app.py` + `npm` isn’t a thing here, so I keep the browser devtools console pinned to catch the Flask prints.

## Background Jobs (Celery)

### Scheduled Tasks (Celery Beat)

| Task | Schedule | Description |
|------|----------|-------------|
| Daily Reminders | 6:00 PM daily | Sends reminders to users who haven't booked recently |
| Monthly Report | 1st of each month | Sends HTML activity report to all users via email |

### Manual Trigger (Admin Only)
```bash
# Trigger daily reminders
curl -X POST http://localhost:5001/admin/trigger/daily-reminders \
  -H "Authorization: Bearer <token>"

# Trigger monthly report
curl -X POST http://localhost:5001/admin/trigger/monthly-report \
  -H "Authorization: Bearer <token>"
```

## Redis Caching

The following endpoints are cached:
- `/customer/summary` - 5 minutes
- `/admin/summary` - 5 minutes

### Check Cache Status
```bash
curl http://localhost:5001/api/cache/status
```

### Check Celery Status
```bash
curl http://localhost:5001/api/celery/status
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | User registration |
| POST | `/login` | User login |
| POST | `/admin/login` | Admin login |

### Customer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/customer/profile` | Get/Update profile |
| GET | `/customer/dashboard` | Dashboard data with parking lots |
| POST | `/customer/book/<lot_id>` | Book a parking spot |
| PUT | `/customer/booking/<id>/complete` | Complete booking with rating |
| PUT | `/customer/booking/<id>/cancel` | Cancel booking |
| POST | `/customer/search` | Search parking lots |
| GET | `/customer/summary` | Booking summary (cached) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard statistics |
| GET/POST | `/admin/lots` | List/Create parking lots |
| GET/PUT/DELETE | `/admin/lots/<id>` | Manage specific lot |
| GET | `/admin/users` | List all users |
| PUT | `/admin/users/<id>/<field>/<value>` | Update user status |
| POST | `/admin/search` | Search all entities |
| GET | `/admin/summary` | Analytics summary (cached) |
| POST | `/admin/trigger/daily-reminders` | Trigger reminders manually |
| POST | `/admin/trigger/monthly-report` | Trigger report manually |

## Email Configuration

For email notifications to work, configure these environment variables:

```bash
export MAIL_SERVER=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
```

For Google Chat webhooks:
```bash
export GOOGLE_CHAT_WEBHOOK_URL=your-webhook-url
```

## ⏱️ Time-Based Pricing Feature (NEW)

### Overview
The system now tracks **exact parking duration** and calculates charges based on **actual time spent**:

- ✅ **Real-time tracking**: Dashboard shows live duration (updates every minute)
- ✅ **Fair billing**: Pay only for actual time used (rounded up to next hour)
- ✅ **Live cost display**: See current estimated cost while parking
- ✅ **Analytics**: View total hours parked and average cost per hour

### How It Works

1. **Book Parking** → System records exact start time
2. **During Parking** → Dashboard displays:
   - Live duration: "3h 45m"
   - Current cost: "₹180"
3. **Complete Booking** → System calculates:
   - Actual hours: 3.75 hours
   - Hours charged: 4 hours (rounded up)
   - Total amount: 4 × ₹45 = ₹180
4. **View Analytics** → See hours parked and cost efficiency

### Example
```
Started: 10:00 AM
Completed: 1:45 PM
-----------------------
Actual Time: 3.75 hours
Charged: 4 hours
Amount: ₹180
```

📖 **For detailed documentation, see:**
- `TIME_TRACKING_FEATURE.md` - Implementation details
- `TIME_TRACKING_FLOW.md` - Visual flow diagrams
- `QUICK_START.md` - Complete setup guide

## Stopping Services

```bash
./stop.sh
```

Or manually:
```bash
pkill -f "celery -A app.celery"
pkill -f "python3 app.py"
redis-cli shutdown
```

## Database Schema

### Users
- id, username, password, role, approved, blocked, created_at

### CustomerProfile
- id, user_id, full_name, phone_no, address, pincode, vehicle_number, vehicle_type

### ParkingLot
- id, name, address, pincode, price_per_hour, max_spots, description, is_active

### ParkingSpot
- id, lot_id, spot_number, status (A/O/R/M), spot_type

### Booking
- id, customer_id, lot_id, spot_id, vehicle_number, status
- booking_date, start_time, end_time, hours_booked
- **actual_hours** (Float), **hours_charged** (Integer) - NEW: Time tracking
- total_amount, amount_paid, rating, remarks

## License

MIT License
https://drive.google.com/file/d/1Oc33PLsyZK62_4RO2oWiSkeoq2R82Knt/view?usp=sharing
