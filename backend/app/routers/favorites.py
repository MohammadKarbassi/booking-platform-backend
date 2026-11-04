from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Favorite, User
from ..routers.accommodations import get_active
from ..security import current_user
from ..serializers import acc_card

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("")
def list_favorites(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [acc_card(f.accommodation) for f in db.scalars(select(Favorite).where(Favorite.user_id == user.id)
                                                          .order_by(Favorite.created_at.desc()))]


@router.put("/{acc_id}", status_code=204, summary="Add to favorites (idempotent)")
def add(acc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    get_active(db, acc_id)
    db.merge(Favorite(user_id=user.id, accommodation_id=acc_id))
    db.commit()


@router.delete("/{acc_id}", status_code=204)
def remove(acc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if f := db.get(Favorite, (user.id, acc_id)):
        db.delete(f)
        db.commit()
