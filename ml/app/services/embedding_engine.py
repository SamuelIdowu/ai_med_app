from typing import List, Optional
import hashlib
import math
import logging

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    """Generates 384-dimensional dense vector embeddings for semantic medical RAG.

    Uses sentence-transformers (all-MiniLM-L6-v2) when available, producing
    unit-normalized 384-dimensional vectors matching Supabase pgvector HNSW index.
    Falls back gracefully to a deterministic normalized projection if neural
    dependencies are not installed.
    """

    DIMENSION: int = 384
    MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    _model: Optional[object] = None
    _tried_loading: bool = False

    @classmethod
    def _get_model(cls):
        if not cls._tried_loading:
            cls._tried_loading = True
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading neural embedding model: {cls.MODEL_NAME}")
                cls._model = SentenceTransformer(cls.MODEL_NAME)
            except Exception as e:
                logger.warning(
                    f"SentenceTransformer not loaded ({e}). Using deterministic projection fallback."
                )
                cls._model = None
        return cls._model

    def get_embedding(self, text: str) -> List[float]:
        """Compute normalized 384-dimensional dense vector."""
        if not text:
            return [0.0] * self.DIMENSION

        model = self._get_model()
        if model is not None:
            try:
                embedding = model.encode(text, normalize_embeddings=True)
                return [round(float(v), 6) for v in embedding.tolist()]
            except Exception as e:
                logger.error(f"Error encoding with SentenceTransformer: {e}. Falling back.")

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

