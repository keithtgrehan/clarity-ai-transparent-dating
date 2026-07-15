from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pytest

from communication_signal_engine.audio.contracts import (
    AcousticConfig,
    AcousticFeatureMatrix,
    AudioBoundaryError,
    AudioDeletionError,
)
from communication_signal_engine.audio.deletion import IntakeUnlinkReceipt, unlink_managed
from communication_signal_engine.audio.features import AcousticFeatureExtractor
from communication_signal_engine.audio.intake import ManagedAudioIntake


def private_root(tmp_path: Path) -> Path:
    root = tmp_path / "audio"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    return root


def test_intake_rejects_traversal_symlink_hardlink_and_outside(tmp_path: Path) -> None:
    root = private_root(tmp_path)
    outside = tmp_path / "outside.wav"
    outside.write_bytes(b"outside synthetic bytes")
    intake = ManagedAudioIntake(root, AcousticConfig())
    with pytest.raises(AudioBoundaryError):
        intake.validate(outside)
    symlink = root / "signal-intake-link.wav"
    symlink.symlink_to(outside)
    with pytest.raises(AudioBoundaryError):
        intake.validate(symlink)
    inside = root / "signal-intake-original.wav"
    inside.write_bytes(b"synthetic bytes")
    hardlink = root / "signal-intake-hardlink.wav"
    os.link(inside, hardlink)
    with pytest.raises(AudioBoundaryError):
        intake.validate(inside)
    assert outside.read_bytes() == b"outside synthetic bytes"


def test_exact_identity_unlinks_and_inode_replacement_refuses(tmp_path: Path) -> None:
    root = private_root(tmp_path)
    intake = ManagedAudioIntake(root, AcousticConfig())
    path = root / "signal-intake-owned.wav"
    path.write_bytes(b"synthetic owned bytes")
    identity = intake.validate(path)
    receipt = unlink_managed(identity)
    assert not path.exists()
    assert receipt._is_attested()
    with pytest.raises(AudioDeletionError, match="lacks attestation"):
        IntakeUnlinkReceipt(_attestation=object())

    path.write_bytes(b"first synthetic inode")
    identity = intake.validate(path)
    preserved = root / "preserved.wav"
    path.rename(preserved)
    path.write_bytes(b"replacement synthetic inode")
    with pytest.raises(AudioDeletionError, match="identity changed"):
        unlink_managed(identity)
    assert preserved.read_bytes() == b"first synthetic inode"
    assert path.read_bytes() == b"replacement synthetic inode"


def test_audio_decode_refuses_closed_and_cleans_managed_intake(tmp_path: Path) -> None:
    root = private_root(tmp_path)
    path = root / "signal-intake-disabled.wav"
    path.write_bytes(b"synthetic not decoded")
    with pytest.raises(AudioBoundaryError, match="subprocess decoding"):
        AcousticFeatureExtractor(root).extract(path)
    assert not path.exists()


def test_resource_byte_limit_refuses_without_deleting_unvalidated_file(tmp_path: Path) -> None:
    root = private_root(tmp_path)
    path = root / "signal-intake-large.wav"
    path.write_bytes(b"x" * 32)
    config = AcousticConfig(maximum_file_bytes=16)
    with pytest.raises(AudioBoundaryError, match="byte limit"):
        ManagedAudioIntake(root, config).validate(path)
    assert path.exists()


def test_deletion_failure_releases_no_result(tmp_path: Path, monkeypatch) -> None:
    root = private_root(tmp_path)
    path = root / "signal-intake-delete.wav"
    path.write_bytes(b"synthetic")
    identity = ManagedAudioIntake(root, AcousticConfig()).validate(path)

    def fail_remove(_path):
        raise PermissionError("synthetic deletion denial")

    monkeypatch.setattr(os, "remove", fail_remove)
    with pytest.raises(AudioDeletionError):
        unlink_managed(identity)
    assert path.exists()


def test_all_transient_feature_arrays_are_cleared() -> None:
    arrays = [
        np.ones(3, dtype=np.float32),
        np.ones(3, dtype=np.float32),
        np.ones(3, dtype=bool),
        np.ones(3, dtype=np.int64),
        np.ones(3, dtype=np.float32),
        np.ones(3, dtype=bool),
        np.ones(3, dtype=np.float32),
    ]
    matrix = AcousticFeatureMatrix(1.0, 16000, 256, *arrays)
    matrix.clear()
    assert all(not np.any(array) for array in arrays)


