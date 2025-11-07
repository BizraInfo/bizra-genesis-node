
#!/usr/bin/env python3
import asyncio
from core.meta_alpha_professional_core import MetaAlphaProfessionalCore

async def main():
    agent = MetaAlphaProfessionalCore()
    await agent.activate_professional_synthesis()
    res = await agent.execute_with_peak_professionalism({"request":"hello","project":"NODE0"})
    print(f"Result (Ihsan: {res.ihsan_score}): {res.output}")

if __name__ == "__main__":
    asyncio.run(main())
