import { OnboardingProfileDto } from './onboard-request.dto';

/**
 * Which inline capture widget the client should show next. 'text' means the
 * conversation continues normally (Nova is still gathering typed fields).
 */
export type OnboardingAwaiting =
  | 'text'
  | 'location'
  | 'cnic'
  | 'selfie'
  | 'workPhotos';

export class OnboardResponseDto {
  /** Nova's chat reply to show the worker. */
  reply: string;

  /** The full profile collected so far (client stores and resends next turn). */
  profile: OnboardingProfileDto;

  /** Human-readable fields still needed, e.g. ["city", "bio"]. */
  missing: string[];

  /**
   * The next capture step the client should render inline (camera / location),
   * derived deterministically from the first missing capture field so the model
   * can't skip it. 'text' when nothing needs capturing right now.
   */
  awaiting: OnboardingAwaiting;

  /** True when every chat-collected field is present and ready for the upload step. */
  complete: boolean;
}