@pytest.mark.audio
def test_synthetic_librosa_distribution_measures_peaks_pause_and_f0_then_clears(tmp_path: Path) -> None:
    librosa = pytest.importorskip("librosa")
    scipy_signal = pytest.importorskip("scipy.signal")
    root = private_root(tmp_path)
    extractor = AcousticFeatureExtractor(root)
    sample_rate = 16_000
    first_time = np.arange(sample_rate, dtype=np.float32) / sample_rate
    second_time = np.arange(sample_rate, dtype=np.float32) / sample_rate
    pulse_one = (0.35 + 0.65 * (np.sin(2 * np.pi * 5 * first_time) ** 2)).astype(np.float32)
    pulse_two = (0.35 + 0.65 * (np.sin(2 * np.pi * 6 * second_time) ** 2)).astype(np.float32)
    waveform = np.concatenate(
        (
            0.2 * pulse_one * np.sin(2 * np.pi * 180 * first_time),
            np.zeros(sample_rate // 2, dtype=np.float32),
            0.2 * pulse_two * np.sin(2 * np.pi * 230 * second_time),
        )
    ).astype(np.float32)
    matrix = extractor._matrix_from_waveform(
        waveform,
        sample_rate,
        waveform.size / sample_rate,
        librosa,
        scipy_signal.find_peaks,
    )
    arrays = (
        matrix.rms,
        matrix.rms_db,
        matrix.silent_mask,
        matrix.energy_peak_indices,
        matrix.f0_hz,
        matrix.voiced_mask,
        matrix.voiced_probability,
    )
    result = extractor.summarize_synthetic_matrix(matrix)
    assert result["analysis_state"] == "SUFFICIENT_MEASUREMENTS"
    assert result["pacing"]["energy_peak_count"] > 0
    assert result["pauses"]["count"] >= 1
    assert result["pitch"]["mean_f0_hz"] > 0
    assert result["pitch"]["std_f0_hz"] > 0
    assert result["intake_path_status"] == "NOT_APPLICABLE_SYNTHETIC_MATRIX"
    assert result["raw_arrays_cleared_before_release"] is True
    assert all(not np.any(array) for array in arrays)


def test_synthetic_short_matrix_is_low_signal_and_cleared(tmp_path: Path) -> None:
    root = private_root(tmp_path)
    extractor = AcousticFeatureExtractor(root)
    frames = 8
    matrix = AcousticFeatureMatrix(
        duration_seconds=0.2,
        sample_rate=16_000,
        hop_length=256,
        rms=np.ones(frames, dtype=np.float32),
        rms_db=np.zeros(frames, dtype=np.float32),
        silent_mask=np.zeros(frames, dtype=bool),
        energy_peak_indices=np.array([2], dtype=np.int64),
        f0_hz=np.full(frames, 180.0, dtype=np.float32),
        voiced_mask=np.ones(frames, dtype=bool),
        voiced_probability=np.ones(frames, dtype=np.float32),
    )
    result = extractor.summarize_synthetic_matrix(matrix)
    assert result["analysis_state"] == "LOW_SIGNAL_AUDIO"
    assert result["intake_path_status"] == "NOT_APPLICABLE_SYNTHETIC_MATRIX"
    assert not np.any(matrix.voiced_probability)


def test_measurement_core_cannot_claim_unlink_or_clearing(tmp_path: Path) -> None:
    root = private_root(tmp_path)
    extractor = AcousticFeatureExtractor(root)
    frames = 8
    matrix = AcousticFeatureMatrix(
        duration_seconds=0.2,
        sample_rate=16_000,
        hop_length=256,
        rms=np.ones(frames, dtype=np.float32),
        rms_db=np.zeros(frames, dtype=np.float32),
        silent_mask=np.zeros(frames, dtype=bool),
        energy_peak_indices=np.array([2], dtype=np.int64),
        f0_hz=np.full(frames, 180.0, dtype=np.float32),
        voiced_mask=np.ones(frames, dtype=bool),
        voiced_probability=np.ones(frames, dtype=np.float32),
    )
    measurements = extractor._summarize_measurements(matrix)
    assert "intake_path_status" not in measurements
    assert "raw_arrays_cleared_before_release" not in measurements
    assert np.any(matrix.rms)
    matrix.clear()


def test_managed_result_is_released_only_after_unlink_and_array_clear(tmp_path: Path, monkeypatch) -> None:
    root = private_root(tmp_path)
    path = root / "signal-intake-synthetic.wav"
    path.write_bytes(b"synthetic managed bytes")
    extractor = AcousticFeatureExtractor(root)
    frames = 8
    matrix = AcousticFeatureMatrix(
        duration_seconds=0.2,
        sample_rate=16_000,
        hop_length=256,
        rms=np.ones(frames, dtype=np.float32),
        rms_db=np.zeros(frames, dtype=np.float32),
        silent_mask=np.zeros(frames, dtype=bool),
        energy_peak_indices=np.array([2], dtype=np.int64),
        f0_hz=np.full(frames, 180.0, dtype=np.float32),
        voiced_mask=np.ones(frames, dtype=bool),
        voiced_probability=np.ones(frames, dtype=np.float32),
    )
    monkeypatch.setattr(extractor, "_build_feature_matrix", lambda _path: matrix)
    result = extractor.extract(path)
    assert not path.exists()
    assert result["intake_path_status"] == "UNLINKED_AFTER_FEATURE_MATRIX"
    assert result["raw_arrays_cleared_before_release"] is True
    assert not np.any(matrix.rms)
