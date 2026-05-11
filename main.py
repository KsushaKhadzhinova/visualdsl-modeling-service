from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from lark import Lark, UnexpectedInput

BASE_DIR = Path(__file__).resolve().parent
KROKI_BASE = "https://kroki.io"

udl_grammar = r"""
start: statement*
statement: class_decl | relation | comment | empty_line
class_decl: "class" NAME "{" class_body "}"
class_body: (property | method)*
property: SIGNED_NAME ":" TYPE
method: SIGNED_NAME "(" ")"
relation: NAME ARROW NAME [":" STRING]
comment: /\/\/.*$/
empty_line: /\s*/

ARROW: /(-->|<--|<->|--|->|<-)/
SIGNED_NAME: /[+\-#][A-Za-z_][A-Za-z0-9_]*/
NAME: /[A-Za-z_][A-Za-z0-9_]*/
TYPE: /[A-Za-z0-9_<>\[\]]+/ 
STRING: /\".*?\"/

%import common.WS_INLINE
%ignore WS_INLINE
%ignore /\n+/  
"""

udl_parser = Lark(udl_grammar, start="start", parser="lalr")

class ProcessRequest(BaseModel):
    code: str
    engine: str = "udl"
    notation: str = "none"

app = FastAPI(title="VisualDSL Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/css", StaticFiles(directory=BASE_DIR / "css"), name="css")
app.mount("/download", StaticFiles(directory=BASE_DIR / "download"), name="download")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")


async def render_kroki(code: str, diagram_type: str) -> str:
    diagram_type = diagram_type.lower()
    if diagram_type == "graphviz":
        diagram_type = "dot"
    if diagram_type not in {"mermaid", "plantuml", "dot", "d2"}:
        raise HTTPException(status_code=400, detail=f"Unsupported Kroki diagram type: {diagram_type}")

    url = f"{KROKI_BASE}/{diagram_type}/svg"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, content=code.encode("utf-8"), headers={"Content-Type": "text/plain"})
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Kroki render failed: {response.status_code}")
        return response.text


def parse_udl(code: str) -> str:
    try:
        tree = udl_parser.parse(code)
        return tree.pretty()
    except UnexpectedInput as exc:
        raise HTTPException(status_code=422, detail=f"UDL parse error: {exc}")


@app.post("/api/process")
async def process(payload: ProcessRequest):
    engine = payload.engine.lower().strip()
    notation = payload.notation.lower().strip()
    if engine in {"mermaid", "plantuml", "graphviz", "d2"}:
        svg = await render_kroki(payload.code, engine)
        return JSONResponse({
            "status": "success",
            "engine": engine,
            "notation": notation,
            "svg": svg,
            "metadata": {
                "lines": len(payload.code.splitlines()),
                "chars": len(payload.code),
            },
        })

    if engine == "kroki":
        diagram_type = notation if notation not in {"none", ""} else "mermaid"
        svg = await render_kroki(payload.code, diagram_type)
        return JSONResponse({
            "status": "success",
            "engine": engine,
            "notation": diagram_type,
            "svg": svg,
            "metadata": {
                "lines": len(payload.code.splitlines()),
                "chars": len(payload.code),
            },
        })

    if engine == "udl":
        parsed = parse_udl(payload.code)
        return JSONResponse({
            "status": "success",
            "engine": engine,
            "notation": notation,
            "parseTree": parsed,
            "metadata": {
                "lines": len(payload.code.splitlines()),
                "chars": len(payload.code),
            },
        })

    raise HTTPException(status_code=400, detail=f"Unsupported engine: {payload.engine}")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "VisualDSL backend"}


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def fallback(full_path: str, request: Request):
    target = BASE_DIR / full_path
    if target.exists() and target.is_file():
        return FileResponse(target)
    index_path = BASE_DIR / "index.html"
    return FileResponse(index_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
