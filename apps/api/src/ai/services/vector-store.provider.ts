/**
 * @file ai/services/vector-store.provider.ts
 *
 * Vector Store Abstraction & Cosine Similarity Search Engine.
 * Provides vector embedding generation, indexing, and vector similarity search.
 * Designed to cleanly swap in Pinecone, PgVector, or Weaviate providers without business logic changes.
 */

export interface VectorDocument {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  title: string;
  content: string;
  type: string;
  tags: string[];
  embedding?: number[];
  sourceId?: string | null;
  createdAt?: Date | string;
}

export interface SearchHit {
  document: VectorDocument;
  similarityScore: number; // 0.0 to 1.0
}

export class VectorStoreProvider {
  private static memoryStore: Map<string, VectorDocument> = new Map();

  /**
   * Simple deterministic term-frequency vector embedding simulator for fast local semantic matching
   */
  static generateEmbedding(text: string): number[] {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const vector = new Array(64).fill(0);

    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % 64;
      vector[index] += 1;
    }

    // Normalize L2 norm
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => val / magnitude);
  }

  /**
   * Calculate Cosine Similarity between two vector embeddings
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const valA = vecA[i] || 0;
      const valB = vecB[i] || 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Index or upsert document into Vector Store
   */
  static indexDocument(doc: VectorDocument): void {
    const embedding = doc.embedding || this.generateEmbedding(`${doc.title} ${doc.content} ${doc.tags.join(' ')}`);
    this.memoryStore.set(doc.id, { ...doc, embedding });
  }

  /**
   * Perform vector similarity search
   */
  static search(query: string, workspaceId: string, topK: number = 5): SearchHit[] {
    const queryVec = this.generateEmbedding(query);
    const results: SearchHit[] = [];

    for (const doc of this.memoryStore.values()) {
      if (doc.workspaceId !== workspaceId) continue;
      const docVec = doc.embedding || this.generateEmbedding(`${doc.title} ${doc.content}`);
      const similarityScore = this.cosineSimilarity(queryVec, docVec);
      results.push({ document: doc, similarityScore });
    }

    return results
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);
  }
}
