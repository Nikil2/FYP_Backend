import { ToolDeps, ToolResult } from './tool-types';

/**
 * Tool: get_service_categories — distinct active service categories from the DB.
 * Helps the model map a vague problem ("fix my geyser") to a real category.
 */
export async function getServiceCategories(
  deps: ToolDeps,
): Promise<ToolResult> {
  const services = await deps.servicesService.getActiveServices();

  // Collapse services into their parent categories (unique by categoryName).
  const byCategory = new Map<string, { categoryName: string; services: string[] }>();
  for (const s of services) {
    const key = s.categoryName ?? s.name;
    if (!byCategory.has(key)) {
      byCategory.set(key, { categoryName: key, services: [] });
    }
    byCategory.get(key)!.services.push(s.name);
  }

  return {
    data: {
      categories: Array.from(byCategory.values()),
    },
  };
}
