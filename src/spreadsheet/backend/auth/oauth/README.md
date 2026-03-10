# OAuth/OIDC Authentication for POLLN

Complete OAuth 2.0 and OpenID Connect implementation for the POLLN spreadsheet backend.

## Features

### Core OAuth Functionality
- **Multiple Provider Support**: Google, GitHub, Microsoft out of the box
- **Custom Providers**: Support for any OAuth 2.0/OIDC compliant provider
- **PKCE Flow**: Proof Key for Code Exchange for enhanced security
- **Token Management**: Automatic token refresh and validation
- **Account Linking**: Link multiple OAuth providers to a single account
- **Device Code Flow**: For CLI and mobile applications (Microsoft, custom providers)

### OpenID Connect
- **Discovery**: Automatic endpoint discovery via `.well-known/openid-configuration`
- **ID Token Validation**: Full JWT claim validation
- **UserInfo**: Fetch user profile information
- **JWKS Support**: JSON Web Key Set for signature verification

### Security Features
- **State Parameter**: CSRF protection
- **PKCE**: Authorization code interception protection
- **Token Validation**: Expiration and claim verification
- **Secure Storage**: In-memory session management with auto-cleanup

## Architecture

### Backend Components

```
src/spreadsheet/backend/auth/oauth/
├── OAuthManager.ts          # Main OAuth client manager
├── OIDCService.ts           # OpenID Connect operations
├── AccountLinking.ts        # Multi-provider account linking
├── AuthorizationCodeFlow.ts # OAuth 2.0 authorization code flow
├── DeviceCodeFlow.ts        # Device authorization grant (RFC 8628)
├── Providers/
│   ├── google.ts           # Google OAuth 2.0 provider
│   ├── github.ts           # GitHub OAuth provider
│   ├── microsoft.ts        # Microsoft Azure AD provider
│   ├── CustomProvider.ts   # Custom OAuth/OIDC provider
│   └── index.ts            # Provider factory and registry
├── types.ts                # Shared type definitions
├── auth-oauth.test.ts      # Comprehensive test suite
└── index.ts                # Module exports
```

### UI Components

```
src/spreadsheet/ui/auth/
├── OAuthButtons.tsx        # Provider login buttons
├── LinkAccountModal.tsx    # Account linking modal
├── ProviderSettings.tsx    # Manage linked providers
└── index.ts                # Component exports
```

### API Router

```
src/spreadsheet/backend/api/
└── OAuthRouter.ts          # Express routes for OAuth endpoints
```

## Usage

### 1. Backend Setup

```typescript
import { OAuthManager, AccountLinkingService } from './auth/oauth/index.js';
import { createOAuthRouter } from './api/OAuthRouter.js';

// Initialize OAuth Manager
const oauthManager = new OAuthManager({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET
  }
}, 'http://localhost:3000');

// Initialize Account Linking Service
const accountLinking = new AccountLinkingService(oauthManager);

// Create OAuth Router
const oauthRouter = createOAuthRouter({
  oauthManager,
  accountLinking,
  baseUrl: 'http://localhost:3000'
});

// Mount in Express app
app.use('/oauth', oauthRouter);
```

### 2. Frontend Integration

```typescript
import { OAuthButtons } from './ui/auth/index.js';

function LoginPage() {
  const handleLogin = async (providerId: string) => {
    // Redirect to OAuth provider
    const response = await fetch(`/oauth/authorize/${providerId}`);
    const { authorization_url } = await response.json();
    window.location.href = authorization_url;
  };

  return (
    <OAuthButtons
      providers={[
        { id: 'google', name: 'Google', icon: 'G', color: '#4285f4' },
        { id: 'github', name: 'GitHub', icon: '', color: '#333' },
        { id: 'microsoft', name: 'Microsoft', icon: 'M', color: '#00a4ef' }
      ]}
      onLogin={handleLogin}
    />
  );
}
```

### 3. Handling OAuth Callback

```typescript
// In your callback handler
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');

fetch('/oauth/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'google', code, state })
})
  .then(res => res.json())
  .then(data => {
    // Store JWT token
    localStorage.setItem('token', data.token);
    // Redirect to app
    window.location.href = '/dashboard';
  });
```

