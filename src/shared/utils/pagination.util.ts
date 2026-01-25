export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
};
