# Unnamed CodeViz Diagram

```mermaid
graph TD

    begin-diagram-generation["Generate Base Diagram<br>[External]"]

```
# Unnamed CodeViz Diagram

```mermaid
graph TD

    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::user_interface_boundary["User & Interface<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::user["User<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_dashboard["BIZRA Dashboard<br>[External]"]
        %% Edges at this level (grouped by source)
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::user["User<br>[External]"] -->|"Uses"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_dashboard["BIZRA Dashboard<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::app_backend_boundary["Application Backend (Node / HTTP Gateway)<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::websocket_server["WebSocket Server<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::rust_orchestrator_boundary["Rust Orchestrator & Agent Engine<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::data_stores_boundary["Data Stores & Admin Tools<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::postgres_db["PostgreSQL Database<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::redis_cache["Redis Cache<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::pgadmin["PgAdmin<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::redis_insight["RedisInsight<br>[External]"]
        %% Edges at this level (grouped by source)
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::pgadmin["PgAdmin<br>[External]"] -->|"Manages"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::postgres_db["PostgreSQL Database<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::redis_insight["RedisInsight<br>[External]"] -->|"Manages"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::redis_cache["Redis Cache<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_boundary["LLM Inference & Tools<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_fabric_boundary["External AI / LLM Providers<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::openai_api["OpenAI API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::anthropic_api["Anthropic API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::google_api["Google API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::mistral_ai["Mistral AI<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::xai_api["xAI API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::groq_api["Groq API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::perplexity_ai["Perplexity AI<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::openrouter_api["OpenRouter API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::azure_openai_api["Azure OpenAI API<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::ollama["Ollama<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::monitoring_boundary["Elite Monitoring & Observability Stack<br>[External]"]
        subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::metrics_boundary["Metrics<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::node_exporter["Node Exporter<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::tmp_consciousness_exporter["TMP Consciousness Exporter<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::blackbox_exporter["Blackbox Exporter<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::cadvisor["cAdvisor<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::pushgateway["Pushgateway<br>[External]"]
            %% Edges at this level (grouped by source)
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::node_exporter["Node Exporter<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::tmp_consciousness_exporter["TMP Consciousness Exporter<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::blackbox_exporter["Blackbox Exporter<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::cadvisor["cAdvisor<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::pushgateway["Pushgateway<br>[External]"] -->|"Pushes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
        end
        subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logging_boundary["Logging<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logstash["Logstash<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::elasticsearch["Elasticsearch<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::kibana["Kibana<br>[External]"]
            %% Edges at this level (grouped by source)
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logstash["Logstash<br>[External]"] -->|"Forwards"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::elasticsearch["Elasticsearch<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::kibana["Kibana<br>[External]"] -->|"Queries"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::elasticsearch["Elasticsearch<br>[External]"]
        end
        subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::tracing_alerts_boundary["Tracing & Alerts<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::jaeger["Jaeger<br>[External]"]
            BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::alertmanager["Alertmanager<br>[External]"]
        end
        %% Edges at this level (grouped by source)
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::alertmanager["Alertmanager<br>[External]"] -->|"Receives alerts from"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"] -->|"Sends alerts to"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::alertmanager["Alertmanager<br>[External]"]
    end
    subgraph BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::dev_integration_boundary["Developer Integration<br>[External]"]
        BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::github_api["GitHub API<br>[External]"]
    end
    %% Edges at this level (grouped by source)
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_dashboard["BIZRA Dashboard<br>[External]"] -->|"Makes calls to"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_dashboard["BIZRA Dashboard<br>[External]"] -->|"Connects to"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::websocket_server["WebSocket Server<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"] -->|"Stores/Retrieves"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::postgres_db["PostgreSQL Database<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"] -->|"Stores/Retrieves"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::redis_cache["Redis Cache<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::jaeger["Jaeger<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_backend_api["BIZRA Backend API<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logstash["Logstash<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Reads/Writes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::postgres_db["PostgreSQL Database<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Reads/Writes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::redis_cache["Redis Cache<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Interacts with"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::github_api["GitHub API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::jaeger["Jaeger<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::bizra_rust_api["BIZRA Rust API<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logstash["Logstash<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::openai_api["OpenAI API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::anthropic_api["Anthropic API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::google_api["Google API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::mistral_ai["Mistral AI<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::xai_api["xAI API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::groq_api["Groq API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::perplexity_ai["Perplexity AI<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::openrouter_api["OpenRouter API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::azure_openai_api["Azure OpenAI API<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Calls"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::ollama["Ollama<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::jaeger["Jaeger<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::llm_inference_service["LLM Inference Service<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logstash["Logstash<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::websocket_server["WebSocket Server<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::jaeger["Jaeger<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::websocket_server["WebSocket Server<br>[External]"] -->|"Scrapes"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::prometheus["Prometheus<br>[External]"]
    BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::websocket_server["WebSocket Server<br>[External]"] -->|"Sends"| BIZRA_Genesis_Node_Global_System_View_Current_Implementation.cv::logstash["Logstash<br>[External]"]

```
---
*Generated by [CodeViz.ai](https://codeviz.ai) on 11/24/2025, 12:38:57 AM*
