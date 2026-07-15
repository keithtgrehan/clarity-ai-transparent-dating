"""Central resource and output limits for the synthetic review boundary."""

MAX_TEXT_CHARACTERS = 4_000
MIN_SIGNAL_TOKENS = 5
MAX_CUES = 3
MAX_OFFSETS_PER_CUE = 8
MAX_LANGUAGE_SEGMENTS = 12
MAX_REDACTION_CATEGORIES = 20


class SignalEngineError(RuntimeError):
    """Content-free base error safe for internal classification."""


class InputBoundaryError(SignalEngineError):
    """The input did not satisfy a fail-closed boundary."""


class PrivacyBoundaryError(SignalEngineError):
    """Identifier minimisation could not attest downstream input."""


class RegistryError(SignalEngineError):
    """A canonical registry failed closed validation."""


class ModelUnavailableError(SignalEngineError):
    """A local model was not approved and available."""
