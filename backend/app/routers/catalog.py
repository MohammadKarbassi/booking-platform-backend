from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Accommodation, AccommodationStatus, AccommodationType, Amenity, City, PoiCategory, PointOfInterest, Province
from .accommodations import km_between

router = APIRouter(prefix="/catalog", tags=["Catalog"])


@router.get("/provinces")
def provinces(db: Session = Depends(get_db)):
    return [{"id": p.id, "name": p.name} for p in db.scalars(select(Province).order_by(Province.name))]


@router.get("/cities")
def cities(province_id: int | None = None, db: Session = Depends(get_db)):
    q = select(City).order_by(City.name)
    if province_id:
        q = q.where(City.province_id == province_id)
    return [{"id": c.id, "name": c.name, "province_id": c.province_id} for c in db.scalars(q)]


@router.get("/accommodation-types", summary="Villa, suite, cabin, ...")
def types(db: Session = Depends(get_db)):
    return [{"id": t.id, "name": t.name, "slug": t.slug} for t in db.scalars(select(AccommodationType))]


@router.get("/amenities")
def amenities(db: Session = Depends(get_db)):
    return [{"id": a.id, "name": a.name, "icon": a.icon} for a in db.scalars(select(Amenity))]


@router.get("/poi-categories")
def poi_categories(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name} for c in db.scalars(select(PoiCategory))]


@router.get("/points-of-interest", summary="Landmarks, each with how many active stays lie within radius_km")
def points_of_interest(category_id: int | None = None, radius_km: float = Query(30, gt=0, le=200),
                       db: Session = Depends(get_db)):
    q = select(PointOfInterest).order_by(PointOfInterest.name)
    if category_id:
        q = q.where(PointOfInterest.category_id == category_id)
    out = []
    for p in db.scalars(q):
        stays = db.scalar(select(func.count()).select_from(Accommodation).where(
            Accommodation.status == AccommodationStatus.active,
            km_between(p.latitude, p.longitude, Accommodation.latitude, Accommodation.longitude) <= radius_km))
        out.append({"id": p.id, "name": p.name, "category": p.category.name, "category_id": p.category_id,
                    "city": p.city.name, "latitude": float(p.latitude), "longitude": float(p.longitude),
                    "stays_nearby": stays})
    return out
