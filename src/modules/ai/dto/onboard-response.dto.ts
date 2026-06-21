import { OnboardingProfileDto } from './onboard-request.dto';

export class OnboardResponseDto {
  /** Nova's chat reply to show the worker. */
  reply: string;

  /** The full profile collected so far (client stores and resends next turn). */
  profile: OnboardingProfileDto;

  /** Human-readable fields still needed, e.g. ["city", "bio"]. */
  missing: string[];

  /** True when every chat-collected field is present and ready for the upload step. */
  complete: boolean;
}
