
from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class MCPTool:
    name: str
    description: str

class MCPServer:
    def __init__(self, name: str, version: str, tools: List[MCPTool]):
        self.name, self.version, self.tools = name, version, {t.name: t for t in tools}

    def dispatch(self, tool_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if tool_name not in self.tools:
            return {"error": "tool-not-found"}
        return {"ok": True, "tool": tool_name, "payload": payload}
