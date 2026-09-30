import os
import time
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

TIMEOUT_SECONDS = 10
# pausa mínima entre requisições ao mesmo host. A Wikimedia limita a 10 requisições/min quem
# não se identifica com contato no User-Agent (https://www.mediawiki.org/wiki/Wikimedia_APIs/
# Rate_limits): 7 s fica abaixo disso mesmo sem NEWS_CONTACT.
DEFAULT_INTERVAL_SECONDS = 1.0
INTERVAL_SECONDS = {"en.wikinews.org": 7.0}
_last_request: dict[str, float] = {}


def user_agent() -> str:
    # NEWS_CONTACT: URL ou email do dono do app (a política da Wikimedia pede contato);
    # nunca dado de usuário
    contact = os.environ.get("NEWS_CONTACT", "").strip()
    return f"ReadUp/1.0 (English reading app{'; ' + contact if contact else ''}) python-urllib"


class FetchError(Exception):
    """Falha ao buscar uma URL; derruba só o item ou a fonte que pediu."""


class _NoRedirect(HTTPRedirectHandler):
    # redirecionamento poderia levar para fora da allowlist: vira erro
    def redirect_request(self, *args: object, **kwargs: object) -> None:
        return None


_opener = build_opener(_NoRedirect)


def get(url: str, hosts: frozenset[str], max_bytes: int) -> bytes:
    """GET só em HTTPS para um host da allowlist da fonte, com timeout e limite de bytes."""
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.hostname not in hosts:
        raise FetchError(f"host fora da allowlist: {parts.hostname}")
    interval = INTERVAL_SECONDS.get(parts.hostname, DEFAULT_INTERVAL_SECONDS)
    wait = _last_request.get(parts.hostname, 0.0) + interval - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _last_request[parts.hostname] = time.monotonic()
    request = Request(url, headers={"User-Agent": user_agent()})
    try:
        with _opener.open(request, timeout=TIMEOUT_SECONDS) as response:
            body: bytes = response.read(max_bytes + 1)
    except (OSError, ValueError) as e:  # URLError, HTTPError, timeout, conexão
        raise FetchError(f"{parts.hostname}: {e}") from e
    if len(body) > max_bytes:
        raise FetchError(f"{parts.hostname}: resposta maior que {max_bytes} bytes")
    return body