### 4. Managing Linked Accounts

```typescript
import { ProviderSettings } from './ui/auth/index.js';

function SettingsPage() {
  const [linkedProviders, setLinkedProviders] = useState([]);

  const handleLinkProvider = async (providerId: string) => {
    // Initiate OAuth flow for linking
    const response = await fetch(`/oauth/authorize/${providerId}`);
    const { authorization_url } = await response.json();
    window.location.href = authorization_url;
  };

  const handleUnlinkProvider = async (providerId: string, providerUserId: string) => {
    await fetch(`/oauth/link/${providerId}`, { method: 'DELETE' });
    // Refresh linked accounts
  };

  return (
    <ProviderSettings
      linkedProviders={linkedProviders}
      availableProviders={availableProviders}
      onLinkProvider={handleLinkProvider}
      onUnlinkProvider={handleUnlinkProvider}
      onSetPrimary={handleSetPrimary}
    />
  );
}
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/providers` | List enabled OAuth providers |
| GET | `/oauth/authorize/:provider` | Generate authorization URL |
| POST | `/oauth/callback` | Handle OAuth callback |
| GET | `/oauth/device/code` | Request device authorization code |

### Authenticated Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/account` | Get current user account |
| POST | `/oauth/link` | Link provider to account |
| DELETE | `/oauth/link/:provider` | Unlink provider |
| PUT | `/oauth/primary/:provider` | Set primary provider |
| POST | `/oauth/refresh` | Refresh access token |
| POST | `/oauth/logout` | Logout and revoke tokens |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/stats` | Get OAuth statistics |

## Configuration

### Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Custom Provider (optional)
CUSTOM_PROVIDER_CLIENT_ID=your-custom-client-id
CUSTOM_PROVIDER_CLIENT_SECRET=your-custom-client-secret
CUSTOM_PROVIDER_DISCOVERY_URL=https://your-provider/.well-known/openid-configuration
```

### OAuth Provider Setup

#### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/callback`

#### GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Register a new OAuth application
3. Set authorization callback URL: `http://localhost:3000/auth/callback`

#### Microsoft

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure AD
3. Add a web platform with redirect URI: `http://localhost:3000/auth/callback`
4. Grant permissions (e.g., User.Read)

#### Custom Provider

```typescript
ProviderFactory.createAndRegister('custom', {
  type: 'custom',
  config: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUri: 'http://localhost:3000/auth/callback',
    endpoints: {
      authorization: 'https://your-provider/oauth/authorize',
      token: 'https://your-provider/oauth/token',
      userInfo: 'https://your-provider/oauth/userinfo',
      discovery: 'https://your-provider/.well-known/openid-configuration'
    },
    issuer: 'https://your-provider',
    pkce: true,
    scopes: ['openid', 'email', 'profile']
  }
});
```

## Testing

Run the comprehensive test suite:

```bash
npm test src/spreadsheet/backend/auth/oauth/auth-oauth.test.ts
```

Test coverage includes:
- Provider management
- Authorization URL generation
- Token exchange and refresh
- User profile fetching
- Account linking and unlinking
- ID token validation
- Device code flow
- Error scenarios

## Security Considerations

1. **Never commit client secrets to version control**
2. **Use HTTPS in production**
3. **Validate redirect URIs**
4. **Implement rate limiting on OAuth endpoints**
5. **Use secure, HTTP-only cookies for session tokens**
6. **Implement PKCE for all public clients**
7. **Validate all OAuth responses**
8. **Implement proper logout with token revocation**

## Best Practices

1. **State Management**: Store OAuth state in memory with expiration
2. **Error Handling**: Provide clear error messages for debugging
3. **Logging**: Log all OAuth operations for audit trails
4. **Token Refresh**: Implement automatic token refresh before expiration
5. **Account Linking**: Prevent duplicate accounts by email matching
6. **Provider Fallback**: Allow users to switch between providers
7. **Session Cleanup**: Automatically clean up expired sessions

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a pull request.
