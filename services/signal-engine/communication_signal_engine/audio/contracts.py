"""Sensitive acoustic-research contracts; measurements are never person inference."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


class AudioBoundaryError(RuntimeError):
    """Content- and path-free acoustic boundary failure."""


class AudioDeletionError(AudioBoundaryError):
    """A validated intake could not be safely unlinked."""


@dataclass(frozen=True, slots=True)
class AcousticConfig:
    sample_rate: int = 16_000
    frame_length: int = 2_048
    hop_length: int = 256
    maximum_duration_seconds: float = 120.0
    maximum_file_bytes: int = 25 * 1024 * 1024
    silence_below_peak_db: float = 35.0
    absolute_silence_rms: float = 1e-5
    minimum_pause_seconds: float = 0.25
    minimum_speech_run_seconds: float = 0.15
    minimum_peak_distance_seconds: float = 0.08
    energy_peak_prominence: float = 0.06
    pitch_floor_hz: float = 65.0
    pitch_ceiling_hz: float = 500.0
    minimum_voiced_frames: int = 5

    def __post_init__(self) -> None:
        if self.sample_rate < 8_000 or self.frame_length < 256 or self.hop_length < 64:
            raise ValueError("Invalid acoustic frame configuration")
        if not 0 < self.maximum_duration_seconds <= 300:
            raise ValueError("Audio duration limit is outside the research bound")
        if not 1 <= self.maximum_file_bytes <= 50 * 1024 * 1024:
            raise ValueError("Audio byte limit is outside the research bound")
        if self.pitch_floor_hz <= 0 or self.pitch_ceiling_hz <= self.pitch_floor_hz:
            raise ValueError("Invalid acoustic pitch bounds")


@dataclass(frozen=True, slots=True)
class IntakeIdentity:
    """Internal filesystem identity; never serializable in a result."""

    path: Path
    device: int
    inode: int
    size: int
    descriptor: int


@dataclass(slots=True)
class AcousticFeatureMatrix:
    duration_seconds: float
    sample_rate: int
    hop_length: int
    rms: np.ndarray
    rms_db: np.ndarray
    silent_mask: np.ndarray
    energy_peak_indices: np.ndarray
    f0_hz: np.ndarray
    voiced_mask: np.ndarray
    voiced_probability: np.ndarray

    def clear(self) -> None:
        """Best-effort clearing; Python cannot promise physical memory erasure."""

        for array in (
            self.rms,
            self.rms_db,
            self.silent_mask,
            self.energy_peak_indices,
            self.f0_hz,
            self.voiced_mask,
            self.voiced_probability,
        ):
            if array.flags.writeable:
                if np.issubdtype(array.dtype, np.floating):
                    array.fill(0.0)
                elif np.issubdtype(array.dtype, np.bool_):
                    array.fill(False)
                else:
                    array.fill(0)
