# Project Mandates

- **Virtual Environment:** Always use the virtual environment located at `.venv/` for all Python and pip commands.
- **Execution:** Prefix Python commands with `.venv/bin/python` and pip commands with `.venv/bin/python -m pip` to ensure the correct environment is used without needing to manually activate it in every shell call.
- **Tooling:** Prefer `uv` for dependency management if available, but always respect the `.venv` if executing scripts directly.

- **Project Context:** At the beginning of any planning, generation, or refactoring task, you MUST use your file-reading tools to review `.planning/ROADMAP.md` and `.planning/PROJECT.md` to align with the current project goals. 
- **Codebase Architecture:** Consult the `.planning/codebase/` directory to understand the project's architectural guidelines before making structural changes.
- **Application Interaction:** Always check if the development server is running before interacting with the application. Use `./start_server.sh` to start it; the script will automatically check if it's already running.
