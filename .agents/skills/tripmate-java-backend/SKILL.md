---
name: tripmate-java-backend
description: Implement, review, or refactor TripMate Java backend changes using the repository's module boundaries, API contract, transaction rules, and PostgreSQL test workflow.
---

# TripMate Java backend

Use this workflow for Java changes under `backend/`. Keep the requested feature or review scope; the skill does not authorize pushing, deploying, changing credentials, or changing unrelated code.

## Establish the relevant constraints

- Read [coding standards](../../../docs/CODING_STANDARDS.md) for module boundaries and naming, and the affected feature's implementation notes when present.
- Check [pom.xml](../../../backend/pom.xml) and existing imports before choosing framework APIs. The current baseline is Java 26 / Spring Boot 4.1.1 with the Boot-managed JUnit version. Do not downgrade to Java 17 or JUnit 5 because an upstream example uses those versions.
- For HTTP changes, read the affected operation and schemas in [openapi.json](../../../docs/api/openapi.json) and [team rules](../../../docs/api/TEAM_RULES.md). Preserve envelopes, error codes, bigint strings, pagination, and retry semantics unless the task explicitly changes the contract.
- For persistence changes, inspect current Flyway migrations and [reference SQL](../../../backend/database/tripmate_v1.sql). Add a new migration rather than editing one already applied. Check the latest remote migration numbering before integration with teammate work.

## Implement or review

- Keep controllers focused on HTTP mapping and validation, application services on use cases, and repositories on persistence. Use the public API of another feature rather than importing its internal repositories. `shared` contains reusable technical infrastructure, not feature business rules.
- Follow the existing JPA or JDBC choice of the affected module. Do not rewrite JDBC to JPA, or introduce interfaces and forwarding layers, solely to match a generic skill example.
- Check permissions against the authenticated actor at the use-case boundary. Read access through a group does not imply write access to a linked resource. Do not log tokens, passwords, or provider secrets.
- Make multi-record use cases atomic. When concurrency matters, verify the lock/version/idempotency strategy against actual PostgreSQL behavior. Avoid holding database locks while calling external providers; publish externally visible events after commit.
- During a requested cleanup, inspect callers before removing code. Consolidate repeated business rules only where their meaning is the same. Extract methods to clarify responsibilities, not to satisfy arbitrary line counts. Preserve public behavior and do not create unused abstractions or helpers.
- For query changes, look for N+1 access, unnecessary fetches, unstable pagination, and indexes matching the actual filters/order. Use parameterized SQL. Measure plans on a test database before making performance claims; `EXPLAIN ANALYZE` executes its statement.

## Verify and hand off

- Use the installed `java-springboot` skill for framework design and `spring-boot-testing` for test selection. Their examples are guidance; repository versions and conventions take precedence. Coverage percentages and complexity thresholds are not automatic reasons to change dependencies or expand scope.
- Run the narrowest meaningful checks, then the required related regression checks. Test observable behavior rather than source text, private methods, or implementation-shaped assertions.
- Database, migration, permissions, rollback, and concurrency claims require PostgreSQL integration checks on a dedicated Docker test database. Use the commands in [backend README](../../../backend/README.md) and the relevant feature documentation. Do not use the user's development database as the test fixture.
- If integration tests are gated by environment variables, confirm they actually ran. Report executed, failed, and skipped counts; a successful Maven exit with skipped integration tests is not database acceptance.
- For external providers, distinguish unit tests/test doubles from real HTTP provider checks. Report changes, verification, and remaining limitations. Update the affected API/schema/feature notes when behavior changes.
