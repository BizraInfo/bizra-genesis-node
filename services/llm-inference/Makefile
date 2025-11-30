.PHONY: run local docker-build docker-run k8s-apply perf

run:
	python models/bizra-agentic-v1/serve_vllm_production.py

local:
	python tests/validate_vllm_performance.py --url http://127.0.0.1:8000 --concurrency 8 --requests 64

docker-build:
	docker build -f models/bizra-agentic-v1/Dockerfile.vllm -t bizra/vllm:local .

docker-run:
	docker run --rm --gpus all -e MODEL_NAME="microsoft/Phi-3-mini-4k-instruct" -p 8000:8000 bizra/vllm:local

k8s-apply:
	kubectl apply -f k8s/vllm-deployment.yaml
	kubectl apply -f k8s/vllm-service.yaml

perf:
	python tests/validate_vllm_performance.py --url http://127.0.0.1:8000 --concurrency 16 --requests 128 --max_tokens 128
