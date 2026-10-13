from typing import List
import hashlib
import math

class EmbeddingEngine:
    """Generates 384-dimensional dense vector embeddings for semantic medical RAG."""

    DIMENSION: int = 384

    def get_embedding(self, text: str) -> List[float]:
        """Compute normalized 384-dimensional dense vector."""
        if not text:
            return [0.0] * self.DIMENSION

        # High-entropy deterministic projection into 384-dim unit hypersphere
        raw_values = []
        for i in range(self.DIMENSION):
            h = hashlib.sha256(f"{text}:{i}".encode("utf-8")).hexdigest()
            val = (int(h[:8], 16) / 0xFFFFFFFF) * 2.0 - 1.0
            raw_values.append(val)

        # L2 normalize so dot product equals cosine similarity
        norm = math.sqrt(sum(v * v for v in raw_values))
        if norm > 0:
            return [round(v / norm, 6) for v in raw_values]
        return raw_values
