"""
Portfolio Backend — FastAPI on Vercel.

- GET  /api/content            → full portfolio content (public)
- PUT  /api/content/{section}  → upsert a section (admin only)
- POST /api/upload             → upload image/pdf to Supabase storage (admin only)
- POST /api/feedback           → submit feedback (public)
- GET  /api/feedback           → list feedback (public, approved only; admin sees all)
"""

import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage

import httpx
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
STORAGE_BUCKET = os.environ.get("STORAGE_BUCKET", "posts")

app = FastAPI(title="Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers
async def sb(path: str, method: str = "GET", *, json_body=None, data=None,
             headers=None, params=None):
    """Call the Supabase REST API with the service role key."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    base_headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    base_headers.update(headers or {})
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(method, url, headers=base_headers,
                                    json=json_body, params=params,
                                    content=data)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    # Write operations use return=minimal and respond with an empty body
    return resp.json() if resp.content else None


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Validate the Supabase JWT sent by the client and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY,
                     "Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return resp.json()


async def get_user_factors(uid: str) -> list:
    """Fetch the user's enrolled MFA factors via the Supabase admin API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
                                headers={"apikey": SUPABASE_SERVICE_KEY,
                                         "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"})
    if resp.status_code != 200:
        return []
    return resp.json().get("factors", []) or []


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Only users whose id is in the admin_profiles table may edit.
    If the admin has verified TOTP factors, the session must be AAL2
    (i.e. they completed the Google Authenticator challenge)."""
    uid = user.get("id")
    rows = await sb("admin_profiles",
                    params={"select": "id", "user_id": f"eq.{uid}"})
    if not rows:
        raise HTTPException(status_code=403,
                            detail="Not an admin. Ask the site owner to run the "
                                   "SQL in supabase_schema.sql to promote your account.")
    verified_totp = [f for f in await get_user_factors(uid)
                     if f.get("type") == "totp" and f.get("status") == "verified"]
    if verified_totp:
        amr = [m.get("method", "") for m in (user.get("amr") or [])]
        if not any(m.startswith("mfa") for m in amr):
            raise HTTPException(status_code=403,
                                detail="MFA verification required: sign in at /admanaccess "
                                       "with your Google Authenticator code.")
    return user


async def require_admin_verified(user: dict = Depends(require_admin)) -> dict:
    """For content edits: the admin must have entered a fresh verification
    code (valid for 2 hours after it was confirmed at /admanaccess)."""
    until = (user.get("user_metadata") or {}).get("otp_until")
    if not until or datetime.fromisoformat(until) < datetime.utcnow():
        raise HTTPException(status_code=403,
                            detail="Verification code required — sign in at /admanaccess "
                                   "and enter your code to edit.")
    return user


async def admin_patch_user(uid: str, patch: dict):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.put(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
                                headers={"apikey": SUPABASE_SERVICE_KEY,
                                         "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
                                json=patch)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


def smtp_send(to: str, subject: str, body: str):
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pw = os.environ.get("SMTP_PASSWORD", "")
    if not user or not pw:
        raise HTTPException(status_code=503,
                            detail="Email delivery is not configured yet "
                                   "(SMTP_USER / SMTP_PASSWORD missing on the server).")
    msg = EmailMessage()
    msg["From"] = os.environ.get("SMTP_FROM", user)
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(host, port, timeout=30) as s:
        s.starttls()
        s.login(user, pw)
        s.send_message(msg)


def _otp_hash(code: str) -> str:
    return hashlib.sha256((SUPABASE_SERVICE_KEY[:16] + code.strip()).encode()).hexdigest()


async def formsubmit(to: str, subject: str, body: str):
    """Free email relay (formsubmit.co) — needs no account. The very first
    email to an address asks the receiver to click one activation link;
    after that, all messages arrive normally."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"https://formsubmit.co/ajax/{to}",
                              json={"_subject": subject, "Message": body,
                                    "_template": "box"})
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Email relay refused the message")


async def admin_notify_target() -> str:
    """The email that should receive notifications (admin-set, falls back
    to the admin account email)."""
    admins = await sb("admin_profiles", params={"select": "user_id"})
    if not admins:
        raise HTTPException(status_code=503, detail="No admin configured yet")
    uid = admins[0]["user_id"]
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
                             headers={"apikey": SUPABASE_SERVICE_KEY,
                                      "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"})
    if r.status_code != 200:
        raise HTTPException(status_code=503, detail="Could not resolve the admin email")
    u = r.json()
    return (u.get("user_metadata") or {}).get("notify_email") or u.get("email")


