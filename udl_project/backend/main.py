from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from parser_engine import parse_udl, UDLParseError

app = FastAPI(title="VisualDSL Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DiagramRequest(BaseModel):
    code: str
    engine: str
    notation: str


async def render_via_kroki(code: str, diagram_type: str) -> str:
    diagram_type = diagram_type.lower().strip()
    if diagram_type == "graphviz":
        diagram_type = "dot"

    allowed = {"mermaid", "plantuml", "dot", "d2"}
    if diagram_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported Kroki type: {diagram_type}")

    url = f"https://kroki.io/{diagram_type}/svg"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, content=code.encode("utf-8"), headers={"Content-Type": "text/plain"})
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Kroki render failed: {response.status_code}")
        return response.text


@app.post("/api/process")
async def process_diagram(payload: DiagramRequest):
    engine = payload.engine.lower().strip()
    notation = payload.notation.lower().strip()

    if engine in {"mermaid", "plantuml", "graphviz", "d2"}:
        svg = await render_via_kroki(payload.code, engine)
        return {
            "status": "success",
            "engine": engine,
            "notation": notation,
            "svg": svg,
            "metadata": {"lines": len(payload.code.splitlines()), "chars": len(payload.code)},
        }

    if engine == "kroki":
        target = notation if notation and notation != "none" else "mermaid"
        svg = await render_via_kroki(payload.code, target)
        return {
            "status": "success",
            "engine": engine,
            "notation": target,
            "svg": svg,
            "metadata": {"lines": len(payload.code.splitlines()), "chars": len(payload.code)},
        }

    if engine == "udl":
        try:
            parse_tree = parse_udl(payload.code)
            return {
                "status": "success",
                "engine": engine,
                "notation": notation,
                "parseTree": parse_tree,
                "metadata": {"lines": len(payload.code.splitlines()), "chars": len(payload.code)},
            }
        except UDLParseError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

    raise HTTPException(status_code=400, detail=f"Unsupported engine: {payload.engine}")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "VisualDSL Backend"}
