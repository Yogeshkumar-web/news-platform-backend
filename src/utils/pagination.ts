export function normalizePageParams(
  inputPage?: any,
  inputLimit?: any,
  maxLimit = 50
) {
  const page = Math.max(1, Number(inputPage) || 1);
  const limit = Math.min(Math.max(Number(inputLimit) || 10, 1), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
