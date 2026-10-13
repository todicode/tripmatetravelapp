# Backend development guidance

For Java implementation, review, or refactoring, use the repository skill at
`../.agents/skills/tripmate-java-backend/SKILL.md`.

Use `java-springboot` for Spring design and `spring-boot-testing` when choosing or
changing tests. Both are in `../.agents/skills/`. Read only references relevant to
the task; contributors do not need to name a skill in every request.

The versions in `pom.xml`, `../docs/CODING_STANDARDS.md`, and the existing API
contract take precedence over generic upstream examples. Preserve the modular
monolith boundaries and the affected module's existing JDBC/JPA approach.

Run database integration tests against dedicated PostgreSQL test databases and
report skipped tests explicitly. Use `README.md` and the affected feature's
documentation for test commands. Do not infer test success merely from a zero
Maven exit code.
