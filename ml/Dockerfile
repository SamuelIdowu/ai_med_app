# ml/Dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch before the project dependencies. The default PyPI
# wheel bundles CUDA libraries and is far too large for a free Render instance.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch>=2.4.0"

# Copy the package before installing so Hatchling can build it.
COPY pyproject.toml ./
COPY app/ ./app/
RUN pip install --no-cache-dir .

COPY models/ ./models/
COPY data/ ./data/

# Bake the sentence-transformers embedding model into the image so runtime
# never reaches the Hugging Face hub (works on scale-to-zero / offline hosts).
ENV HF_HOME=/app/hf_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Render assigns PORT dynamically; fall back to 8000 for local Docker runs.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
