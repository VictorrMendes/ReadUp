import json
import os
import threading
import time
from collections import deque
from urllib.request import Request, urlopen

# Host fixo; a chave só vem do ambiente do servidor (nunca do app, que pode ser descompilado).
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_MODEL = "meta/llama-3.2-11b-vision-instruct"
TIMEOUT_SECONDS = 30
MAX_RESPONSE_BYTES = 64_000
MAX_TEXT_LENGTH = 1_000
REQUESTS_PER_MINUTE = 40  # limite da conta na NVIDIA, dividido por todos os usuários

PROMPT = (
    "This image is a region of a phone screen (often a comic, manga or webtoon balloon). "
    "Read the English text in it, in reading order, and translate it to Brazilian Portuguese. "
    'Answer only with JSON: {"original": "<english text>", "translation": "<portuguese>"}. '
    'If there is no readable text, answer {"original": "", "translation": ""}.'
)


class RateLimiter:
    """Janela deslizante de 60 s: no máximo `limit` chamadas por minuto neste processo."""

    def __init__(self, limit: int, window: float = 60.0) -> None:
        self.limit = limit
        self.window = window
        self._calls: deque[float] = deque()
        self._lock = threading.Lock()  # endpoints síncronos rodam em várias threads

    def try_acquire(self) -> bool:
        now = time.monotonic()
        with self._lock:
            while self._calls and now - self._calls[0] >= self.window:
                self._calls.popleft()
            if len(self._calls) >= self.limit:
                return False
            self._calls.append(now)
            return True


# ponytail: limite em memória, vale para um processo só (o compose sobe um uvicorn sem --workers).
# Com mais réplicas, mover a contagem para o Postgres ou um Redis.
limiter = RateLimiter(REQUESTS_PER_MINUTE)


def available() -> bool:
    return bool(os.environ.get("NVIDIA_API_KEY"))


def translate_image(image_data_url: str) -> tuple[str, str] | None:
    """OCR + tradução en → pt-BR de um recorte de tela por um modelo de visão. Qualquer falha →
    None, nunca exceção. Só a imagem recortada pela pessoa sai do servidor."""
    payload = {
        "model": os.environ.get("NVIDIA_VISION_MODEL") or DEFAULT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.2,
        "stream": False,
    }
    request = Request(
        NVIDIA_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ.get('NVIDIA_API_KEY', '')}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            return None
        content = json.loads(body)["choices"][0]["message"]["content"]
        return parse_answer(content)
    except (OSError, ValueError, KeyError, IndexError, TypeError):
        return None


def parse_answer(content: object) -> tuple[str, str] | None:
    """Tira o JSON da resposta do modelo (às vezes vem cercado de texto ou de ```json)."""
    if not isinstance(content, str):
        return None
    start, end = content.find("{"), content.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(content[start : end + 1])
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    original, translation = data.get("original"), data.get("translation")
    if not isinstance(original, str) or not isinstance(translation, str):
        return None
    original, translation = " ".join(original.split()), " ".join(translation.split())
    if len(original) > MAX_TEXT_LENGTH or len(translation) > MAX_TEXT_LENGTH:
        return None
    return original, translation
