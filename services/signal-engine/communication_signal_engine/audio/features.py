"""Synthetic-only Librosa acoustic feature research with raw decoding disabled.

These features are descriptive research measurements only. Energy peaks are
not ground-truth syllables; silence thresholds do not identify hesitation or a
cognitive process; f0 variance does not identify emotion, confidence, flat
affect, neurotype, or communication quality. The module is deliberately not
imported by the HTTP service or the text orchestrator. The public raw-file
extractor validates and unlinks a managed intake but always refuses without
reading its bytes. Only already-numeric, wholly synthetic waveforms/matrices
may exercise the feature and summary methods until the SG3 isolation gate.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np

from .contracts import AcousticConfig, AcousticFeatureMatrix, AudioBoundaryError
from .deletion import IntakeUnlinkReceipt, unlink_managed
from .intake import ManagedAudioIntake


class AcousticFeatureExtractor:
    def __init__(
        self,
        managed_root: str | Path,
        config: AcousticConfig | None = None,
    ) -> None:
        self.config = config or AcousticConfig()
        self.intake = ManagedAudioIntake(managed_root, self.config)

    def extract(self, candidate: str | Path) -> dict[str, Any]:
        identity = self.intake.validate(candidate)
        matrix: AcousticFeatureMatrix | None = None
        unlink_receipt: IntakeUnlinkReceipt | None = None
        measurements: dict[str, Any] | None = None
        try:
            matrix = self._build_feature_matrix(identity.path)
            # Unlink immediately after the numeric matrix exists and before any
            # summarization or result construction.
            unlink_receipt = unlink_managed(identity)
            measurements = self._summarize_measurements(matrix)
        except Exception:
            if unlink_receipt is None and (identity.path.exists() or identity.path.is_symlink()):
                unlink_managed(identity)
            raise
        finally:
            if matrix is not None:
                self._clear_matrix(matrix)
        if measurements is None or unlink_receipt is None or not unlink_receipt._is_attested():
            raise AudioBoundaryError("Acoustic result lacks verified unlink provenance")
        return self._release_result(measurements, "UNLINKED_AFTER_FEATURE_MATRIX")

    def _build_feature_matrix(self, path: Path) -> AcousticFeatureMatrix:
        raise AudioBoundaryError(
            "Audio extraction is disabled until descriptor-bound subprocess decoding is implemented"
        )

    def _matrix_from_waveform(
        self,
        waveform: np.ndarray,
        sample_rate: int,
        duration: float,
        librosa_module: Any,
        find_peaks: Any,
    ) -> AcousticFeatureMatrix:
        rms = librosa_module.feature.rms(
            y=waveform,
            frame_length=self.config.frame_length,
            hop_length=self.config.hop_length,
            center=True,
        )[0].astype(np.float32, copy=False)
        peak_energy = float(np.max(rms))
        near_silence = peak_energy <= self.config.absolute_silence_rms
        if near_silence:
            rms_db = np.full(rms.shape, -120.0, dtype=np.float32)
            silent_mask = np.ones(rms.shape, dtype=bool)
            peaks = np.empty(0, dtype=np.int64)
        else:
            denominator = max(peak_energy, float(np.finfo(np.float32).eps))
            normalized = rms / denominator
            rms_db = (20 * np.log10(np.maximum(normalized, np.finfo(np.float32).eps))).astype(np.float32)
            silent_mask = rms_db <= -self.config.silence_below_peak_db
            active = normalized[~silent_mask]
            height = max(0.08, float(np.median(active) + 0.15 * np.std(active))) if active.size else 1.0
            distance = max(1, round(self.config.minimum_peak_distance_seconds * sample_rate / self.config.hop_length))
            peaks, _ = find_peaks(
                normalized,
                height=height,
                prominence=self.config.energy_peak_prominence,
                distance=distance,
            )
        if near_silence:
            f0 = np.full(rms.shape, np.nan, dtype=np.float32)
            voiced = np.zeros(rms.shape, dtype=bool)
            probability = np.zeros(rms.shape, dtype=np.float32)
        else:
            padded = waveform
            if waveform.size < self.config.frame_length:
                padded = np.pad(waveform, (0, self.config.frame_length - waveform.size))
            try:
                try:
                    f0, voiced, probability = librosa_module.pyin(
                        padded,
                        fmin=self.config.pitch_floor_hz,
                        fmax=self.config.pitch_ceiling_hz,
                        sr=sample_rate,
                        frame_length=self.config.frame_length,
                        hop_length=self.config.hop_length,
                        center=True,
                    )
                except (ValueError, FloatingPointError):
                    f0 = np.full(rms.shape, np.nan, dtype=np.float32)
                    voiced = np.zeros(rms.shape, dtype=bool)
                    probability = np.zeros(rms.shape, dtype=np.float32)
            finally:
                if padded is not waveform and padded.flags.writeable:
                    padded.fill(0.0)
        return AcousticFeatureMatrix(
            duration_seconds=duration,
            sample_rate=sample_rate,
            hop_length=self.config.hop_length,
            rms=np.asarray(rms, dtype=np.float32),
            rms_db=np.asarray(rms_db, dtype=np.float32),
            silent_mask=np.asarray(silent_mask, dtype=bool),
            energy_peak_indices=np.asarray(peaks, dtype=np.int64),
            f0_hz=np.asarray(f0, dtype=np.float32),
            voiced_mask=np.asarray(voiced, dtype=bool),
            voiced_probability=np.asarray(probability, dtype=np.float32),
        )

    def summarize_synthetic_matrix(self, matrix: AcousticFeatureMatrix) -> dict[str, Any]:
        """Summarize a caller-created synthetic matrix and always clear arrays."""

        measurements: dict[str, Any] | None = None
        try:
            measurements = self._summarize_measurements(matrix)
        finally:
            self._clear_matrix(matrix)
        if measurements is None:
            raise AudioBoundaryError("Synthetic acoustic measurements were not produced")
        return self._release_result(measurements, "NOT_APPLICABLE_SYNTHETIC_MATRIX")

    def _summarize_measurements(self, matrix: AcousticFeatureMatrix) -> dict[str, Any]:
        frame_seconds = matrix.hop_length / matrix.sample_rate
        silence_runs = self._runs(matrix.silent_mask)
        pauses = []
        for start, end in silence_runs:
            seconds = (end - start) * frame_seconds
            before = bool((~matrix.silent_mask[:start]).any())
            after = bool((~matrix.silent_mask[end:]).any())
            if seconds >= self.config.minimum_pause_seconds and before and after:
                pauses.append((start, end))
        speech_runs = [
            (start, end)
            for start, end in self._runs(~matrix.silent_mask)
            if (end - start) * frame_seconds >= self.config.minimum_speech_run_seconds
        ]
        active_seconds = min(
            matrix.duration_seconds,
            float(np.count_nonzero(~matrix.silent_mask) * frame_seconds),
        )
        silence_seconds = min(
            matrix.duration_seconds,
            float(np.count_nonzero(matrix.silent_mask) * frame_seconds),
        )
        valid_pitch = matrix.f0_hz[np.isfinite(matrix.f0_hz) & matrix.voiced_mask]
        pitch_sufficient = valid_pitch.size >= self.config.minimum_voiced_frames
        mean_pitch = float(np.mean(valid_pitch)) if pitch_sufficient else 0.0
        std_pitch = float(np.std(valid_pitch)) if pitch_sufficient else 0.0
        pause_durations = [(end - start) * frame_seconds for start, end in pauses]
        result = {
            "schema_version": "1.0.0-research",
            "analysis_state": (
                "NO_SPEECH_DETECTED"
                if active_seconds == 0
                else "SUFFICIENT_MEASUREMENTS" if matrix.duration_seconds >= 1 and active_seconds >= 0.25 else "LOW_SIGNAL_AUDIO"
            ),
            "duration_seconds": self._round(matrix.duration_seconds),
            "pacing": {
                "energy_peak_count": int(matrix.energy_peak_indices.size),
                "estimated_articulation_peak_rate_per_active_second": self._round(
                    matrix.energy_peak_indices.size / active_seconds if active_seconds else 0
                ),
                "active_speech_seconds": self._round(active_seconds),
                "limitation": "Energy peaks are an articulation-event proxy, not ground-truth syllables.",
            },
            "pauses": {
                "threshold_below_peak_db": -self.config.silence_below_peak_db,
                "minimum_pause_seconds": self.config.minimum_pause_seconds,
                "count": len(pauses),
                "mean_seconds": self._round(float(np.mean(pause_durations)) if pause_durations else 0),
                "maximum_seconds": self._round(max(pause_durations, default=0)),
                "total_silence_ratio": self._round(silence_seconds / matrix.duration_seconds),
                "longest_continuous_speech_seconds": self._round(
                    max(((end - start) * frame_seconds for start, end in speech_runs), default=0)
                ),
                "intervals": [
                    {
                        "start_seconds": self._round(start * frame_seconds),
                        "end_seconds": self._round(min(end * frame_seconds, matrix.duration_seconds)),
                    }
                    for start, end in pauses
                ],
                "limitation": "Thresholded gaps do not identify cognition, hesitation cause, distress, or attention state.",
            },
            "pitch": {
                "mean_f0_hz": self._round(mean_pitch),
                "std_f0_hz": self._round(std_pitch),
                "voiced_frame_ratio": self._round(
                    np.count_nonzero(matrix.voiced_mask) / matrix.voiced_mask.size if matrix.voiced_mask.size else 0
                ),
                "quality": "SUFFICIENT_VOICED_FRAMES" if pitch_sufficient else "INSUFFICIENT_VOICED_FRAMES",
                "limitation": "F0 variance is an acoustic measurement, not emotion, confidence, or flat affect.",
            },
        }
        if not self._finite(result):
            raise AudioBoundaryError("Non-finite acoustic output was blocked")
        return result

    @staticmethod
    def _clear_matrix(matrix: AcousticFeatureMatrix) -> None:
        matrix.clear()
        arrays = (
            matrix.rms,
            matrix.rms_db,
            matrix.silent_mask,
            matrix.energy_peak_indices,
            matrix.f0_hz,
            matrix.voiced_mask,
            matrix.voiced_probability,
        )
        if any(np.any(array) for array in arrays):
            raise AudioBoundaryError("Transient acoustic arrays could not be cleared")

    @staticmethod
    def _release_result(measurements: dict[str, Any], intake_path_status: str) -> dict[str, Any]:
        if intake_path_status not in {
            "UNLINKED_AFTER_FEATURE_MATRIX",
            "NOT_APPLICABLE_SYNTHETIC_MATRIX",
        }:
            raise AudioBoundaryError("Acoustic release provenance is invalid")
        return {
            **measurements,
            "intake_path_status": intake_path_status,
            "raw_arrays_cleared_before_release": True,
        }

    @staticmethod
    def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
        values = np.asarray(mask, dtype=bool)
        if values.size == 0:
            return []
        padded = np.concatenate(([False], values, [False]))
        changes = np.diff(padded.astype(np.int8))
        starts = np.flatnonzero(changes == 1)
        ends = np.flatnonzero(changes == -1)
        return [(int(start), int(end)) for start, end in zip(starts, ends)]

    @staticmethod
    def _round(value: float) -> float:
        return round(float(value), 4)

    @classmethod
    def _finite(cls, value: Any) -> bool:
        if isinstance(value, dict):
            return all(cls._finite(item) for item in value.values())
        if isinstance(value, list):
            return all(cls._finite(item) for item in value)
        return not isinstance(value, float) or math.isfinite(value)
