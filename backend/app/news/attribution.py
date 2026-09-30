from datetime import UTC, datetime

VOA = "VOA Learning English"
WIKINEWS = "Wikinews"

# Wikinews:Copyright (https://en.wikinews.org/wiki/Wikinews:Copyright): domínio público antes de
# 25/09/2005, CC BY 2.5 até 16/12/2024, CC BY 4.0 depois; "may be attributed to 'Wikinews'".
_CC_BY_25_FROM = datetime(2005, 9, 25, tzinfo=UTC)
_CC_BY_40_FROM = datetime(2024, 12, 16, tzinfo=UTC)


def wikinews_license(published_at: datetime | None) -> str:
    if published_at is None or published_at >= _CC_BY_40_FROM:
        return "CC BY 4.0 (creativecommons.org/licenses/by/4.0)"
    if published_at >= _CC_BY_25_FROM:
        return "CC BY 2.5 (creativecommons.org/licenses/by/2.5)"
    return "domínio público"


def attribution(source: str, published_at: datetime | None) -> str | None:
    """Crédito exibível no fim do texto; None para textos do app e PDFs."""
    if source == VOA:
        # só entra material produzido pela VOA (domínio público); agências são descartadas
        return "Fonte: VOA Learning English (domínio público)"
    if source == WIKINEWS:
        # a licença pede autoria, licença e indicação de alteração (texto adaptado ao leitor)
        return f"Fonte: Wikinews · {wikinews_license(published_at)} · texto adaptado"
    return None
