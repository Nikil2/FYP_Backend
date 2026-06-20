import { ToolDeps, ToolResult } from './tool-types';

/**
 * Tool: initiate_booking — does NOT create a booking. It validates the worker
 * and service exist, then returns a deep-link action the frontend uses to open
 * the existing pre-filled booking form (/customer/book/:serviceId?workerId=...).
 */
export async function initiateBooking(
  deps: ToolDeps,
  args: { workerId: string; serviceId: number },
): Promise<ToolResult> {
  // Validate the worker exists (and is real) before handing back a link.
  try {
    await deps.workersService.getWorkerById(args.workerId);
  } catch {
    return { data: { error: `Worker ${args.workerId} not found.` } };
  }

  // Validate the service id.
  try {
    await deps.servicesService.getServiceById(args.serviceId);
  } catch {
    return { data: { error: `Service ${args.serviceId} not found.` } };
  }

  const action = `redirect:/customer/book/${args.serviceId}?workerId=${args.workerId}`;

  return {
    data: {
      ok: true,
      message: 'Booking form ready. Frontend will open the pre-filled form.',
    },
    action,
  };
}
