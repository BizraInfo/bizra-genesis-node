
from typing import Any, Callable, Dict, List
import time, uuid

HookHandler = Callable[[Any], Any]

class Hook:
    def __init__(self, event: str, handler: HookHandler, priority: int = 0):
        self.event = event
        self.handler = handler
        self.priority = priority
        self.id = str(uuid.uuid4())

class ProfessionalHookSystem:
    def __init__(self):
        self.hooks: Dict[str, List[Hook]] = {}

    def registerHook(self, event: str, handler: HookHandler, priority: int = 0) -> str:
        h = Hook(event, handler, priority)
        self.hooks.setdefault(event, []).append(h)
        self.hooks[event].sort(key=lambda x: -x.priority)
        return h.id

    def executeHooks(self, event: str, context: Any) -> Any:
        for h in self.hooks.get(event, []):
            try:
                context = h.handler(context)
            except Exception as ex:
                context = {"_stopPropagation": True, "error": str(ex)}
            if isinstance(context, dict) and context.get("_stopPropagation"):
                break
        return context

    def setupCoreHooks(self):
        self.registerHook('before:task:execute', lambda c: c, priority=1)
        self.registerHook('after:task:execute', lambda c: c, priority=1)
