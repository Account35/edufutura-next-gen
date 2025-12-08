# EduFutura Load Testing Suite

Comprehensive load testing infrastructure using k6 for validating system performance under realistic and extreme conditions.

## Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6
   
   # Windows
   choco install k6
   
   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. Set environment variables:
   ```bash
   export BASE_URL="https://umnpomycamfmsrssjuqn.supabase.co"
   export SUPABASE_ANON_KEY="your-anon-key"
   ```

3. Create test accounts in your database:
   ```sql
   -- Create load test accounts
   INSERT INTO auth.users (email, password, ...) VALUES
   ('loadtest-free@edufutura.test', 'LoadTest2024!Free', ...),
   ('loadtest-premium@edufutura.test', 'LoadTest2024!Premium', ...);
   ```

## Test Scenarios

### 1. Student Journey (`scenarios/student-journey.js`)
Simulates complete student workflow:
- Dashboard loading
- Curriculum browsing
- Quiz taking
- Forum participation
- Study group chat
- Search functionality

```bash
k6 run load-tests/scenarios/student-journey.js
```

### 2. API Stress Test (`scenarios/api-stress.js`)
Tests API endpoints under extreme load:
- Constant load baseline
- Ramping stress test (100 → 1000 VUs)
- Spike test (1500 VUs)

```bash
k6 run load-tests/scenarios/api-stress.js
```

### 3. Real-time Load Test (`scenarios/realtime-load.js`)
Tests WebSocket connections:
- Concurrent connections (up to 1000)
- Message broadcasting latency
- Connection stability

```bash
k6 run load-tests/scenarios/realtime-load.js
```

### 4. Rate Limit Test (`scenarios/rate-limit-test.js`)
Validates rate limiting:
- AI question limits
- Quiz generation limits
- API rate limits by IP

```bash
k6 run load-tests/scenarios/rate-limit-test.js
```

### 5. Database Stress Test (`scenarios/database-stress.js`)
Tests database performance:
- Heavy read operations
- Concurrent writes
- Complex aggregation queries
- Mixed workload

```bash
k6 run load-tests/scenarios/database-stress.js
```

## Load Profiles

| Profile | VUs | Duration | Use Case |
|---------|-----|----------|----------|
| Baseline | 100 | 30m | Typical afternoon peak |
| High Load | 500 | 30m | Exam period simulation |
| Stress | 1000 | 30m | Breaking point validation |
| Spike | 1500 | 10m | Sudden traffic surge |

## Performance Thresholds

| Metric | Target |
|--------|--------|
| HTTP request duration (p95) | < 2000ms |
| HTTP request duration (p99) | < 5000ms |
| Error rate | < 1% |
| Login duration (p95) | < 1500ms |
| Dashboard load (p95) | < 2000ms |
| Quiz submission (p95) | < 3000ms |
| Chat message (p95) | < 500ms |
| Search query (p95) | < 1000ms |

## Running Tests

### Basic Run
```bash
k6 run load-tests/scenarios/student-journey.js
```

### With Custom VUs
```bash
k6 run --vus 200 --duration 10m load-tests/scenarios/api-stress.js
```

### Export Results
```bash
k6 run --out json=results.json load-tests/scenarios/student-journey.js
k6 run --out csv=results.csv load-tests/scenarios/student-journey.js
```

### Cloud Execution (k6 Cloud)
```bash
k6 cloud load-tests/scenarios/student-journey.js
```

## Interpreting Results

### Key Metrics to Watch

1. **Response Time Percentiles**
   - p50: Median experience
   - p95: 95% of requests faster than this
   - p99: Worst 1% of requests

2. **Throughput**
   - Requests per second (RPS)
   - Maximum sustainable load

3. **Error Rate**
   - Should stay below 1%
   - Spike indicates capacity issues

4. **Resource Bottlenecks**
   - CPU utilization
   - Memory usage
   - Database connections

### Sample Output
```
     scenarios: (100.00%) 1 scenario, 500 max VUs, 35m30s max duration
     execution: local
        script: scenarios/student-journey.js

     ✓ login successful
     ✓ dashboard request 0 successful
     ✓ subjects loaded
     ✓ chapters loaded
     ✓ quiz submitted

     checks.........................: 99.21% ✓ 48234 ✗ 384
     data_received..................: 892 MB 427 kB/s
     data_sent......................: 156 MB 75 kB/s
     http_req_duration..............: avg=245ms min=12ms med=198ms max=4892ms p(90)=512ms p(95)=789ms
     http_req_failed................: 0.79%  ✓ 384   ✗ 48234
     http_reqs......................: 48618  23.34/s
     
     dashboard_load.................: avg=312ms min=89ms med=278ms max=2341ms p(90)=523ms p(95)=689ms
     login_duration.................: avg=189ms min=45ms med=156ms max=1892ms p(90)=345ms p(95)=456ms
     quiz_submission................: avg=1245ms min=456ms med=1089ms max=4562ms p(90)=2134ms p(95)=2789ms
```

## Troubleshooting

### Test Account Login Fails
- Verify test accounts exist in database
- Check password meets security requirements
- Ensure accounts are not locked

### WebSocket Connection Errors
- Check Supabase Realtime is enabled
- Verify WebSocket URL format
- Check connection limits

### High Error Rates
- Review database connection pool settings
- Check for query timeouts
- Monitor server resources

## CI/CD Integration

Add to your pipeline:
```yaml
load-test:
  stage: test
  script:
    - k6 run --out json=results.json load-tests/scenarios/api-stress.js
  artifacts:
    paths:
      - results.json
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Best Practices

1. **Always warm up** - Ramp up gradually
2. **Use think time** - Simulate real user behavior
3. **Monitor resources** - Track CPU, memory, connections
4. **Test regularly** - Catch regressions early
5. **Test in production-like environment** - Staging or preview
