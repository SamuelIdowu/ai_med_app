// backend/src/services/cacheService.ts
// Resilient Caching Layer with In-Memory Fast-Path & Distributed Redis Support

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: any = null;
  private isRedisConnected = false;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      // In-memory fallback mode (standard for local dev & testing)
      return;
    }

    try {
      // Dynamically load redis package if installed in production environment
      const redisModule = 'redis';
      const redis = await (async () => {
        try {
          return require(redisModule);
        } catch {
          return null;
        }
      })();

      if (redis && redis.createClient) {
        this.redisClient = redis.createClient({ url: redisUrl });
        this.redisClient.on('error', (err: any) => {
          console.warn('Redis Cache Connection Warning:', err.message);
          this.isRedisConnected = false;
        });
        await this.redisClient.connect();
        this.isRedisConnected = true;
        console.log('✅ Connected to distributed Redis cache');
      }
    } catch (err: any) {
      console.warn('Redis initialization skipped, using resilient in-memory cache:', err.message);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    // 1. Try Redis if connected
    if (this.isRedisConnected && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch (err) {
        // Fall back to memory on Redis read error
      }
    }

    // 2. In-memory check
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // 1. Save in memory
    this.memoryCache.set(key, { value, expiresAt });

    // 2. Save in Redis if connected
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      } catch (err) {
        // Suppress Redis write failure in favor of local memory
      }
    }
  }

  public async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {}
    }
  }

  public clear(): void {
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
