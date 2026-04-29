# Security Policy

## Reporting a Vulnerability

Do **not** open a public GitHub issue for security vulnerabilities.

Contact via GitHub: [@DevCraftXCoder](https://github.com/DevCraftXCoder)

Response time: 72 hours for acknowledgment, 7 days for critical issues.

---

## Scope

This repository contains prompt text and JSON data only. There is no executable server code, no authentication layer, and no user data handling. The attack surface is minimal.

Security reports are relevant for:

- Prompt injection risks in bundled prompts (prompts that could manipulate AI clients into unsafe behavior when used without review)
- Supply chain concerns in any future build tooling or dependencies added to the project
- Accidental inclusion of secrets, API keys, or PII in prompt examples

---

## Responsible Use

The prompts in this library include security and threat modeling prompts designed for use by security professionals in authorized contexts. Users are responsible for ensuring that prompts referencing security assessments, vulnerability analysis, or threat modeling are used exclusively against systems they own or have explicit written authorization to assess.

---

## No Sensitive Data Policy

This repository must never contain:

- API keys, tokens, or credentials of any kind
- Real IP addresses, hostnames, or infrastructure details
- Personally identifiable information (PII)
- Output from real security assessments

All prompt examples use placeholder values only (e.g. `[paste target here]`, `192.168.1.x`).

---

## Dependency Security

If build tooling or runtime dependencies are added in the future:

- All dependencies must be pinned to specific versions
- Run `npm audit` or `pip audit` on any added tooling before merging
- Dependency updates are standalone commits, never bundled with content changes
