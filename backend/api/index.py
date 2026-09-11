"""
Portfolio Backend — FastAPI on Vercel.

- GET  /api/content            → full portfolio content (public)
- PUT  /api/content/{section}  → upsert a section (admin only)
- POST /api/upload             → upload image/pdf to Supabase storage (admin only)
- POST /api/feedback           → submit feedback (public)
- GET  /api/feedback           → list feedback (public, approved only; admin sees all)
"""

import os
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Depends, Header
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
    return resp.json()


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


# ---------------------------------------------------------------- content
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


@app.put("/api/admin/credentials")
async def update_credentials(body: Credentials, user: dict = Depends(require_admin)):
    """Admin can change their own username / email / password at any time."""
    uid = user["id"]
    patch: dict = {}
    if body.email:
        patch["email"] = body.email
        patch["email_confirm"] = True
    if body.password:
        if len(body.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        patch["password"] = body.password
    if body.username:
        meta = dict(user.get("user_metadata") or {})
        meta["username"] = body.username
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


@app.get("/api/content")
async def get_content():
    rows = await sb("portfolio_content", params={"select": "section,data,updated_at"})
    return {r["section"]: r["data"] for r in rows}


@app.put("/api/content/{section}")
async def upsert_section(section: str, body: dict, _: dict = Depends(require_admin)):
    await sb("portfolio_content", "POST",
             json_body={"section": section, "data": body},
             headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
    return {"ok": True, "section": section}


@app.get("/api/content/{section}")
async def get_section(section: str):
    rows = await sb("portfolio_content",
                    params={"select": "section,data", "section": f"eq.{section}"})
    if not rows:
        raise HTTPException(status_code=404, detail="Section not found")
    return rows[0]["data"]


@app.delete("/api/content/{section}")
async def delete_section(section: str, _: dict = Depends(require_admin)):
    await sb("portfolio_content", "DELETE", params={"section": f"eq.{section}"})
    return {"ok": True, "section": section}


# ---------------------------------------------------------------- upload
@app.post("/api/upload")
async def upload(filename: str, content_type: str, data: bytes,
                 _: dict = Depends(require_admin)):
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
async def approve_feedback(body: ApproveBody, _: dict = Depends(require_admin)):
    await sb("feedback", "PATCH",
             json_body={"approved": body.approved},
             params={"id": f"eq.{body.id}"},
             headers={"Prefer": "return=minimal"})
    return {"ok": True}
