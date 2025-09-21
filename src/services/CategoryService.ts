import { CategoryRepository } from "../repositories/CategoryRepository";
import { categoryKey as normalizeKey } from "../utils/category";
import logger from "../utils/logger";

export class CategoryService {
  private repo = new CategoryRepository();
  private cacheKey = "categories::nav";

  constructor(
    private cacheProvider?: {
      get: (k: string) => Promise<any>;
      set: (k: string, v: any, opts?: any) => Promise<void>;
      del?: (k: string) => Promise<void>;
    }
  ) {}

  async getCategories(forceRefresh = false) {
    if (this.cacheProvider && !forceRefresh) {
      try {
        const cached = await this.cacheProvider.get(this.cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        logger.warn("Category cache read failed", { err });
      }
    }

    try {
      const categories = await this.repo.getAllFromCategoryTable();
      const dto = categories
        .filter((c) => !c.isHidden)
        .map((c) => ({ key: c.key, label: c.label, count: c.count }));

      if (this.cacheProvider) {
        await this.cacheProvider.set(this.cacheKey, JSON.stringify(dto), {
          ttl: 60,
        });
      }
      return dto;
    } catch (err) {
      logger.warn(
        "Category table read failed, falling back to article tag aggregation",
        { err }
      );
      const rows = await this.repo.getTagCountsFromArticles();
      const map = new Map<string, number>();
      for (const article of rows) {
        for (const ac of article.articleCategories) {
          const label = ac.category?.label;
          if (label) map.set(label, (map.get(label) || 0) + 1);
        }
      }
      const dto = Array.from(map.entries())
        .map(([label, count]) => ({ key: normalizeKey(label), label, count }))
        .sort((a, b) => b.count - a.count);

      if (this.cacheProvider) {
        await this.cacheProvider.set(this.cacheKey, JSON.stringify(dto), {
          ttl: 60,
        });
      }
      return dto;
    }
  }

  async invalidateCache() {
    if (this.cacheProvider?.del) {
      await this.cacheProvider
        .del(this.cacheKey)
        .catch((err) =>
          logger.warn("Failed to invalidate category cache", { err })
        );
    }
  }

  async createOrUpdateCategory(label: string) {
    const key = normalizeKey(label);
    return this.repo.upsertCategory(key, label);
  }
}
