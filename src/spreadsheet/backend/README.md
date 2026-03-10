# Backend System

Backend services for the POLLN spreadsheet system.

## Components
- **Auth Middleware** - JWT authentication and authorization
- **Audit Middleware** - Request logging and auditing
- **Rate Limiter** - API rate limiting
- **WebSocket Server** - Real-time communication
- **GraphQL API** - Flexible data querying

- **REST API** - Standard HTTP endpoints

## Directory Structure
```
backend/
├── auth/
│   ├── AuthMiddleware.ts
│   ├── RateLimiter.ts
│   └── jwt.ts
│
├── audit/
│   ├── Middleware.ts
│   ├── Logger.ts
│   └── Auditor.ts
│
├── api/
│   ├── routes/
│   ├── graphql/
│   └── websocket/
│
└── database/
    ├── connection.ts
    ├── migrations.ts
    └── models/
```

## Key Features
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent API abuse
- **Audit Logging**: Track all operations
- **WebSocket**: Real-time updates
- **GraphQL**: Flexible queries
- **Database**: Persistent storage
