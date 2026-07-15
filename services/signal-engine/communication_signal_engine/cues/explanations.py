"""Bounded repair selection; output is always editable and never persuasive."""

from __future__ import annotations

from ..contracts import RepairAction
from .registry import CueDefinition


def repair_for(definition: CueDefinition) -> RepairAction:
    suffix = definition.canonical_id.split(".", 1)[1]
    return RepairAction(
        title=f"Edit one {suffix.replace('_', ' ')} step",
        editable_text=definition.repair_action,
        rationale="This optional edit follows the displayed wording or structure cue.",
    )
