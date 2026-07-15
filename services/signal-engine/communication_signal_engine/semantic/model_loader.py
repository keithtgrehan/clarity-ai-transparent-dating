"""Exact offline inventory for required privacy NER and optional semantics."""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from ..limits import ModelUnavailableError, RegistryError

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

ROOT = Path(__file__).resolve().parents[4]
DEFAULT_INVENTORY_PATH = ROOT / "configs" / "model_inventory.yml"
PRIVACY_INVENTORY_ID = "multilingual_spacy_ner_required_candidate"
SEMANTIC_INVENTORY_ID = "multilingual_sentence_similarity_review_candidate"
EXPECTED_PRIVACY = (
    "explosion/spacy-models:xx_ent_wiki_sm-3.8.0",
    "374ece89b2099818244f5a65ef466b89c0c392ae",
)
EXPECTED_SEMANTIC = (
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
)


@dataclass(frozen=True, slots=True)
class ModelInventoryEntry:
    inventory_id: str
    model_id: str
    revision: str
    availability: str
    local_path: str | None
    local_sha256: str | None
    runtime_status: str
    required_for_text_analysis: bool
    fail_behavior: str
    memory_limit_mb: int
    timeout_seconds: int
    local_files_only: bool
    trust_remote_code: bool
    maximum_sequence_length: int | None


@dataclass(frozen=True, slots=True)
class ModelInventory:
    privacy_ner: ModelInventoryEntry
    semantic: ModelInventoryEntry


def load_model_inventory(path: Path = DEFAULT_INVENTORY_PATH) -> ModelInventory:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("schema_version") != "1.0.0":
        raise RegistryError("Unsupported model inventory schema")
    expected_policy = {
        "network_downloads": False,
        "model_execution": False,
        "local_files_only": True,
        "trust_remote_code": False,
        "telemetry": False,
        "optional_semantic_unavailable_behavior": "abstain",
        "required_privacy_model_unavailable_behavior": "refuse",
    }
    if payload.get("runtime_policy") != expected_policy:
        raise RegistryError("Model runtime policy is not fail closed")
    raw_models = payload.get("models")
    if not isinstance(raw_models, list) or len(raw_models) != 2:
        raise RegistryError("The exact privacy and semantic inventory entries are required")
    by_id: dict[str, dict[str, Any]] = {}
    for item in raw_models:
        if not isinstance(item, dict) or not isinstance(item.get("inventory_id"), str):
            raise RegistryError("Model inventory entry is invalid")
        if item["inventory_id"] in by_id:
            raise RegistryError("Duplicate model inventory ID")
        by_id[item["inventory_id"]] = item
    if set(by_id) != {PRIVACY_INVENTORY_ID, SEMANTIC_INVENTORY_ID}:
        raise RegistryError("Unknown or missing model inventory ID")
    privacy = _validate_entry(by_id[PRIVACY_INVENTORY_ID], required=True)
    semantic = _validate_entry(by_id[SEMANTIC_INVENTORY_ID], required=False)
    if (privacy.model_id, privacy.revision) != EXPECTED_PRIVACY:
        raise RegistryError("Required privacy model identity changed")
    if (semantic.model_id, semantic.revision) != EXPECTED_SEMANTIC:
        raise RegistryError("Semantic model identity changed")
    if privacy.fail_behavior != "refuse_text_analysis" or not privacy.required_for_text_analysis:
        raise RegistryError("Privacy model must refuse text analysis when unavailable")
    if semantic.fail_behavior != "abstain_without_semantic_cues" or semantic.required_for_text_analysis:
        raise RegistryError("Semantic model must abstain without blocking deterministic rules")
    if semantic.maximum_sequence_length != 128:
        raise RegistryError("Reviewed semantic sequence limit changed")
    return ModelInventory(privacy_ner=privacy, semantic=semantic)


def _validate_entry(raw: dict[str, Any], *, required: bool) -> ModelInventoryEntry:
    fields = {
        "inventory_id", "model_id", "revision", "availability", "local_path",
        "local_sha256", "runtime_status", "required_for_text_analysis", "fail_behavior",
        "memory_limit_mb", "timeout_seconds", "local_files_only", "trust_remote_code",
    }
    if fields.difference(raw):
        raise RegistryError("Model inventory omits required runtime controls")
    if raw["local_files_only"] is not True or raw["trust_remote_code"] is not False:
        raise RegistryError("Model loader must be local-only without remote code")
    if raw["required_for_text_analysis"] is not required:
        raise RegistryError("Model required/optional policy changed")
    if not isinstance(raw["memory_limit_mb"], int) or not 128 <= raw["memory_limit_mb"] <= 4096:
        raise RegistryError("Model memory limit is invalid")
    if not isinstance(raw["timeout_seconds"], int) or not 1 <= raw["timeout_seconds"] <= 30:
        raise RegistryError("Model timeout is invalid")
    local_path = raw["local_path"]
    local_hash = raw["local_sha256"]
    if raw["availability"] == "reviewed_remote_only":
        if local_path is not None or local_hash is not None:
            raise RegistryError("Remote-only entry cannot assert a local artifact")
        expected_status = "blocked_refuse" if required else "blocked_abstain"
        if raw["runtime_status"] != expected_status:
            raise RegistryError("Unavailable model fail status changed")
    elif raw["availability"] == "local_verified":
        raise RegistryError("Model inventory schema v1 prohibits runtime local artifacts")
    else:
        raise RegistryError("Unsupported model availability")
    return ModelInventoryEntry(
        inventory_id=raw["inventory_id"],
        model_id=raw["model_id"],
        revision=raw["revision"],
        availability=raw["availability"],
        local_path=local_path,
        local_sha256=local_hash,
        runtime_status=raw["runtime_status"],
        required_for_text_analysis=required,
        fail_behavior=raw["fail_behavior"],
        memory_limit_mb=raw["memory_limit_mb"],
        timeout_seconds=raw["timeout_seconds"],
        local_files_only=True,
        trust_remote_code=False,
        maximum_sequence_length=raw.get("maximum_sequence_length"),
    )


def verified_local_artifact(entry: ModelInventoryEntry) -> Path | None:
    """Verify an approved artifact inside the explicitly configured model root."""

    if entry.availability != "local_verified" or not entry.local_path or not entry.local_sha256:
        return None
    root_value = os.getenv("SIGNAL_ENGINE_MODEL_ROOT", "")
    if not root_value:
        return None
    root = Path(root_value)
    path = Path(entry.local_path)
    if not root.is_absolute() or not path.is_absolute() or root.is_symlink() or path.is_symlink():
        return None
    try:
        root = root.resolve(strict=True)
        resolved = path.resolve(strict=True)
        resolved.relative_to(root)
    except (OSError, ValueError):
        return None
    if not resolved.is_file():
        return None
    hasher = hashlib.sha256()
    with resolved.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    digest = hasher.hexdigest()
    return resolved if digest == entry.local_sha256 else None


class OfflineTransformerLoader:
    def __init__(self, entry: ModelInventoryEntry) -> None:
        self.entry = entry

    @property
    def available(self) -> bool:
        # Schema v1 does not define a verified multi-file bundle, enforced
        # subprocess timeout, or memory sandbox. A matching individual file is
        # therefore never executable availability.
        return False

    def load(self) -> tuple[Any, Any]:
        raise ModelUnavailableError(
            "Model execution is prohibited by inventory schema v1; no download, import, or inference was attempted"
        )
