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
    timeout_enforced: bool
    memory_limit_enforced: bool
    local_files_only: bool
    trust_remote_code: bool
    runtime_downloads: bool
    telemetry: bool
    preload_required: bool
    purpose: str
    licence: str
    licence_url: str
    review_status: str
    resource_registry_id: str | None
    pretrained_source_registry_id: str | None
    approved_environments: tuple[str, ...]
    benchmark_reference: str | None
    supported_languages: tuple[str, ...]
    reviewed_dialect_limitations: tuple[str, ...]
    blocked_uses: tuple[str, ...]
    artifact_files: tuple["ModelArtifact", ...]
    maximum_sequence_length: int | None


@dataclass(frozen=True, slots=True)
class ModelArtifact:
    path: str
    sha256: str
    bytes: int


@dataclass(frozen=True, slots=True)
class ModelInventory:
    privacy_ner: ModelInventoryEntry
    semantic: ModelInventoryEntry


def load_model_inventory(path: Path = DEFAULT_INVENTORY_PATH) -> ModelInventory:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("schema_version") != "1.1.0":
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
        "memory_limit_enforced", "timeout_enforced", "runtime_downloads", "telemetry",
        "preload_required",
        "purpose", "licence", "licence_url", "review_status", "approved_environments",
        "resource_registry_id", "pretrained_source_registry_id",
        "benchmark_reference", "supported_languages", "reviewed_dialect_limitations",
        "blocked_uses", "artifact_files",
    }
    if fields.difference(raw):
        raise RegistryError("Model inventory omits required runtime controls")
    if raw["local_files_only"] is not True or raw["trust_remote_code"] is not False:
        raise RegistryError("Model loader must be local-only without remote code")
    if raw["runtime_downloads"] is not False or raw["telemetry"] is not False:
        raise RegistryError("Model runtime downloads and telemetry must remain disabled")
    if not isinstance(raw["preload_required"], bool):
        raise RegistryError("Model preload policy must be explicit")
    if raw["required_for_text_analysis"] is not required:
        raise RegistryError("Model required/optional policy changed")
    if not isinstance(raw["memory_limit_mb"], int) or not 128 <= raw["memory_limit_mb"] <= 4096:
        raise RegistryError("Model memory limit is invalid")
    if not isinstance(raw["timeout_seconds"], int) or not 1 <= raw["timeout_seconds"] <= 30:
        raise RegistryError("Model timeout is invalid")
    for field in ("purpose", "licence", "licence_url", "review_status"):
        if not isinstance(raw[field], str) or not raw[field].strip():
            raise RegistryError("Model governance metadata is invalid")
    if not raw["licence_url"].startswith("https://"):
        raise RegistryError("Model licence URL must be an HTTPS review reference")
    list_fields = (
        "approved_environments", "supported_languages", "reviewed_dialect_limitations", "blocked_uses"
    )
    if any(
        not isinstance(raw[field], list)
        or any(not isinstance(value, str) or not value.strip() for value in raw[field])
        for field in list_fields
    ):
        raise RegistryError("Model language, environment, or blocked-use metadata is invalid")
    if not raw["reviewed_dialect_limitations"] or not raw["blocked_uses"]:
        raise RegistryError("Model dialect limitations and blocked uses are required")
    if raw["benchmark_reference"] is not None and (
        not isinstance(raw["benchmark_reference"], str) or not raw["benchmark_reference"].strip()
    ):
        raise RegistryError("Model benchmark reference is invalid")
    for field in ("resource_registry_id", "pretrained_source_registry_id"):
        if raw[field] is not None and (not isinstance(raw[field], str) or not raw[field].strip()):
            raise RegistryError("Model governance registry cross-link is invalid")
    artifacts = _validate_artifacts(raw["artifact_files"])
    local_path = raw["local_path"]
    local_hash = raw["local_sha256"]
    if raw["availability"] == "reviewed_remote_only":
        if local_path is not None or local_hash is not None:
            raise RegistryError("Remote-only entry cannot assert a local artifact")
        expected_status = "blocked_refuse" if required else "blocked_abstain"
        if raw["runtime_status"] != expected_status:
            raise RegistryError("Unavailable model fail status changed")
        if (
            raw["review_status"] != "candidate_not_approved"
            or raw["approved_environments"]
            or raw["benchmark_reference"] is not None
            or raw["supported_languages"]
            or raw["memory_limit_enforced"] is not False
            or raw["timeout_enforced"] is not False
        ):
            raise RegistryError("Remote-only candidate cannot assert runtime admission evidence")
    elif raw["availability"] == "local_verified":
        raise RegistryError("Model inventory v1.1 keeps local model execution closed pending review")
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
        memory_limit_enforced=raw["memory_limit_enforced"],
        timeout_enforced=raw["timeout_enforced"],
        local_files_only=True,
        trust_remote_code=False,
        runtime_downloads=False,
        telemetry=False,
        preload_required=raw["preload_required"],
        purpose=raw["purpose"],
        licence=raw["licence"],
        licence_url=raw["licence_url"],
        review_status=raw["review_status"],
        resource_registry_id=raw["resource_registry_id"],
        pretrained_source_registry_id=raw["pretrained_source_registry_id"],
        approved_environments=tuple(raw["approved_environments"]),
        benchmark_reference=raw["benchmark_reference"],
        supported_languages=tuple(raw["supported_languages"]),
        reviewed_dialect_limitations=tuple(raw["reviewed_dialect_limitations"]),
        blocked_uses=tuple(raw["blocked_uses"]),
        artifact_files=artifacts,
        maximum_sequence_length=raw.get("maximum_sequence_length"),
    )


def _validate_artifacts(raw: Any) -> tuple[ModelArtifact, ...]:
    if not isinstance(raw, list) or not raw:
        raise RegistryError("Model artifact manifest is empty")
    artifacts: list[ModelArtifact] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict) or set(item) != {"path", "sha256", "bytes"}:
            raise RegistryError("Model artifact manifest entry is invalid")
        path = item["path"]
        digest = item["sha256"]
        size = item["bytes"]
        if (
            not isinstance(path, str)
            or not path
            or path.startswith(("/", "~"))
            or ".." in Path(path).parts
            or path in seen
            or not isinstance(digest, str)
            or len(digest) != 64
            or any(character not in "0123456789abcdef" for character in digest)
            or not isinstance(size, int)
            or size <= 0
        ):
            raise RegistryError("Model artifact pin is invalid")
        seen.add(path)
        artifacts.append(ModelArtifact(path=path, sha256=digest, bytes=size))
    return tuple(artifacts)


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
        # Schema v1.1 records candidate artifacts but has no verified local
        # bundle, approved benchmark, or enforced
        # subprocess timeout, or memory sandbox. A matching individual file is
        # therefore never executable availability.
        return False

    def load(self) -> tuple[Any, Any]:
        raise ModelUnavailableError(
            "Model execution is prohibited by inventory schema v1.1; no download, import, or inference was attempted"
        )
