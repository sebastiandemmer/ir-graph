# Project Mandates

- **Virtual Environment:** Always use the virtual environment located at `.venv/` for all Python and pip commands.
- **Execution:** Prefix Python commands with `.venv/bin/python` and pip commands with `.venv/bin/python -m pip` to ensure the correct environment is used without needing to manually activate it in every shell call.
- **Tooling:** Prefer `uv` for dependency management if available, but always respect the `.venv` if executing scripts directly.
