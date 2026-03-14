"""
SuperInstance SSO Integration
=============================

Single Sign-On (SSO) integration for enterprise identity providers.

Supported Protocols:
- SAML 2.0 (Security Assertion Markup Language)
- OAuth 2.0 / OpenID Connect
- LDAP / Active Directory

Supported Identity Providers:
- Okta
- Azure Active Directory (Entra ID)
- Google Workspace
- OneLogin
- Ping Identity
- Custom SAML/OAuth providers

Features:
- Just-in-time provisioning
- Group-based role assignment
- Multi-factor authentication (MFA)
- Session management
- Audit logging

Author: SuperInstance Enterprise Team
Version: 1.0.0
License: Enterprise (see partnership agreement)
"""

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2AuthorizationCodeBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import json
import logging
from dataclasses import dataclass

# SAML libraries
from saml2 import entity, config
from saml2.client import Saml2Client
from saml2.response import StatusError

# OAuth libraries
from authlib.integrations.fastapi_client import OAuth
from authlib.integrations.requests_client import OAuth2Session

# LDAP libraries
import ldap3
from ldap3.core.exceptions import LDAPException

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration Models
# ============================================================================

class SSOProtocol(str, Enum):
    """Supported SSO protocols"""
    SAML = "saml"
    OAUTH = "oauth"
    LDAP = "ldap"


class IdentityProvider(str, Enum):
    """Supported identity providers"""
    OKTA = "okta"
    AZURE_AD = "azure_ad"
    GOOGLE = "google"
    ONELOGIN = "onelogin"
    PING = "ping"
    CUSTOM = "custom"


class SAMLConfig(BaseModel):
    """SAML configuration"""
    entity_id: str = Field(..., description="SP Entity ID")
    acs_url: str = Field(..., description="Assertion Consumer Service URL")
    slo_url: Optional[str] = Field(None, description="Single Logout URL")
    idp_entity_id: str = Field(..., description="IdP Entity ID")
    idp_sso_url: str = Field(..., description="IdP Single Sign-On URL")
    idp_slo_url: Optional[str] = Field(None, description="IdP Single Logout URL")
    idp_x509_cert: str = Field(..., description="IdP X.509 certificate")
    sp_x509_cert: Optional[str] = Field(None, description="SP X.509 certificate")
    sp_private_key: Optional[str] = Field(None, description="SP private key")
    name_id_format: str = "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
    attribute_mapping: Dict[str, str] = Field(default_factory=lambda: {
        "email": "email",
        "first_name": "firstName",
        "last_name": "lastName",
        "groups": "groups"
    })


class OAuthConfig(BaseModel):
    """OAuth/OIDC configuration"""
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: str = Field(..., description="OAuth client secret")
    authorization_endpoint: str = Field(..., description="Authorization URL")
    token_endpoint: str = Field(..., description="Token URL")
    userinfo_endpoint: str = Field(..., description="Userinfo URL")
    scope: List[str] = Field(default=["openid", "email", "profile"])
    issuer: Optional[str] = Field(None, description="OIDC issuer")
    jwks_uri: Optional[str] = Field(None, description="JWKS endpoint")


class LDAPConfig(BaseModel):
    """LDAP configuration"""
    server_url: str = Field(..., description="LDAP server URL")
    bind_dn: str = Field(..., description="Bind DN for authentication")
    bind_password: str = Field(..., description="Bind password")
    search_base: str = Field(..., description="Search base DN")
    search_filter: str = Field("(sAMAccountName={username})")
    user_attributes: List[str] = Field(default=["cn", "mail", "memberOf"])
    use_ssl: bool = Field(default=True)
    use_tls: bool = Field(default=False)


class GroupMapping(BaseModel):
    """Group to role mapping"""
    group_dn: str = Field(..., description="Group DN or name")
    role: str = Field(..., description="SuperInstance role")
    tier: str = Field(default="strategic", description="Partnership tier")


