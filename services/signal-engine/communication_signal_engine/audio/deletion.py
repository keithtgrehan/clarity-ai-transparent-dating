"""Race-aware unlink of an exact managed intake identity.

`os.remove` unlinks one directory entry; it is not secure overwrite or physical
erasure on SSDs, copy-on-write storage, snapshots, backups, caches, or copies.
"""

from __future__ import annotations

import os
import stat

from .contracts import AudioDeletionError, IntakeIdentity


_UNLINK_ATTESTATION = object()


class IntakeUnlinkReceipt:
    """Opaque proof created only after an exact managed path is absent."""

    __slots__ = ("__attestation",)

    def __init__(self, *, _attestation: object) -> None:
        if _attestation is not _UNLINK_ATTESTATION:
            raise AudioDeletionError("Managed audio unlink receipt lacks attestation")
        self.__attestation = _attestation

    @classmethod
    def _after_verified_unlink(cls) -> "IntakeUnlinkReceipt":
        return cls(_attestation=_UNLINK_ATTESTATION)

    def _is_attested(self) -> bool:
        return self.__attestation is _UNLINK_ATTESTATION


def unlink_managed(identity: IntakeIdentity) -> IntakeUnlinkReceipt:
    try:
        current = identity.path.lstat()
        if (
            current.st_dev != identity.device
            or current.st_ino != identity.inode
            or current.st_nlink != 1
            or not stat.S_ISREG(current.st_mode)
            or stat.S_ISLNK(current.st_mode)
        ):
            raise AudioDeletionError("Managed audio identity changed before unlink")
        os.remove(identity.path)
    except AudioDeletionError:
        raise
    except OSError as exc:
        raise AudioDeletionError("Managed audio intake could not be unlinked") from exc
    finally:
        try:
            os.close(identity.descriptor)
        except OSError:
            pass
    if identity.path.exists() or identity.path.is_symlink():
        raise AudioDeletionError("Managed audio intake remained after unlink")
    return IntakeUnlinkReceipt._after_verified_unlink()
