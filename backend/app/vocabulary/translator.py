import json
import os
from urllib.parse import urlencode
from urllib.request import urlopen

# Host fixo: a palavra só entra como parâmetro codificado, nunca na URL.
MYMEMORY_URL = "https://api.mymemory.translated.net/get"
LANGPAIR = "en|pt-BR"
TIMEOUT_SECONDS = 4
MAX_RESPONSE_BYTES = 64_000
MAX_TRANSLATION_LENGTH = 100
# o MyMemory às vezes devolve a palavra com pontuação ("farol.")
_EDGES = " \t\n\r.,;:!?\"'“”‘’«»"


# ponytail: cota diária do MyMemory (5 mil caracteres/dia anônimo, 50 mil com MYMEMORY_EMAIL),
# compartilhada por todos os usuários e sem limite por usuário. O cache em word_translations
# faz cada palavra sair uma vez só; se a cota apertar, limitar lookups por usuário ou trocar
# por um dicionário local.
def translate(word: str, max_length: int = MAX_TRANSLATION_LENGTH) -> str | None:
    """Tradução en → pt-BR de uma palavra já normalizada. Qualquer falha → None, nunca exceção.

    Só a palavra sai para o serviço: nada do usuário nem do texto que ele está lendo.
    """
    params = {"q": word, "langpair": LANGPAIR}
    # email de contato do dono do app (aumenta a cota); nunca o de um usuário
    if email := os.environ.get("MYMEMORY_EMAIL"):
        params["de"] = email
    try:
        with urlopen(f"{MYMEMORY_URL}?{urlencode(params)}", timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            return None
        data = json.loads(body)
        # o MyMemory responde HTTP 200 também nos erros: o status real e o aviso de cota vêm no
        # corpo, com a mensagem de erro no lugar da tradução
        if str(data["responseStatus"]) != "200" or data.get("quotaFinished"):
            return None
        translation = data["responseData"]["translatedText"]
    except (OSError, ValueError, KeyError, TypeError):
        return None
    if not isinstance(translation, str):
        return None
    translation = translation.strip(_EDGES)
    if not translation or len(translation) > max_length:
        return None
    if translation.upper().startswith("MYMEMORY WARNING"):
        return None
    return translation
