# BIZRA AI FAMILY: STRATEGIC ROADMAP & VISION
**Version:** 1.0.0
**Status:** PLANNING
**Objective:** Develop a sovereign family of multi-modal AI models (Text, Vision, Voice) fine-tuned on Bizra's unique intellectual property.

## 1. The "Bizra Family" Model Architecture
We are moving beyond generic models. The goal is to create specialized "Expert Agents" that share a common understanding of the Bizra philosophy.

| Model Name | Base Architecture | Role | Status |
|------------|-------------------|------|--------|
| **Bizra-7B-Planner** | Qwen2.5-7B | Strategic Planning & Reasoning | 🟡 Needs Fine-tuning |
| **Bizra-Vision** | LLaVA / Pixtral | UI/UX Analysis & Design Review | 🔴 Planned |
| **Bizra-Voice** | Whisper / XTTS | Natural Interaction & Command | 🔴 Planned |
| **Bizra-Coder** | DeepSeek-Coder | Full-Stack Implementation | 🟢 Active (Base) |

## 2. The "Data Refinery" Pipeline (Immediate Priority)
The bottleneck is **Clean Data**. We have 3 years of unstructured data (Gold Mine). We must build a local pipeline to refine this ore into fuel for our models.

### Phase 1: The Sovereign Scraper (Local RAG)
*   **Input**: User's local folders (PDFs, Markdown, Code, Emails).
*   **Process**:
    1.  **Ingest**: Recursively scan directories.
    2.  **Chunk**: Split text into semantic blocks.
    3.  **Embed**: Generate vector embeddings locally.
    4.  **Store**: Save to local VectorDB (Chroma/LanceDB).
*   **Output**: A searchable "Second Brain" for the current Bizra-7B model.

### Phase 2: The Instruction Synthesizer (Fine-Tuning Prep)
*   **Input**: The "Second Brain" chunks.
*   **Process**:
    1.  **Generate QA**: Use a strong local model (or API) to generate Question-Answer pairs from the raw text.
    2.  **Format**: Convert to `JSONL` (Alpaca/ShareGPT format).
    3.  **Filter**: Remove low-quality or redundant pairs.
*   **Output**: A clean `bizra_instruct_dataset.jsonl` ready for LoRA training.

### Phase 3: Local Fine-Tuning (The Forge)
*   **Tooling**: Unsloth / Axolotl (optimized for consumer GPUs).
*   **Action**: Run LoRA fine-tuning on the local RTX 4090.
*   **Result**: A `.gguf` adapter that makes generic models "Bizra-Native".

## 3. Multi-Modal Expansion
Once the text brain is established, we expand senses:
1.  **Vision**: Fine-tune on screenshots of "Award Winner Designs" to teach the model our aesthetic standards.
2.  **Voice**: Clone the "Bizra Voice" for TTS responses, making the dashboard feel alive.

## 4. Action Plan: Next 2 Weeks
1.  **Build "Data Refinery" Agent**: A script to index the "unstructured data".
2.  **Structure the Data**: Organize the 3 years of work into `Knowledge/` folders.
3.  **Pilot Training**: Create a small dataset (100 examples) and test the fine-tuning workflow.

**"We do not just consume AI. We forge it."**
