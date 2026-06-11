# Test Factories

Shared test data builders (e.g. `buildUser()`, `buildOrg()`) for use in colocated unit tests and E2E.

**Add here when:** Two or more test files need the same fixture shapes. Until then, keep builders in `tests/utils/apiMocks.ts` or colocated with the tests that use them.

**Example:** `user.ts` exporting `buildUser(overrides?)` that returns a valid `AuthUser`-shaped object for mocking.
