# Security policy

## Supported versions

Only the latest minor version of fuzzy-toolkit gets security fixes.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/Tfoucher5/fuzzy-toolkit/security/advisories/new).

Include what you found, how to reproduce it, and the impact you see. You'll
get an answer within a week. Once a fix is released, the advisory is
published with credit to you, unless you prefer not.

fuzzy-toolkit runs on text you give it and has no runtime dependencies. The
most likely issues are inputs that make it very slow (catastrophic regular
expressions, quadratic cases): those count as security reports too.
