"""Shared config: model IDs, AWS resources, schema, policy. Everything reads from config/*.json."""

import json
import os
from functools import lru_cache
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config"


def _load(name: str) -> dict:
    return json.loads((CONFIG / name).read_text())


@lru_cache
def models() -> dict:
    return _load("models.json")


@lru_cache
def aws() -> dict:
    return _load("aws.json")


@lru_cache
def schema() -> dict:
    return _load("schema.json")["fields"]


@lru_cache
def policy() -> dict:
    return _load("policy.json")


@lru_cache
def session() -> boto3.Session:
    """Local runs use the `fundsentinel` profile; inside AgentCore the runtime role is used."""
    region = aws()["region"]
    profile = os.environ.get("AWS_PROFILE")
    if not profile and "AWS_ACCESS_KEY_ID" not in os.environ and not os.environ.get("AWS_EXECUTION_ENV"):
        if aws()["profile"] in boto3.Session().available_profiles:
            profile = aws()["profile"]
    return boto3.Session(profile_name=profile, region_name=region)
