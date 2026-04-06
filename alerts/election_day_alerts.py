ALERTS = {
    "critical": {
        "api_down": {
            "condition": "api.health < 0.5 for 1 min",
            "actions": ["pagerduty", "telegram", "sms"],
            "priority": "P0"
        },
        "database_degraded": {
            "condition": "postgresql.connections > 4500 for 2 min",
            "actions": ["pagerduty", "telegram"],
            "priority": "P0"
        },
        "traffic_spike": {
            "condition": "vercel.requests > 10,000,000 for 1 min",
            "actions": ["telegram", "slack"],
            "priority": "P1"
        }
    },
    "warning": {
        "cache_miss_high": {
            "condition": "redis.cache_hit_ratio < 0.7 for 5 min",
            "actions": ["slack"],
            "priority": "P2"
        },
        "response_time_high": {
            "condition": "api.response_time.p95 > 2000 for 3 min",
            "actions": ["slack"],
            "priority": "P2"
        }
    }
}
