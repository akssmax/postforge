-- Daily request counters per caller (ip:<addr>) and per route group (all), for rate limiting.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);
