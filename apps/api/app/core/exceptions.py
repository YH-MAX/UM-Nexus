class ConfigurationError(RuntimeError):
    """Raised when backend configuration is incomplete or unsafe."""


class ExternalProviderError(RuntimeError):
    """Raised when an external AI/provider integration fails safely."""
