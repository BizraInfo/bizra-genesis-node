// ═══════════════════════════════════════════════════════════════════════════
// BIZRA GENESIS NODE - OPENAPI SPECIFICATION GENERATOR
// Generates OpenAPI 3.0 specification from utoipa annotations
// ═══════════════════════════════════════════════════════════════════════════

use std::fs::File;
use std::io::Write;
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("📄 Generating OpenAPI specification...");

    // Import the OpenAPI document from the API module
    // This requires that your API has a function that returns the OpenApiDoc
    let openapi_json = generate_openapi_spec();

    // Write to docs/api/openapi.yaml
    let output_path = Path::new("docs/api/openapi.yaml");

    // Create parent directory if it doesn't exist
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // Write the OpenAPI spec
    let mut file = File::create(output_path)?;
    file.write_all(openapi_json.as_bytes())?;

    println!(
        "✅ OpenAPI specification generated at: {}",
        output_path.display()
    );
    println!("📖 View the spec at: https://editor.swagger.io/");

    Ok(())
}

/// Generate OpenAPI specification as YAML string
fn generate_openapi_spec() -> String {
    // This is a template - you'll need to implement this based on your actual API structure
    // For now, providing a comprehensive template that matches BIZRA architecture

    r#"openapi: 3.0.3
info:
  title: BIZRA Genesis Node API
  description: |
    Enterprise-grade AI Synthesis Orchestrator API

    ## Overview
    BIZRA Genesis Node provides a comprehensive REST API for multi-agent AI orchestration,
    consensus-based model selection, and cryptographic trust verification.

    ## Features
    - 🤖 18-agent ecosystem (PAT, SAT, TAT)
    - 🎯 Thompson Sampling routing
    - ⚖️ Weighted-Score Consensus
    - 🔐 Ed25519 + BLAKE3 cryptographic trust
    - 📊 Real-time WebSocket monitoring
    - 🚀 Sub-millisecond routing latency

    ## Authentication
    All endpoints require JWT authentication via Bearer token.

    ## Rate Limiting
    - Per-user: 100 requests/minute
    - Global: 1000 requests/second
  version: 1.0.0
  contact:
    name: BIZRA Lab
    email: support@bizra.ai
    url: https://github.com/BizraInfo/bizra-genesis-node
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.bizra.ai/v1
    description: Production server
  - url: https://staging-api.bizra.ai/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Local development server

tags:
  - name: Authentication
    description: User authentication and authorization
  - name: Synthesis
    description: AI synthesis orchestration
  - name: Agents
    description: Agent management and querying
  - name: Consensus
    description: Multi-agent consensus operations
  - name: Trust
    description: Cryptographic trust verification
  - name: Metrics
    description: System metrics and monitoring
  - name: Health
    description: Health check endpoints

paths:
  /health:
    get:
      tags: [Health]
      summary: Health check endpoint
      description: Returns the health status of the service
      operationId: healthCheck
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
                  version:
                    type: string
                    example: 1.0.0
                  uptime:
                    type: integer
                    description: Uptime in seconds
                    example: 3600

  /auth/login:
    post:
      tags: [Authentication]
      summary: User login
      description: Authenticate user and receive JWT tokens
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: user@example.com
                password:
                  type: string
                  format: password
                  example: securePassword123
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/register:
    post:
      tags: [Authentication]
      summary: User registration
      description: Register a new user account
      operationId: register
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - name
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  format: password
                  minLength: 8
                name:
                  type: string
                  example: John Doe
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: Invalid input
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /synthesis:
    post:
      tags: [Synthesis]
      summary: Execute AI synthesis
      description: |
        Orchestrate multi-agent AI synthesis with consensus-based model selection.
        Returns the winning model's output with cryptographic trust receipt.
      operationId: synthesize
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SynthesisRequest'
      responses:
        '200':
          description: Synthesis completed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SynthesisResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /agents:
    get:
      tags: [Agents]
      summary: List all agents
      description: Retrieve list of all available agents in the ecosystem
      operationId: listAgents
      security:
        - bearerAuth: []
      parameters:
        - name: tier
          in: query
          schema:
            type: string
            enum: [PAT, SAT, TAT]
          description: Filter by agent tier
      responses:
        '200':
          description: List of agents
          content:
            application/json:
              schema:
                type: object
                properties:
                  agents:
                    type: array
                    items:
                      $ref: '#/components/schemas/Agent'

  /metrics/prometheus:
    get:
      tags: [Metrics]
      summary: Prometheus metrics
      description: Export metrics in Prometheus format
      operationId: prometheusMetrics
      responses:
        '200':
          description: Prometheus metrics
          content:
            text/plain:
              schema:
                type: string
                example: |
                  # HELP bizra_synthesis_total Total number of synthesis operations
                  # TYPE bizra_synthesis_total counter
                  bizra_synthesis_total 12345

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from /auth/login

  schemas:
    AuthResponse:
      type: object
      required:
        - user
        - tokens
      properties:
        user:
          $ref: '#/components/schemas/User'
        tokens:
          type: object
          properties:
            accessToken:
              type: string
              description: JWT access token
            refreshToken:
              type: string
              description: JWT refresh token
            expiresIn:
              type: integer
              description: Token expiration time in seconds

    User:
      type: object
      required:
        - id
        - email
        - name
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time

    SynthesisRequest:
      type: object
      required:
        - task
        - contract
      properties:
        task:
          type: object
          description: Task specification
          properties:
            id:
              type: string
            description:
              type: string
            parameters:
              type: object
              additionalProperties: true
        contract:
          type: object
          description: Quality contract
          properties:
            ihsan_floor:
              type: number
              minimum: 0.0
              maximum: 1.0
            accuracy_weight:
              type: number
            safety_weight:
              type: number
        routes:
          type: array
          items:
            type: string
          description: Preferred model routes

    SynthesisResponse:
      type: object
      properties:
        runId:
          type: string
        winner:
          type: object
          properties:
            model:
              type: string
            output:
              type: object
            scores:
              type: object
              properties:
                accuracy:
                  type: number
                safety:
                  type: number
                efficiency:
                  type: number
                ihsan:
                  type: number
        receipt:
          $ref: '#/components/schemas/TrustReceipt'
        latency:
          type: object
          properties:
            total_ms:
              type: number
            consensus_ms:
              type: number
            routing_ms:
              type: number

    TrustReceipt:
      type: object
      description: Cryptographic trust receipt (Ed25519 + BLAKE3)
      properties:
        runId:
          type: string
        outputHash:
          type: string
          description: BLAKE3 hash of output
        publicKey:
          type: string
          description: Ed25519 public key (base64)
        signature:
          type: string
          description: Ed25519 signature (base64)
        timestamp:
          type: integer
          description: Unix timestamp in milliseconds
        proofOfImpact:
          type: object

    Agent:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        tier:
          type: string
          enum: [PAT, SAT, TAT]
        capabilities:
          type: array
          items:
            type: string
        status:
          type: string
          enum: [active, inactive, degraded]

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
        message:
          type: string
        code:
          type: string
        details:
          type: object
          additionalProperties: true
"#
    .to_string()
}