async def deliver_email(to: str, subject: str, body: str) -> str:
    """SMTP when configured, FormSubmit relay otherwise. Returns the channel."""
    if os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"):
        smtp_send(to, subject, body)
        return "smtp"
    await formsubmit(to, subject, body)
    return "formsubmit"


# ---------------------------------------------------------------- content
# Admin-edited content lives in its own table ("admin_content") once the
# admin runs backend/admin_content_table.sql in Supabase. Until then the
# code falls back to "portfolio_content" automatically.
CONTENT_TABLE: Optional[str] = None


async def resolve_content_table() -> str:
    global CONTENT_TABLE
    if CONTENT_TABLE:
        return CONTENT_TABLE
    try:
        await sb("admin_content", params={"select": "section", "limit": 1})
        CONTENT_TABLE = "admin_content"
    except HTTPException:
        CONTENT_TABLE = "portfolio_content"
    return CONTENT_TABLE


class SignupBody(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""


@app.post("/api/auth/signup")
async def auth_signup(body: SignupBody):
    """Public signup. Creates the account pre-confirmed so visitors are
    never blocked by confirmation emails that may not arrive."""
    import re
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", body.email or ""):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(body.password or "") < 6 or len(body.password) > 16:
        raise HTTPException(status_code=400, detail="Password must be 6 to 16 characters.")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{SUPABASE_URL}/auth/v1/admin/users",
                              headers={"apikey": SUPABASE_SERVICE_KEY,
                                       "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
                              json={"email": body.email, "password": body.password,
                                    "email_confirm": True,
                                    "user_metadata": {"name": body.name or ""}})
    if r.status_code not in (200, 201):
        if "already" in r.text.lower() or "registered" in r.text.lower():
            raise HTTPException(status_code=409,
                                detail="This email is already registered — try logging in instead.")
        raise HTTPException(status_code=502, detail="Could not create the account right now. Try again.")
    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.get("/api/me")
async def me(user: dict = Depends(get_current_user)):
    rows = await sb("admin_profiles",
                    params={"select": "id", "user_id": f"eq.{user['id']}"})
    meta = user.get("user_metadata") or {}
    return {"email": user.get("email"), "is_admin": bool(rows),
            "username": meta.get("username") or meta.get("name") or ""}


class Credentials(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    notify_email: Optional[str] = None


@app.put("/api/admin/credentials")
async def update_credentials(body: Credentials, user: dict = Depends(require_admin_verified)):
    """Admin can change their own username / email / password /
    feedback-notification email at any time."""
    uid = user["id"]
    patch: dict = {}
    meta = dict(user.get("user_metadata") or {})
    if body.email:
        patch["email"] = body.email
        patch["email_confirm"] = True
    if body.password:
        if len(body.password) < 6 or len(body.password) > 16:
            raise HTTPException(status_code=400, detail="Password must be 6 to 16 characters")
        patch["password"] = body.password
    if body.username:
        meta["username"] = body.username
    if body.notify_email:
        meta["notify_email"] = body.notify_email
    if meta != (user.get("user_metadata") or {}):
        patch["user_metadata"] = meta
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.put(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
                                headers={"apikey": SUPABASE_SERVICE_KEY,
                                         "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
                                json=patch)
    if resp.status_code not in (200,):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"ok": True}


class CodeBody(BaseModel):
    code: str


@app.post("/api/admin/2fa/send")
async def send_2fa_code(user: dict = Depends(require_admin)):
    """Generate a 4-digit code, store it hashed on the admin account
    (5-minute expiry) and email it to the admin's address."""
    code = f"{secrets.randbelow(10000):04d}"
    r = await admin_patch_user(user["id"], {"user_metadata": {
        "otp_hash": _otp_hash(code),
        "otp_exp": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
        "otp_tries": 0,
    }})
    meta = r.get("user_metadata") or {}
    try:
        via = await deliver_email(user.get("email"), "Your portfolio admin verification code",
                                  f"Your verification code is: {code}\n\n"
                                  f"It expires in 5 minutes.\nIf you did not request this, ignore this email.")
        return {"ok": True, "sent_to": user.get("email"), "via": via,
                "phone_on_file": meta.get("phone", "")}
    except Exception:
        # No delivery channel available: demo mode — hand the code to the
        # admin directly (they already passed the username+password gate).
        return {"ok": True, "demo": True, "code": code,
                "detail": "Email delivery is not available yet."}


@app.post("/api/admin/2fa/verify")
async def verify_2fa_code(body: CodeBody, user: dict = Depends(require_admin)):
    meta = user.get("user_metadata") or {}
    if not meta.get("otp_hash") or not meta.get("otp_exp"):
        raise HTTPException(status_code=400, detail="No code was requested. Start again at /admanaccess.")
    if datetime.fromisoformat(meta["otp_exp"]) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired — request a new one.")
    if meta.get("otp_tries", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many wrong attempts — request a new code.")
    if _otp_hash(body.code) != meta.get("otp_hash"):
        await admin_patch_user(user["id"], {"user_metadata": {"otp_tries": meta.get("otp_tries", 0) + 1}})
        raise HTTPException(status_code=400, detail="Wrong code — check the email and try again.")
    await admin_patch_user(user["id"], {"user_metadata": {
        "otp_hash": None, "otp_exp": None, "otp_tries": 0,
        "otp_until": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
    }})
    return {"ok": True}


@app.get("/api/content")
async def get_content():
    table = await resolve_content_table()
    rows = await sb(table, params={"select": "section,data,updated_at"})
    return {r["section"]: r["data"] for r in rows}


@app.put("/api/content/{section}")
async def upsert_section(section: str, body: dict, _: dict = Depends(require_admin_verified)):
    table = await resolve_content_table()
    await sb(table, "POST",
             json_body={"section": section, "data": body},
             headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
    return {"ok": True, "section": section}


@app.get("/api/content/{section}")
async def get_section(section: str):
    table = await resolve_content_table()
    rows = await sb(table,
                    params={"select": "section,data", "section": f"eq.{section}"})
    if not rows:
        raise HTTPException(status_code=404, detail="Section not found")
    return rows[0]["data"]


@app.delete("/api/content/{section}")
async def delete_section(section: str, _: dict = Depends(require_admin_verified)):
    table = await resolve_content_table()
    await sb(table, "DELETE", params={"section": f"eq.{section}"})
    return {"ok": True, "section": section}


# ---------------------------------------------------------------- upload
@app.post("/api/upload")
async def upload(request: Request, filename: str,
                 content_type: str = "application/octet-stream",
                 _: dict = Depends(require_admin_verified)):
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if not filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = f"{datetime.utcnow():%Y%m%d%H%M%S}_{filename}"
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{path}"
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            url,
            headers={"apikey": SUPABASE_SERVICE_KEY,
                     "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                     "Content-Type": content_type or "application/octet-stream",
                     "x-upsert": "true"},
            content=data,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{path}"
    return {"url": public_url, "path": path}


# ---------------------------------------------------------------- feedback
async def notify_admin_of_feedback(name: str, role: Optional[str], message: str, rating: Optional[int]):
    """Email the admin about new feedback. Uses their notify_email
    (settable from the admin page) or falls back to the account email.
    Never fails the feedback submission itself."""
    try:
        to = await admin_notify_target()
        await deliver_email(to, "New portfolio feedback received",
                            f"New feedback on your portfolio:\n\n"
                            f"From: {name}{(' (' + role + ')') if role else ''}\n"
                            f"Rating: {'*' * (rating or 5)}\n\n{message}")
    except Exception:
        pass


class ContactBody(BaseModel):
    name: str
    email: Optional[str] = ""
    message: str


@app.post("/api/contact")
async def contact_message(body: ContactBody):
    """Visitor contact form — delivered to the admin's notification email."""
    to = await admin_notify_target()
    text = (f"Portfolio contact form\n\nFrom: {body.name}"
            + (f" <{body.email}>" if body.email else "")
            + f"\n\n{body.message}")
    try:
        await deliver_email(to, "New portfolio contact message", text)
    except Exception:
        raise HTTPException(status_code=502,
                            detail="The message could not be delivered right now. Please try again later.")
    return {"ok": True}


class Feedback(BaseModel):
    name: str
    role: Optional[str] = ""
    message: str
    rating: Optional[int] = 5


@app.post("/api/feedback")
async def create_feedback(fb: Feedback):
    await sb("feedback", "POST",
             json_body=fb.dict(),
             headers={"Prefer": "return=minimal"})
    await notify_admin_of_feedback(fb.name, fb.role, fb.message, fb.rating)
    return {"ok": True}


@app.get("/api/feedback")
async def list_feedback(user: dict = Depends(get_current_user)):
    rows = await sb("feedback", params={"select": "*"})
    is_admin = bool(await sb("admin_profiles",
                             params={"select": "id", "user_id": f"eq.{user['id']}"}))
    if is_admin:
        return rows
    return [r for r in rows if r.get("approved")]


class ApproveBody(BaseModel):
    id: int
    approved: bool


@app.post("/api/feedback/approve")
async def approve_feedback(body: ApproveBody, _: dict = Depends(require_admin_verified)):
    await sb("feedback", "PATCH",
             json_body={"approved": body.approved},
             params={"id": f"eq.{body.id}"},
             headers={"Prefer": "return=minimal"})
    return {"ok": True}
