"""End-to-end flow against the real PostgreSQL (wipes and reseeds the DB)."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app import seed
from app.main import app

seed.run(reset=True)
c = TestClient(app)


def login(phone: str) -> dict:
    code = c.post("/auth/otp/request", json={"phone": phone}).json()["debug_code"]
    assert c.post("/auth/otp/verify", json={"phone": phone, "code": "00000" if code != "00000" else "11111"}).status_code == 400
    r = c.post("/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def next_weekday(wd: int, after: int = 20) -> date:
    d = date.today() + timedelta(days=after)
    return d + timedelta(days=(wd - d.weekday()) % 7)


@pytest.fixture(scope="module")
def users():
    return {"admin": login(seed.ADMIN_PHONE), "a": login("09121111111"), "b": login("09122222222")}


def villa_id():
    return next(a["id"] for a in c.get("/accommodations").json()["items"] if a["slug"] == "ramsar-beach-villa")


def test_pricing_rules():
    vid = villa_id()
    sat = next_weekday(5)  # Saturday night: base
    q = c.get(f"/accommodations/{vid}/quote", params={"check_in": sat, "check_out": sat + timedelta(days=7),
                                                       "guests": 5}).json()
    # 7 nights -> long_stay -10% on weekdays, but weekend (+20%, priority 10) beats long_stay (priority 5)
    by_source = {b["source"] for b in q["breakdown"]}
    assert by_source == {"long_stay", "weekend"}
    assert q["extra_guest_fee_per_night"] == 3_000_000
    thu = next(b for b in q["breakdown"] if date.fromisoformat(b["night"]).weekday() == 3)
    assert thu["price"] == 48_000_000 + 3_000_000
    hol = date.today() + timedelta(days=10)
    hq = c.get(f"/accommodations/{vid}/quote", params={"check_in": hol, "check_out": hol + timedelta(days=1)}).json()
    assert hq["breakdown"][0]["source"] == "holiday" and hq["total_price"] == 60_000_000


def test_booking_payment_waitlist_review(users):
    vid, ci = villa_id(), next_weekday(5, after=30)
    co = ci + timedelta(days=3)
    body = {"accommodation_id": vid, "check_in": str(ci), "check_out": str(co), "guests_count": 4}

    r = c.post("/bookings", json=body, headers=users["a"])
    assert r.status_code == 201, r.text
    ba = r.json()
    assert ba["status"] == "pending_payment" and len(ba["nights"]) == 3

    # overlapping booking refused by the booking_nights primary key
    overlap = {**body, "check_in": str(ci + timedelta(days=2)), "check_out": str(co + timedelta(days=2))}
    assert c.post("/bookings", json=overlap, headers=users["b"]).status_code == 409
    # check-out day is free for the next guest
    adj = {**body, "check_in": str(co), "check_out": str(co + timedelta(days=1))}
    assert c.post("/bookings", json=adj, headers=users["b"]).status_code == 201

    # search hides the villa for taken dates
    ids = [a["id"] for a in c.get("/accommodations", params={"check_in": ci, "check_out": co}).json()["items"]]
    assert vid not in ids

    # pay
    p = c.post("/payments/start", json={"booking_id": ba["id"]}, headers=users["a"]).json()
    assert p["amount"] == ba["total_price"]
    cb = c.get("/payments/callback", params={"authority": p["authority"], "status": "OK"}).json()
    assert cb["booking_status"] == "confirmed"

    # B joins the waitlist with upfront payment
    w = c.post("/waitlist", json=body, headers=users["b"])
    assert w.status_code == 201, w.text
    wp = c.post("/payments/start", json={"waitlist_request_id": w.json()["id"]}, headers=users["b"]).json()
    assert c.get("/payments/callback", params={"authority": wp["authority"], "status": "OK"}).json()["auto_booked"] == []

    # A cancels -> refund + B auto-booked
    cancel = c.post(f"/bookings/{ba['id']}/cancel", headers=users["a"]).json()
    assert cancel["status"] == "cancelled" and cancel["payments"][0]["status"] == "refunded"
    [auto_id] = cancel["waitlist_bookings_created"]
    bb = c.get(f"/bookings/{auto_id}", headers=users["b"]).json()
    assert bb["status"] == "confirmed" and bb["check_in"] == str(ci)
    assert c.get("/waitlist/me", headers=users["b"]).json()[0]["status"] == "fulfilled"

    # review only after completion, admin approves, rating shows on detail
    assert c.post(f"/bookings/{auto_id}/review", json={"rating": 5}, headers=users["b"]).status_code == 409
    assert c.post(f"/admin/bookings/{auto_id}/complete", headers=users["admin"]).status_code == 200
    rv = c.post(f"/bookings/{auto_id}/review", json={"rating": 5, "comment": "عالی"}, headers=users["b"])
    assert rv.status_code == 201
    assert c.post(f"/bookings/{auto_id}/review", json={"rating": 4}, headers=users["b"]).status_code == 409
    c.patch(f"/admin/reviews/{rv.json()['id']}", json={"status": "approved", "admin_reply": "ممنون"},
            headers=users["admin"])
    assert c.get(f"/accommodations/{vid}").json()["rating"] == {"average": 5.0, "count": 1}


def test_concurrent_booking_same_night(users):
    vid, ci = villa_id(), next_weekday(5, after=60)
    body = {"accommodation_id": vid, "check_in": str(ci), "check_out": str(ci + timedelta(days=1)), "guests_count": 2}
    phones = [f"0913000000{i}" for i in range(5)]
    heads = [login(p) for p in phones]
    with ThreadPoolExecutor(5) as ex:
        codes = sorted(ex.map(lambda h: TestClient(app).post("/bookings", json=body, headers=h).status_code, heads))
    assert codes == [201, 409, 409, 409, 409]


def test_admin_and_misc(users):
    assert c.get("/admin/bookings", headers=users["a"]).status_code == 403
    assert c.get("/bookings/me").status_code == 401
    vid = villa_id()
    assert c.put(f"/favorites/{vid}", headers=users["a"]).status_code == 204
    assert [f["id"] for f in c.get("/favorites", headers=users["a"]).json()] == [vid]
    near = c.get(f"/accommodations/{vid}/nearby", params={"radius_km": 5}).json()
    assert near[0]["distance_km"] < 2 and len(near) == 3
    blk = next_weekday(1, after=40)
    c.put(f"/admin/accommodations/{vid}/calendar", headers=users["admin"],
          json={"start": str(blk), "end": str(blk + timedelta(days=1)), "is_blocked": True})
    r = c.post("/bookings", headers=users["a"], json={"accommodation_id": vid, "check_in": str(blk),
                                                     "check_out": str(blk + timedelta(days=1)), "guests_count": 2})
    assert r.status_code == 409
    bad = c.post("/admin/accommodations", headers=users["admin"], json={
        "host_id": 1, "type_id": 1, "city_id": 1, "title": "x", "slug": "x", "address": "x", "latitude": 1,
        "longitude": 1, "base_capacity": 5, "max_capacity": 2, "base_price_per_night": 1})
    assert bad.status_code == 422