class SSOConfig(BaseModel):
    """Complete SSO configuration"""
    protocol: SSOProtocol
    provider: IdentityProvider
    enabled: bool = Field(default=True)
    config: Any  # Union[SAMLConfig, OAuthConfig, LDAPConfig]
    group_mappings: List[GroupMapping] = Field(default_factory=list)
    jit_provisioning: bool = Field(default=True, description="Just-in-time user provisioning")
    auto_update: bool = Field(default=True, description="Auto-update user attributes on login")


class SSOUser(BaseModel):
    """SSO user information"""
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    full_name: str
    roles: List[str] = Field(default_factory=list)
    groups: List[str] = Field(default_factory=list)
    tier: str = "research"
    organization: Optional[str] = None
    last_login: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# SAML Integration
# ============================================================================

class SAMLIntegration:
    """SAML 2.0 integration handler"""

    def __init__(self, config: SAMLConfig):
        self.config = config
        self.client = self._create_client()

    def _create_client(self) -> Saml2Client:
        """Create SAML client"""
        sp_config = {
            "entityid": self.config.entity_id,
            "service": {
                "sp": {
                    "endpoints": {
                        "assertion_consumer_service": [
                            (self.config.acs_url, "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST")
                        ],
                    },
                    "allow_unsolicited": True,
                    "authn_requests_signed": False,
                    "logout_requests_signed": True,
                    "want_assertions_signed": True,
                    "want_response_signed": True,
                }
            },
        }

        if self.config.sp_x509_cert and self.config.sp_private_key:
            sp_config["service"]["sp"]["key_file"] = self.config.sp_private_key
            sp_config["service"]["sp"]["cert_file"] = self.config.sp_x509_cert

        idp_config = {
            "entityid": self.config.idp_entity_id,
            "single_sign_on_service": {
                "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect": self.config.idp_sso_url
            },
            "x509cert": self.config.idp_x509_cert
        }

        if self.config.idp_slo_url:
            idp_config["single_logout_service"] = {
                "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect": self.config.idp_slo_url
            }

        sp_config["metadata"] = {
            "remote": [{"idp": idp_config}]
        }

        config_dict = {"entityid": sp_config["entityid"], "service": sp_config["service"]}
        return Saml2Client(config=config_dict)

    def get_login_url(self, relay_state: Optional[str] = None) -> str:
        """Generate SAML login URL"""
        reqid, authn_request = self.client.create_authn_request(
            self.config.idp_entity_id,
            binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        )

        http_args = self.client.apply_binding(
            "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            str(authn_request),
            relay_state,
            "SAMLRequest"
        )

        return http_args["headers"][0][1]

    def process_response(self, saml_response: str) -> Dict[str, Any]:
        """Process SAML response from IdP"""
        try:
            authn_response = self.client.parse_authn_request_response(
                saml_response,
                "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            )

            user_attributes = authn_response.ava
            user_info = self._map_attributes(user_attributes)

            return {
                "success": True,
                "user": user_info,
                "session_index": authn_response.session_index
            }

        except StatusError as e:
            logger.error(f"SAML response error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _map_attributes(self, attributes: Dict[str, List[str]]) -> SSOUser:
        """Map SAML attributes to user model"""
        mapping = self.config.attribute_mapping

        email = attributes.get(mapping["email"], [""])[0]
        first_name = attributes.get(mapping["first_name"], [""])[0]
        last_name = attributes.get(mapping["last_name"], [""])[0]
        groups = attributes.get(mapping["groups"], [])

        return SSOUser(
            id=uuid.uuid4(),
            email=email,
            first_name=first_name,
            last_name=last_name,
            full_name=f"{first_name} {last_name}",
            groups=groups
        )


# ============================================================================
# OAuth/OIDC Integration
# ============================================================================

class OAuthIntegration:
    """OAuth 2.0 / OpenID Connect integration handler"""

    def __init__(self, config: OAuthConfig):
        self.config = config
        self.oauth = OAuth2Session(
            client_id=config.client_id,
            client_secret=config.client_secret,
            scope=config.scope,
            redirect_uri=config.acs_url  # Reuse ACS URL for callback
        )

    def get_login_url(self, state: Optional[str] = None) -> str:
        """Generate OAuth authorization URL"""
        authorization_url, state = self.oauth.authorization_url(
            self.config.authorization_endpoint,
            state=state or str(uuid.uuid4())
        )
        return authorization_url

    def process_callback(self, authorization_code: str) -> Dict[str, Any]:
        """Process OAuth callback"""
        try:
            # Exchange code for token
            token = self.oauth.fetch_token(
                self.config.token_endpoint,
                code=authorization_code
            )

            # Get user info
            userinfo = self.oauth.get(self.config.userinfo_endpoint).json()

            user_info = SSOUser(
                id=uuid.uuid4(),
                email=userinfo.get("email"),
                first_name=userinfo.get("given_name", ""),
                last_name=userinfo.get("family_name", ""),
                full_name=userinfo.get("name", ""),
                groups=userinfo.get("groups", [])
            )

            return {
                "success": True,
                "user": user_info,
                "token": token
            }

        except Exception as e:
            logger.error(f"OAuth callback error: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# ============================================================================
# LDAP Integration
# ============================================================================

class LDAPIntegration:
    """LDAP/Active Directory integration handler"""

    def __init__(self, config: LDAPConfig):
        self.config = config

    def authenticate(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user via LDAP"""
        server = ldap3.Server(
            self.config.server_url,
            use_ssl=self.config.use_ssl,
            get_info=ldap3.ALL
        )

        try:
            # First, bind with service account
            conn = ldap3.Connection(
                server,
                user=self.config.bind_dn,
                password=self.config.bind_password,
                auto_bind=True
            )

            # Search for user
            search_filter = self.config.search_filter.format(username=username)
            conn.search(
                search_base=self.config.search_base,
                search_filter=search_filter,
                attributes=self.config.user_attributes
            )

            if not conn.entries:
                return {
                    "success": False,
                    "error": "User not found"
                }

            user_dn = conn.entries[0].entry_dn
            user_attributes = conn.entries[0].entry_attributes_as_dict

            # Rebind as user to verify password
            conn.rebind(user=user_dn, password=password)
            if not conn.bind():
                return {
                    "success": False,
                    "error": "Invalid password"
                }

            # Extract user info
            user_info = SSOUser(
                id=uuid.uuid4(),
                email=user_attributes.get("mail", [""])[0],
                first_name=user_attributes.get("givenName", [""])[0],
                last_name=user_attributes.get("sn", [""])[0],
                full_name=user_attributes.get("cn", [""])[0],
                groups=user_attributes.get("memberOf", [])
            )

            conn.unbind()

            return {
                "success": True,
                "user": user_info
            }

        except LDAPException as e:
            logger.error(f"LDAP authentication error: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# ============================================================================
# SSO Manager
# ============================================================================

class SSOManager:
    """Main SSO management class"""

    def __init__(self):
        self.configurations: Dict[str, SSOConfig] = {}
        self.integrations: Dict[str, Any] = {}

    def register_configuration(self, org_id: str, config: SSOConfig):
        """Register SSO configuration for organization"""
        self.configurations[org_id] = config

        if config.protocol == SSOProtocol.SAML:
            self.integrations[org_id] = SAMLIntegration(config.config)
        elif config.protocol == SSOProtocol.OAUTH:
            self.integrations[org_id] = OAuthIntegration(config.config)
        elif config.protocol == SSOProtocol.LDAP:
            self.integrations[org_id] = LDAPIntegration(config.config)

        logger.info(f"Registered {config.protocol.value} SSO for {org_id}")

    def get_login_url(self, org_id: str, relay_state: Optional[str] = None) -> str:
        """Get login URL for organization's SSO"""
        if org_id not in self.integrations:
            raise HTTPException(status_code=404, detail="SSO not configured")

        integration = self.integrations[org_id]

        if isinstance(integration, SAMLIntegration):
            return integration.get_login_url(relay_state)
        elif isinstance(integration, OAuthIntegration):
            return integration.get_login_url(relay_state)
        elif isinstance(integration, LDAPIntegration):
            raise HTTPException(status_code=400, detail="LDAP requires username/password")

    def process_saml_response(self, org_id: str, saml_response: str) -> Dict[str, Any]:
        """Process SAML response"""
        if org_id not in self.integrations:
            raise HTTPException(status_code=404, detail="SSO not configured")

        integration = self.integrations[org_id]
        if not isinstance(integration, SAMLIntegration):
            raise HTTPException(status_code=400, detail="Not a SAML integration")

        return integration.process_response(saml_response)

    def process_oauth_callback(self, org_id: str, authorization_code: str) -> Dict[str, Any]:
        """Process OAuth callback"""
        if org_id not in self.integrations:
            raise HTTPException(status_code=404, detail="SSO not configured")

        integration = self.integrations[org_id]
        if not isinstance(integration, OAuthIntegration):
            raise HTTPException(status_code=400, detail="Not an OAuth integration")

        return integration.process_callback(authorization_code)

    def authenticate_ldap(self, org_id: str, username: str, password: str) -> Dict[str, Any]:
        """Authenticate via LDAP"""
        if org_id not in self.integrations:
            raise HTTPException(status_code=404, detail="SSO not configured")

        integration = self.integrations[org_id]
        if not isinstance(integration, LDAPIntegration):
            raise HTTPException(status_code=400, detail="Not an LDAP integration")

        return integration.authenticate(username, password)

    def map_roles_and_tier(self, org_id: str, user: SSOUser, config: SSOConfig) -> SSOUser:
        """Map user's groups to roles and tier"""
        for mapping in config.group_mappings:
            if mapping.group_dn in user.groups:
                if mapping.role not in user.roles:
                    user.roles.append(mapping.role)
                user.tier = mapping.tier

        return user


# ============================================================================
# Pre-configured Providers
# ============================================================================

def get_okta_config(domain: str, client_id: str, client_secret: str) -> OAuthConfig:
    """Get Okta OAuth configuration"""
    return OAuthConfig(
        client_id=client_id,
        client_secret=client_secret,
        authorization_endpoint=f"https://{domain}/oauth2/v1/authorize",
        token_endpoint=f"https://{domain}/oauth2/v1/token",
        userinfo_endpoint=f"https://{domain}/oauth2/v1/userinfo",
        issuer=f"https://{domain}/oauth2/default",
        scope=["openid", "email", "profile", "groups"]
    )


def get_azure_ad_config(tenant_id: str, client_id: str, client_secret: str) -> OAuthConfig:
    """Get Azure AD OAuth configuration"""
    return OAuthConfig(
        client_id=client_id,
        client_secret=client_secret,
        authorization_endpoint=f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize",
        token_endpoint=f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        userinfo_endpoint=f"https://graph.microsoft.com/v1.0/me",
        issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0",
        scope=["openid", "email", "profile", "User.Read"]
    )


def get_google_config(client_id: str, client_secret: str) -> OAuthConfig:
    """Get Google OAuth configuration"""
    return OAuthConfig(
        client_id=client_id,
        client_secret=client_secret,
        authorization_endpoint="https://accounts.google.com/o/oauth2/v2/auth",
        token_endpoint="https://oauth2.googleapis.com/token",
        userinfo_endpoint="https://www.googleapis.com/oauth2/v2/userinfo",
        issuer="https://accounts.google.com",
        scope=["openid", "email", "profile"]
    )


# ============================================================================
# Global SSO Manager Instance
# ============================================================================

sso_manager = SSOManager()


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Example: Configure Okta SSO for an organization
    okta_config = SSOConfig(
        protocol=SSOProtocol.OAUTH,
        provider=IdentityProvider.OKTA,
        enabled=True,
        config=get_okta_config(
            domain="example.okta.com",
            client_id="your-client-id",
            client_secret="your-client-secret"
        ),
        group_mappings=[
            GroupMapping(group_dn="SuperInstance-Admins", role="admin", tier="enterprise"),
            GroupMapping(group_dn="SuperInstance-Users", role="developer", tier="strategic"),
        ],
        jit_provisioning=True,
        auto_update=True
    )

    sso_manager.register_configuration("org-123", okta_config)

    # Get login URL
    login_url = sso_manager.get_login_url("org-123")
    print(f"Login URL: {login_url}")
