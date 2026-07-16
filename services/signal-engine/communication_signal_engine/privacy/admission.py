"""Fail-closed admission for the required local identifier detector.

This module evaluates inventory evidence; it never downloads or approves a
model. The current inventory intentionally cannot pass production admission.
An explicitly labelled test admission exists only for wholly fictional local
protocol tests and cannot be created for a non-test environment.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from ..limits import ModelUnavailableError, PrivacyBoundaryError
from ..semantic.model_loader import ModelInventoryEntry, verified_local_artifact

_CONSTRUCTION_KEY = object()


@dataclass(frozen=True, slots=True, init=False)
class PrivacyModelAdmission:
    admitted: bool
    test_only: bool
    detector_id: str
    detector_revision: str
    detector_status: str
    detector_version: str
    fingerprint: str
    refusal_reason: str | None

    def __init__(
        self,
        *,
        admitted: bool,
        test_only: bool,
        detector_id: str,
        detector_revision: str,
        detector_status: str,
        detector_version: str,
        fingerprint: str,
        refusal_reason: str | None,
        _key: object,
    ) -> None:
        if _key is not _CONSTRUCTION_KEY:
            raise PrivacyBoundaryError("Privacy admission must come from the governed factory")
        object.__setattr__(self, "admitted", admitted)
        object.__setattr__(self, "test_only", test_only)
        object.__setattr__(self, "detector_id", detector_id)
        object.__setattr__(self, "detector_revision", detector_revision)
        object.__setattr__(self, "detector_status", detector_status)
        object.__setattr__(self, "detector_version", detector_version)
        object.__setattr__(self, "fingerprint", fingerprint)
        object.__setattr__(self, "refusal_reason", refusal_reason)

    @classmethod
    def from_inventory(cls, entry: ModelInventoryEntry, *, environment: str) -> "PrivacyModelAdmission":
        evidence = {
            "inventory_id": entry.inventory_id,
            "model_id": entry.model_id,
            "revision": entry.revision,
            "purpose": entry.purpose,
            "licence": entry.licence,
            "licence_url": entry.licence_url,
            "availability": entry.availability,
            "runtime_status": entry.runtime_status,
            "review_status": entry.review_status,
            "resource_registry_id": entry.resource_registry_id,
            "pretrained_source_registry_id": entry.pretrained_source_registry_id,
            "approved_environments": entry.approved_environments,
            "benchmark_reference": entry.benchmark_reference,
            "supported_languages": entry.supported_languages,
            "reviewed_dialect_limitations": entry.reviewed_dialect_limitations,
            "memory_limit_enforced": entry.memory_limit_enforced,
            "timeout_enforced": entry.timeout_enforced,
            "local_files_only": entry.local_files_only,
            "trust_remote_code": entry.trust_remote_code,
            "runtime_downloads": entry.runtime_downloads,
            "telemetry": entry.telemetry,
            "preload_required": entry.preload_required,
            "environment": environment,
            "artifact_files": [
                {"path": item.path, "sha256": item.sha256, "bytes": item.bytes}
                for item in entry.artifact_files
            ],
        }
        fingerprint = _fingerprint(evidence)
        artifact = verified_local_artifact(entry)
        admitted = all(
            (
                entry.purpose == "privacy_identifier_minimisation",
                entry.availability == "local_verified",
                entry.runtime_status == "approved_local",
                entry.review_status == "reviewed_approved",
                bool(entry.resource_registry_id),
                bool(entry.pretrained_source_registry_id),
                environment in entry.approved_environments,
                bool(entry.benchmark_reference),
                bool(entry.supported_languages),
                bool(entry.reviewed_dialect_limitations),
                entry.memory_limit_enforced,
                entry.timeout_enforced,
                entry.local_files_only,
                not entry.trust_remote_code,
                not entry.runtime_downloads,
                not entry.telemetry,
                entry.preload_required,
                artifact is not None,
            )
        )
        return cls(
            admitted=admitted,
            test_only=False,
            detector_id=entry.model_id,
            detector_revision=entry.revision,
            detector_status="LOCAL_SPACY_APPLIED" if admitted else "BLOCKED_UNAPPROVED",
            detector_version=f"dv_{_fingerprint({'model_id': entry.model_id, 'revision': entry.revision})}",
            fingerprint=f"pa_{fingerprint}",
            refusal_reason=None if admitted else "approved local privacy model unavailable",
            _key=_CONSTRUCTION_KEY,
        )

    @classmethod
    def synthetic_test(cls, *, environment: str, version: str = "1.0.0") -> "PrivacyModelAdmission":
        if environment != "test":
            raise PrivacyBoundaryError("Synthetic privacy admission is restricted to the test environment")
        evidence = {
            "detector_id": "synthetic-test-double",
            "revision": "fixture-only",
            "detector_version": version,
            "status": "SYNTHETIC_TEST_DOUBLE_APPLIED",
            "environment": environment,
            "test_only": True,
        }
        return cls(
            admitted=True,
            test_only=True,
            detector_id="synthetic-test-double",
            detector_revision="fixture-only",
            detector_status="SYNTHETIC_TEST_DOUBLE_APPLIED",
            detector_version=f"dv_{_fingerprint({'detector_id': 'synthetic-test-double', 'version': version})}",
            fingerprint=f"pa_{_fingerprint(evidence)}",
            refusal_reason=None,
            _key=_CONSTRUCTION_KEY,
        )

    def require(self) -> None:
        if not self.admitted:
            raise ModelUnavailableError("Required approved local privacy model is unavailable")


def _fingerprint(value: object) -> str:
    encoded = json.dumps(value, ensure_ascii=True, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
