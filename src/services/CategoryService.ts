import { CategoryRepository } from "../repositories/CategoryRepository";
import { categoryKey } from "../utils/category"; // Utility for key generation/normalization
import logger from "../utils/logger";
import { NotFoundError } from "../types"; // Assuming error types exist

export interface CreateCategoryData {
    label: string;
}

export interface UpdateCategoryData {
    label?: string;
    key?: string;
}

export class CategoryService {
    private repo: CategoryRepository;

    constructor() {
        this.repo = new CategoryRepository();
    }

    private async generateUniqueKey(
        label: string,
        existingId?: string | null
    ): Promise<string> {
        let baseKey = categoryKey(label);
        let key = baseKey;
        let counter = 1;

        while (true) {
            const existing = await this.repo.findByKey(key);
            if (!existing) break;

            if (existingId && existing.id === existingId) break;

            key = `${baseKey}-${counter}`;
            counter++;
        }

        return key;
    }

    // 1. Create Category
    async createCategory(data: CreateCategoryData) {
        const key = await this.generateUniqueKey(data.label);

        const category = await this.repo.create({
            label: data.label.trim(),
            key: key,
        });

        logger.info("Category created successfully", {
            categoryId: category.id,
            key: category.key,
        });
        return category;
    }

    // 2. Get All Categories (Admin list)
    async getAllCategories() {
        return this.repo.findAll();
    }

    // 3. Update Category
    async updateCategory(id: string, updateData: UpdateCategoryData) {
        const existingCategory = await this.repo.findById(id);

        if (!existingCategory) {
            throw new NotFoundError("Category not found", "CATEGORY_NOT_FOUND");
        }

        const dataToUpdate: UpdateCategoryData = {};

        if (updateData.label && updateData.label !== existingCategory.label) {
            dataToUpdate.label = updateData.label.trim();
            // Nayi label ke liye naya unique key generate karein
            dataToUpdate.key = await this.generateUniqueKey(
                dataToUpdate.label,
                id
            );
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return existingCategory;
        }

        const updatedCategory = await this.repo.update(id, dataToUpdate);

        logger.info("Category updated successfully", {
            categoryId: updatedCategory.id,
        });
        return updatedCategory;
    }

    // 4. Delete Category
    async deleteCategory(id: string) {
        const existingCategory = await this.repo.findById(id);

        if (!existingCategory) {
            throw new NotFoundError("Category not found", "CATEGORY_NOT_FOUND");
        }

        await this.repo.delete(id);

        logger.info("Category deleted successfully", { categoryId: id });
    }
}

// import { CategoryRepository } from "../repositories/CategoryRepository";
// import { categoryKey as normalizeKey } from "../utils/category";
// import logger from "../utils/logger";
// import { NotFoundError } from "../types";

// export interface CreateCategoryData {
//     label: string;
// }

// export interface UpdateCategoryData {
//     label?: string;
// }

// export class CategoryService {
//     private repo = new CategoryRepository();
//     private cacheKey = "categories::nav";

//     constructor(
//         private cacheProvider?: {
//             get: (k: string) => Promise<any>;
//             set: (k: string, v: any, opts?: any) => Promise<void>;
//             del?: (k: string) => Promise<void>;
//         }
//     ) {}

//     async getCategories(forceRefresh = false) {
//         if (this.cacheProvider && !forceRefresh) {
//             try {
//                 const cached = await this.cacheProvider.get(this.cacheKey);
//                 if (cached) return JSON.parse(cached);
//             } catch (err) {
//                 logger.warn("Category cache read failed", { err });
//             }
//         }

//         try {
//             const categories = await this.repo.getAllFromCategoryTable();
//             const dto = categories
//                 .filter((c) => !c.isHidden)
//                 .map((c) => ({ key: c.key, label: c.label, count: c.count }));

//             if (this.cacheProvider) {
//                 await this.cacheProvider.set(
//                     this.cacheKey,
//                     JSON.stringify(dto),
//                     {
//                         ttl: 60,
//                     }
//                 );
//             }
//             return dto;
//         } catch (err) {
//             logger.warn(
//                 "Category table read failed, falling back to article tag aggregation",
//                 { err }
//             );
//             const rows = await this.repo.getTagCountsFromArticles();
//             const map = new Map<string, number>();
//             for (const article of rows) {
//                 for (const ac of article.articleCategories) {
//                     const label = ac.category?.label;
//                     if (label) map.set(label, (map.get(label) || 0) + 1);
//                 }
//             }
//             const dto = Array.from(map.entries())
//                 .map(([label, count]) => ({
//                     key: normalizeKey(label),
//                     label,
//                     count,
//                 }))
//                 .sort((a, b) => b.count - a.count);

//             if (this.cacheProvider) {
//                 await this.cacheProvider.set(
//                     this.cacheKey,
//                     JSON.stringify(dto),
//                     {
//                         ttl: 60,
//                     }
//                 );
//             }
//             return dto;
//         }
//     }

//     async invalidateCache() {
//         if (this.cacheProvider?.del) {
//             await this.cacheProvider
//                 .del(this.cacheKey)
//                 .catch((err) =>
//                     logger.warn("Failed to invalidate category cache", { err })
//                 );
//         }
//     }

//     async createOrUpdateCategory(label: string) {
//         const key = normalizeKey(label);
//         return this.repo.upsertCategory(key, label);
//     }
// }
