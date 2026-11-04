from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AccommodationType, Amenity, City, PoiCategory, Province

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
