# Backend quality refactoring

Branch: `refactor/backend-quality`. Baseline: `1bc0358`.

Scope: preserve business workflows, REST payloads, schema and migrations. Keep the existing JPA/JDBC choices. No Redis, runtime dependencies, framework upgrades or realtime transport changes.

| Step | Work | Verification | Status |
| --- | --- | --- | --- |
| R-01 | Authentication filter and HTTP/database error boundaries | 4 regression tests passed | Done |
| R-02 | Social resolution concurrency and session lock review | Controlled PostgreSQL accept/cancel regression passed; existing session behavior retained | Done |
| R-03 | Production JWT validation, SMTP timeouts and isolated scheduled cleanup | JWT/scheduler tests; Google-login PostgreSQL tests with provider doubles; concurrent rate-limit test | Done |
| R-04 | Shared actor/request IDs, profile mapping and acyclic module facades | 31 targeted unit tests; 14 architecture/profile/avatar/social regression tests | Done |
| R-05 | Batch list/history queries without changing response ordering or permissions | PostgreSQL regression and measured constant query counts | Done |
| R-06 | Repeatable Java formatting, concise comments and backend CI | 159 Java files; full suite 165 tests, zero failures/errors/skips | Local checks passed; hosted CI pending push |

Baseline audit: 151 tests, zero failures/errors/skips, PostgreSQL 17.11; Maven package passed. New concurrency risks must be reproduced rather than inferred from a passing baseline.

R-02 reproduction: a test blocks both resolution transactions on the same user-pair lock. Before the fix, accept returned ACCEPTED while cancel returned CANCELLED for the same request. The fix reads only participant identifiers before locking and loads the entity after acquiring the canonical pair locks.

Comments explain locking, atomicity, provider boundaries or compatibility. No decorative banners/icons and no comments that repeat method names. Java formatting uses a pinned development tool; no formatter enters the application runtime.

Deferred security changes: registration OTP hashing and distributed rate limiting need a separate rollout plan. Keep the current single-instance realtime model and PostgreSQL source of truth.

## Changes and compatibility

- Only token verification failures are mapped to 401. Exceptions from downstream processing retain their original meaning. Unsupported methods return 405 with Allow and the existing error envelope.
- PostgreSQL unique violations retain 409 DATA_CONFLICT. Unexpected integrity failures return safe 500 responses without logging submitted database values.
- The prod profile requires an explicit private JWT secret and rejects the development logging email sender. Local defaults remain compatible. SMTP has configurable finite timeouts.
- Google verification runs before the database transaction. Account linking, device binding and session issuance remain atomic. Media cleanup uses its own scheduler; expired per-instance rate-limit buckets are removed atomically.
- Social stores participant UUIDs against the same database columns/FKs and accesses identity through UserDirectory. User/relationship lookup orchestration belongs to social, removing the module cycle. HTTP routes and fields are unchanged.
- Profile mapping, actor/request-ID checks and signed cursors are reused. The compatibility-only cursor subclass is removed.
- List/history endpoints batch public profile and summary reads, retaining permissions, cursor ordering, bigint strings and nullable dates/times. Health reports contract version 1.7.0.
- No migration, schema, API schema, runtime dependency or Java/Spring version changes.

## Measured database statements

QueryEfficiencyTest counts JDBC prepared statements on the calling thread, including JPA and JDBC. Fixtures contain ten rows, unread peer messages and active friendships. Counts are identical at page limits 2 and 8:

| Read | Statements |
| --- | --- |
| Friends | 3 |
| Direct conversations | 5 |
| Group conversations | 4 |
| Trips | 1 |
| Shared itinerary, 1 or 30 days | 4 |

These are round-trip counts, not latency benchmarks. No indexes were added without query-plan evidence.

## Verification and remaining limits

- Full regression: 165 tests in 43 classes, zero failures/errors/skips, PostgreSQL 17.11. Disposable test containers were removed after execution.
- The controlled social concurrency test failed before the fix with inconsistent terminal states and passed after it. Initial fixture setup mistakes were corrected without weakening assertions.
- Formatting uses google-java-format 1.37.0, AOSP style, official release download and pinned SHA-256. Binaries remain under ignored outputs/tools. Format check passed on all 159 Java files.
- Backend CI checks formatting, runs Maven verify with dedicated PostgreSQL and rejects skipped tests. YAML was parsed locally; the hosted workflow has not run because the branch is not pushed.
- Real SMTP, Google certificate retrieval, R2 availability and production load/latency are not acceptance claims. New Google tests use a provider double and real database/session writes.
- Refresh/password-reset lock ordering remains unchanged; exhaustive concurrent password-change/refresh stress testing is follow-up work. Preserve noRollbackFor semantics for failed OTP attempts and refresh-family revocation.
- Registration OTP hash hardening, Redis/shared rate limiting, multi-instance realtime and durable outbox delivery remain separate work.

## Commands

```powershell
python scripts/format-backend.py --java-home 'C:\Program Files\Java\jdk-26.0.2.1'
python scripts/format-backend.py --check --java-home 'C:\Program Files\Java\jdk-26.0.2.1'
.\scripts\test-trips.ps1 -JavaHome 'C:\Program Files\Java\jdk-26.0.2.1'
.\scripts\test-trips.ps1 -Tests 'SocialPersistenceTest,QueryEfficiencyTest'
```
