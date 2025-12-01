@echo off
REM ============================================================
REM BIZRA HYPERGRAPH RAG - KNOWLEDGE ACTIVATION
REM Transform 15,000 hours of wisdom into ACCESSIBLE INTELLIGENCE
REM ============================================================

echo.
echo ================================================================
echo    BIZRA HYPERGRAPH RAG ACTIVATION
echo    "Your knowledge becomes a living, breathing organism"
echo ================================================================
echo.

REM Configuration
set SOURCE_ROOT=C:\BIZRA-DATA-LAKE
set GRAPH_OUTPUT=%~dp0graph
set QDRANT_HOST=localhost
set QDRANT_PORT=6333

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
pip install -q sentence-transformers qdrant-client numpy tqdm python-dotenv
if errorlevel 1 (
    echo WARNING: Some dependencies may not be installed
)

echo.
echo [2/5] Building Knowledge Graph...
echo       Source: %SOURCE_ROOT%
echo       Output: %GRAPH_OUTPUT%
python "%~dp0scripts\build_knowledge_graph.py" --source "%SOURCE_ROOT%" --output "%GRAPH_OUTPUT%"
if errorlevel 1 (
    echo ERROR: Knowledge graph build failed
    pause
    exit /b 1
)

echo.
echo [3/5] Generating Embeddings...
echo       This may take a while depending on file count...
python "%~dp0scripts\generate_embeddings.py" --graph "%GRAPH_OUTPUT%" --source "%SOURCE_ROOT%" --qdrant-host %QDRANT_HOST% --qdrant-port %QDRANT_PORT%
if errorlevel 1 (
    echo WARNING: Embedding generation failed (Qdrant may not be running)
    echo          Embeddings saved to disk instead
)

echo.
echo [4/5] Verifying Graph...
if exist "%GRAPH_OUTPUT%\nodes.jsonl" (
    for /f %%A in ('find /c /v "" ^< "%GRAPH_OUTPUT%\nodes.jsonl"') do set NODE_COUNT=%%A
    echo       Nodes: %NODE_COUNT%
) else (
    echo ERROR: Graph files not found
    pause
    exit /b 1
)

if exist "%GRAPH_OUTPUT%\edges.jsonl" (
    for /f %%A in ('find /c /v "" ^< "%GRAPH_OUTPUT%\edges.jsonl"') do set EDGE_COUNT=%%A
    echo       Edges: %EDGE_COUNT%
)

if exist "%GRAPH_OUTPUT%\hyperedges.jsonl" (
    for /f %%A in ('find /c /v "" ^< "%GRAPH_OUTPUT%\hyperedges.jsonl"') do set HYPER_COUNT=%%A
    echo       Hyperedges: %HYPER_COUNT%
)

echo.
echo [5/5] Ready for Queries!
echo.
echo ================================================================
echo    HYPERGRAPH RAG ACTIVATED
echo.
echo    Your knowledge graph is now alive.
echo    Every file connected. Every concept indexed.
echo    Every insight accessible.
echo.
echo    To query interactively:
echo    python scripts\query_engine.py --graph graph
echo.
echo    To query from code:
echo    from query_engine import QueryEngine
echo    engine = QueryEngine(Path("graph"))
echo    result = engine.query("your question")
echo ================================================================
echo.

REM Optional: Start interactive mode
set /p INTERACTIVE="Start interactive query mode? (y/n): "
if /i "%INTERACTIVE%"=="y" (
    python "%~dp0scripts\query_engine.py" --graph "%GRAPH_OUTPUT%"
)

pause
