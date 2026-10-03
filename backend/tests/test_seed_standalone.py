import subprocess
import sys

# `python -m app.articles.seed` roda num interpretador sem o app.main: as tabelas que articles
# referencia por FK precisam estar registradas, senão o commit quebra (NoReferencedTableError).


def test_seed_module_registers_referenced_tables_on_its_own() -> None:
    code = "import app.articles.seed; from app.db import Base; Base.metadata.sorted_tables"
    result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
