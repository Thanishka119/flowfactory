# FlowFactory AI Development Rules

1. Do not rewrite the entire project.
2. Do not delete working functionality.
3. Do not change the technology stack without approval.
4. Do not create duplicate business logic.
5. All stock changes must use InventoryService.
6. Never update inventory directly from controllers.
7. Invoice OCR must not automatically modify inventory.
8. OCR results require verification before purchase confirmation.
9. Enforce RBAC on the backend.
10. Never expose secrets or API keys.
11. Use environment variables for credentials.
12. Validate API input using Zod.
13. Use Prisma for database access.
14. Use database transactions for multi-step stock operations.
15. Prevent negative inventory by default.
16. Add tests for stock-changing operations.
17. Do not introduce unnecessary dependencies.
18. Reuse existing components and services.
19. Do not implement future features unless explicitly requested.
20. Update PROGRESS.md after completing a task.
21. Update API.md when APIs change.
22. Update DATABASE.md when database structure changes.
23. Update ARCHITECTURE.md when architectural decisions change.
24. Keep the application web-only.
25. Do not use fake data for real business functionality.