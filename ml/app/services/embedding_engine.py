from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    """Generates 384-dimensional dense vector embeddings for semantic medical RAG.

    Uses sentence-transformers (all-MiniLM-L6-v2) when available, producing
    unit-normalized 384-dimensional vectors matching Supabase pgvector HNSW index.
    Fails explicitly when the configured neural model is unavailable. Synthetic
    vectors are not valid substitutes for semantic search.
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
                cls._model = None
                raise RuntimeError("Medical embedding model could not be loaded") from e
        return cls._model

    def get_embedding(self, text: str) -> List[float]:
        """Compute normalized 384-dimensional dense vector."""
        if not text or not text.strip():
            raise ValueError("Embedding text must not be empty")

        model = self._get_model()
        if model is not None:
            try:
                embedding = model.encode(text, normalize_embeddings=True)
                return [round(float(v), 6) for v in embedding.tolist()]
            except Exception as e:
                logger.error("SentenceTransformer encoding failed")
                raise RuntimeError("Medical embedding generation failed") from e

        raise RuntimeError("Medical embedding model is unavailable")

