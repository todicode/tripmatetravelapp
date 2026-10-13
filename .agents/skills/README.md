# Shared backend skills

Installed inside this repository so contributors can use the same guidance.

| Skill | Use |
|---|---|
| `java-springboot` | Spring structure, constructor injection, DTOs, validation, transactions and security |
| `spring-boot-testing` | Spring Boot 4 tests, test slices, Mockito, AssertJ and database integration |
| `tripmate-java-backend` | TripMate module boundaries, contract compatibility, clean-code review and PostgreSQL verification |

Repository skills live in `.agents/skills`, following the [OpenAI repository workflow](https://developers.openai.com/blog/skills-agents-sdk). Open a new Codex session in this repository if the skill catalog has not refreshed. `backend/AGENTS.md` routes backend tasks to the relevant skills; explicit `$skill-name` invocation is optional. Other assistants can read the same Markdown files manually.

These files provide coding guidance. They do not change Maven dependencies or run tests automatically. Use the repository's Java 26 / Spring Boot 4.1.1 baseline and its managed JUnit version; upstream Java/JUnit examples are not instructions to downgrade. Read only relevant testing references. Follow existing repository standards when upstream recommendations differ.

## Provenance

`java-springboot` and `spring-boot-testing` are vendored from
[github/awesome-copilot](https://github.com/github/awesome-copilot), revision
`bb035c79620816269e6c9c17ad37a2ae962c0e3b`, installed 2026-10-13.

Original directories: `skills/java-springboot`, `skills/spring-boot-testing`.
The complete directories include linked references. The upstream MIT license is
included as `LICENSE-awesome-copilot.txt`. Upstream content is retained except
trailing whitespace/newline normalization. `tripmate-java-backend` is authored
for this repository and references its existing source documents.

When updating, pin a reviewed upstream revision, retain the license and references,
and check the guidance against the actual project versions before applying it.
