"""Tests for FairFarm authentication / authorization dependencies.

These use a minimal in-memory fake of the async Supabase client so the trusted
role and email-verification rules can be tested without network access.
"""

import asyncio
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

import pytest
from fastapi import HTTPException

from app.dependencies import get_current_user, require_role, require_warehouse


class _FakeQuery:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows
        self._filters: Dict[str, Any] = {}

    def select(self, *_args: Any) -> "_FakeQuery":
        return self

    def eq(self, column: str, value: Any) -> "_FakeQuery":
        self._filters[column] = value
        return self

    async def execute(self) -> SimpleNamespace:
        data = [r for r in self._rows if all(r.get(k) == v for k, v in self._filters.items())]
        return SimpleNamespace(data=data)


class _FakeAuth:
    def __init__(self, user: Optional[SimpleNamespace]):
        self._user = user

    async def get_user(self, _token: str) -> SimpleNamespace:
        return SimpleNamespace(user=self._user)


class _FakeSupabase:
    def __init__(self, user: Optional[SimpleNamespace], profiles: List[Dict[str, Any]]):
        self.auth = _FakeAuth(user)
        self._profiles = profiles

    def table(self, _name: str) -> _FakeQuery:
        return _FakeQuery(self._profiles)


def _user(uid: str = "u-1", confirmed: bool = True, meta_role: str = "farmer") -> SimpleNamespace:
    return SimpleNamespace(
        id=uid,
        email="grower@example.com",
        email_confirmed_at="2026-01-01T00:00:00Z" if confirmed else None,
        user_metadata={"role": meta_role},
    )


def _run(coro):
    return asyncio.run(coro)


def test_verified_user_role_comes_from_profiles_table():
    sb = _FakeSupabase(_user(meta_role="farmer"), [{"id": "u-1", "role": "warehouse"}])
    ctx = _run(get_current_user(authorization="Bearer abc", supabase=sb))
    # Profile row wins over user-editable metadata.
    assert ctx["role"] == "warehouse"
    assert ctx["id"] == "u-1"


def test_unverified_email_is_rejected():
    sb = _FakeSupabase(_user(confirmed=False), [{"id": "u-1", "role": "farmer"}])
    with pytest.raises(HTTPException) as exc:
        _run(get_current_user(authorization="Bearer abc", supabase=sb))
    assert exc.value.status_code == 403


def test_metadata_role_is_never_used_without_profile():
    sb = _FakeSupabase(_user(meta_role="farmer"), [])
    with pytest.raises(HTTPException) as exc:
        _run(get_current_user(authorization="Bearer abc", supabase=sb))
    assert exc.value.status_code == 403


def test_missing_or_invalid_token_is_unauthorized():
    sb = _FakeSupabase(None, [])
    with pytest.raises(HTTPException) as exc:
        _run(get_current_user(authorization=None, supabase=sb))
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        _run(get_current_user(authorization="Bearer bad", supabase=sb))
    assert exc.value.status_code == 401


def test_role_guards():
    warehouse_ctx = {"id": "u-1", "role": "warehouse"}
    assert _run(require_warehouse(user=warehouse_ctx)) is warehouse_ctx
    with pytest.raises(HTTPException) as exc:
        _run(require_warehouse(user={"id": "u-2", "role": "buyer"}))
    assert exc.value.status_code == 403

    guard = require_role("farmer", "buyer")
    assert _run(guard(user={"role": "buyer"}))["role"] == "buyer"
    with pytest.raises(HTTPException):
        _run(guard(user={"role": "warehouse"}))

