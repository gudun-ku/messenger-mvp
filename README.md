# Messenger MVP - Authentication Service

A production-ready authentication service built with Node.js/TypeScript, featuring JWT tokens, Google OAuth, and comprehensive security measures.

## 🏗️ What's Been Implemented

This authentication service provides a complete, production-ready foundation for the Messenger MVP with the following components:

### ✅ Core Features Delivered

1. **JWT Token Management**
   - Secure access/refresh token pattern
   - Token rotation on refresh
   - Device-specific token tracking
   - Automatic cleanup of expired tokens

2. **Google OAuth Integration**
   - Google ID token verification
   - User account creation and linking
   - Profile synchronization
   - Account management

3. **Security Implementation**
   - Multi-layer rate limiting (IP + email based)
   - Input validation with Zod schemas
   - CORS protection
   - Helmet security headers
   - SQL injection protection
   - Token encryption (SHA-256)

4. **Database Architecture**
   - PostgreSQL schema with proper indexing
   - Migration system
   - Connection pooling
   - Transaction support

5. **Comprehensive Testing**
   - Unit tests for all services
   - Integration tests for API endpoints
   - Jest configuration with coverage
   - Mocking for external dependencies

6. **Logging & Monitoring**
   - Structured logging with Winston
   - Request/response logging
   - Error tracking
   - Health check endpoints

7. **Docker Development Environment**
   - Multi-stage Dockerfile
   - Docker Compose setup
   - Development and production configurations
   - Service orchestration

8. **Configuration Management**
   - Environment validation with Zod
   - Type-safe configuration
   - Development setup scripts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)
- Redis 7+ (or use Docker)

### Development Setup

1. **Clone and setup**:
   ```bash
   git clone <repo-url>
   cd messenger-mvp
   ```

2. **Run setup script**:
   ```bash
   cd backend
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. **Configure environment**:
   ```bash
   # Edit .env file with your actual values
   nano .env
   ```

4. **Start development**:
   ```bash
   # Start all services with Docker
   docker-compose up -d
   
   # Or start auth service only
   cd backend
   npm run dev
   ```

### Manual Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**:
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run migrations
   npm run migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📝 API Documentation

### Authentication Endpoints

#### POST `/auth/google`
Authenticate with Google OAuth ID token.

**Request**:
```json
{
  "idToken": "google_id_token_here",
  "deviceInfo": {
    "deviceId": "unique_device_id",
    "userAgent": "client_user_agent"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "isNewUser": false
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "refresh_token",
      "expiresIn": 900
    }
  }
}
```

#### POST `/auth/refresh`
Refresh expired access token.

#### POST `/auth/logout`
Logout and revoke refresh token.

#### POST `/auth/logout-all`
Logout from all devices.

#### GET `/auth/me`
Get current user information.

#### DELETE `/auth/account`
Deactivate user account.

### Health Check

```bash
curl http://localhost:3001/health
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run auth service tests only
npm run test:auth

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📊 Architecture

For detailed architecture documentation, diagrams, and implementation details, see:

**[📖 Authentication Architecture Documentation](./docs/AUTHENTICATION_ARCHITECTURE.md)**

This document includes:
- System overview and component diagrams
- Database schema with relationships
- Authentication flow sequences
- Security implementation details
- Docker architecture
- Testing strategy
- Performance characteristics
- Future enhancement plans

## 🔒 Security Features

- **JWT Authentication**: Secure access/refresh token pattern
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Zod schema validation for all inputs
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: Standard security headers
- **SQL Injection Protection**: Parameterized queries
- **Password Hashing**: Bcrypt for sensitive data
- **Token Encryption**: SHA-256 hashing for stored tokens

## 🚀 Deployment

### Docker Production Build

```bash
# Build production image
docker build -t messenger-auth:latest .

# Run production container
docker run -d \
  --name messenger-auth \
  -p 3001:3001 \
  -e DATABASE_URL="your_db_url" \
  -e JWT_ACCESS_SECRET="your_secret" \
  messenger-auth:latest
```

### Environment Variables

Required environment variables:

```bash
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_ACCESS_SECRET=your_32_char_secret_key_here
JWT_REFRESH_SECRET=your_32_char_refresh_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

See `.env.example` for all available options.

## 🛠️ Development

### Project Structure

```
backend/
├── services/
│   └── auth/                 # Authentication service
│       ├── server.ts         # Express server setup
│       ├── auth.routes.ts    # API routes
│       ├── jwt.service.ts    # JWT token management
│       ├── oauth.service.ts  # Google OAuth integration
│       └── *.test.ts         # Test files
├── shared/
│   ├── config/               # Configuration management
│   ├── database/             # Database connection & migrations
│   ├── middleware/           # Express middleware
│   └── utils/                # Utility functions
└── scripts/                  # Development scripts
```

### Available Scripts

```bash
npm run dev              # Start development server
npm run dev:signaling    # Start signaling service
npm run build            # Build for production
npm run start            # Start production server
npm run test             # Run tests
npm run test:auth        # Run auth tests only
npm run test:watch       # Run tests in watch mode
npm run migrate          # Run database migrations
```

## 🎯 Next Steps

To continue building the messenger MVP:

1. **Messaging Service**: Implement WebSocket-based real-time messaging
2. **Signaling Service**: Set up WebRTC signaling for video calls
3. **Media Service**: Handle file uploads and media processing
4. **Android App**: Integrate with authentication endpoints
5. **Infrastructure**: Deploy to Yandex Cloud with Terraform

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Write tests for new features
3. Use conventional commits
4. Update documentation
5. Ensure all tests pass

## 📄 License

MIT License - see LICENSE file for details.# Database connection fix Sun Aug 24 14:37:51 CEST 2025
