
import { type ErrorLike } from "lib/errors";

export type FallbackTrackerConfig = {
  // Frequency of endpoint probing
  trackInterval: number;

  //Pause probing if no requests for the best endpoint for this time
  disableUnusedTrackingTimeout: number;

  // Time after which endpoint saved in the localStorage is considered stale
  cacheTimeout: number;

  // Abort endpoint probe if it takes longer
  checkTimeout: number;

  failuresBeforeBan: {
    // Number of failures before banning endpoint
    count: number;
    // Time window for counting failures
    window: number;
    // Throttle for counting failures
    throttle: number;
  };

  // Throttle for setCurrentEndpoints calls
  setEndpointsThrottle: number;

  // Delay before starting tracking (in milliseconds)
  delay?: number;
};

export type EndpointState = {
  endpoint: string;
  banned: | {
    timestamp: number;
    reason: string;
  } | undefined;
  failureTimestamps: number[];
  failureThrottleTimeout: number | undefined;
};


export type CheckResult<TCheckStats> = {
  endpoint: string;
  success: boolean;
  error?: ErrorLike;
  stats: TCheckStats | undefined;
};
export type EndpointStats<TCheckStats> = EndpointState & {
  checkResults: CheckResult<TCheckStats>[];
};

export type CurrentEndpoints<TCheckStats> = {
  primary: string;
  fallbacks: string[];
  trackerKey: string;
  endpointStats: EndpointStats<TCheckStats>[];
};

export type FallbackTracker<> = {};