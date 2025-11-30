
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)  # Email
    password = db.Column(db.String(255), nullable=False)  # Hashed password
    role = db.Column(db.String(20), nullable=False, default='customer')  # 'admin' or 'customer'
    approved = db.Column(db.Boolean, default=True)  # Admin approval status
    blocked = db.Column(db.Boolean, default=False)  # Block status
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    profile = db.relationship('CustomerProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    bookings = db.relationship('Booking', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def as_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'approved': self.approved,
            'blocked': self.blocked,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CustomerProfile(db.Model):
    __tablename__ = 'customer_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    phone_no = db.Column(db.String(15))
    address = db.Column(db.String(255))
    pincode = db.Column(db.String(10))
    vehicle_number = db.Column(db.String(20))
    vehicle_type = db.Column(db.String(50), default='4-wheeler')  # '2-wheeler', '4-wheeler'

    def as_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'phone_no': self.phone_no,
            'address': self.address,
            'pincode': self.pincode,
            'vehicle_number': self.vehicle_number,
            'vehicle_type': self.vehicle_type
        }


class ParkingLot(db.Model):
    __tablename__ = 'parking_lots'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)  # Prime location name
    address = db.Column(db.String(255), nullable=False)
    pincode = db.Column(db.String(10), nullable=False)
    price_per_hour = db.Column(db.Float, nullable=False)
    max_spots = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    spots = db.relationship('ParkingSpot', backref='lot', lazy='dynamic', cascade='all, delete-orphan')

    bookings = db.relationship('Booking', backref='lot', lazy='dynamic', cascade='all, delete-orphan')

    def get_available_spots(self):

        return self.spots.filter_by(status='A').count()

    def get_occupied_spots(self):

        return self.spots.filter_by(status='O').count()

    def sync_spots(self):

        current_count = self.spots.count()
        if current_count < self.max_spots:
            for i in range(current_count, self.max_spots):
                spot = ParkingSpot(lot_id=self.id, spot_number=f"S{i+1}", status='A')
                db.session.add(spot)
        elif current_count > self.max_spots:

            extra_spots = self.spots.filter_by(status='A').limit(current_count - self.max_spots).all()
            for spot in extra_spots:
                db.session.delete(spot)

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'pincode': self.pincode,
            'price_per_hour': self.price_per_hour,
            'max_spots': self.max_spots,
            'description': self.description,
            'is_active': self.is_active,
            'available_spots': self.get_available_spots(),
            'occupied_spots': self.get_occupied_spots(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ParkingSpot(db.Model):

    __tablename__ = 'parking_spots'

    id = db.Column(db.Integer, primary_key=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lots.id'), nullable=False)
    spot_number = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(1), default='A')  # 'A', 'O', 'R', 'M'
    spot_type = db.Column(db.String(20), default='regular')  # 'regular', 'handicap', 'ev'


    bookings = db.relationship('Booking', backref='spot', lazy='dynamic')

    def as_dict(self):
        return {
            'id': self.id,
            'lot_id': self.lot_id,
            'spot_number': self.spot_number,
            'status': self.status,
            'spot_type': self.spot_type
        }


class Booking(db.Model):

    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lots.id'), nullable=False)
    spot_id = db.Column(db.Integer, db.ForeignKey('parking_spots.id'), nullable=True)

    vehicle_number = db.Column(db.String(20), nullable=False)
    vehicle_type = db.Column(db.String(50), default='4-wheeler')

    status = db.Column(db.String(20), default='requested')


    booking_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)

    hours_booked = db.Column(db.Integer, default=1)
    actual_hours = db.Column(db.Float) 
    hours_charged = db.Column(db.Integer) 
    total_amount = db.Column(db.Float, default=0.0)
    amount_paid = db.Column(db.Float, default=0.0)

    remarks = db.Column(db.Text)  
    rating = db.Column(db.Integer)  

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def calculate_amount(self, price_per_hour):

        self.total_amount = self.hours_booked * price_per_hour
        return self.total_amount

    def as_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'lot_id': self.lot_id,
            'spot_id': self.spot_id,
            'vehicle_number': self.vehicle_number,
            'vehicle_type': self.vehicle_type,
            'status': self.status,
            'booking_date': self.booking_date.isoformat() if self.booking_date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'actual_end_time': self.actual_end_time.isoformat() if self.actual_end_time else None,
            'hours_booked': self.hours_booked,
            'actual_hours': self.actual_hours,
            'hours_charged': self.hours_charged,
            'total_amount': self.total_amount,
            'amount_paid': self.amount_paid,
            'remarks': self.remarks,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
