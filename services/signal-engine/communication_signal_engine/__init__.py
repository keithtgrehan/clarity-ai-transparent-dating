"""Bounded communication checks over transient, privacy-minimised text."""

from .contracts import ProfileId, TaskId
from .orchestrator import CommunicationSignalOrchestrator

__all__ = ["CommunicationSignalOrchestrator", "ProfileId", "TaskId"]
