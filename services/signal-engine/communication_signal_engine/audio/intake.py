"""Validate a service-owned private intake without following unsafe links."""

from __future__ import annotations

import os
import stat
from pathlib import Path

from .contracts import AcousticConfig, AudioBoundaryError, IntakeIdentity

INTAKE_PREFIX = "signal-intake-"


class ManagedAudioIntake:
    def __init__(self, managed_root: str | os.PathLike[str], config: AcousticConfig) -> None:
        self.root = Path(managed_root)
        self.config = config
        root_lstat = self.root.lstat()
        if stat.S_ISLNK(root_lstat.st_mode) or not stat.S_ISDIR(root_lstat.st_mode):
            raise AudioBoundaryError("Managed audio root is not a real directory")
        if stat.S_IMODE(root_lstat.st_mode) & 0o077:
            raise AudioBoundaryError("Managed audio root permissions are not private")
        if hasattr(os, "getuid") and root_lstat.st_uid != os.getuid():
            raise AudioBoundaryError("Managed audio root ownership is invalid")
        self.root = self.root.resolve(strict=True)

    def validate(self, candidate: str | os.PathLike[str]) -> IntakeIdentity:
        path = Path(candidate)
        if not path.is_absolute():
            raise AudioBoundaryError("Managed audio path must be absolute")
        if path.name.startswith(INTAKE_PREFIX) is False:
            raise AudioBoundaryError("Managed audio filename is outside the intake convention")
        try:
            parent = path.parent.resolve(strict=True)
        except OSError as exc:
            raise AudioBoundaryError("Managed audio parent is unavailable") from exc
        if parent != self.root:
            raise AudioBoundaryError("Managed audio path is outside the private root")
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
        descriptor: int | None = None
        try:
            descriptor = os.open(path, flags)
            info = os.fstat(descriptor)
            path_info = path.lstat()
            if (
                stat.S_ISLNK(path_info.st_mode)
                or not stat.S_ISREG(info.st_mode)
                or info.st_dev != path_info.st_dev
                or info.st_ino != path_info.st_ino
            ):
                raise AudioBoundaryError("Managed audio intake identity is invalid")
            if info.st_nlink != 1:
                raise AudioBoundaryError("Managed audio intake has unexpected hard links")
            if hasattr(os, "getuid") and info.st_uid != os.getuid():
                raise AudioBoundaryError("Managed audio intake ownership is invalid")
            if info.st_size <= 0 or info.st_size > self.config.maximum_file_bytes:
                raise AudioBoundaryError("Managed audio intake exceeds the byte limit")
            return IntakeIdentity(
                path=path,
                device=info.st_dev,
                inode=info.st_ino,
                size=info.st_size,
                descriptor=descriptor,
            )
        except OSError as exc:
            if descriptor is not None:
                os.close(descriptor)
            raise AudioBoundaryError("Managed audio intake is unavailable") from exc
        except Exception:
            if descriptor is not None:
                os.close(descriptor)
            raise
