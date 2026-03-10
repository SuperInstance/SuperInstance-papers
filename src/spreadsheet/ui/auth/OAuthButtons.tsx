/**
 * OAuth Buttons Component
 *
 * Renders login buttons for enabled OAuth providers
 */

import React, { useState } from 'react';
import styled from 'styled-components';

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface OAuthButtonsProps {
  providers: OAuthProvider[];
  onLogin: (providerId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'buttons' | 'icons' | 'list';
}

const ButtonContainer = styled.div<{ $variant: OAuthButtonsProps['variant'] }>`
  display: flex;
  flex-direction: ${props => props.$variant === 'list' ? 'column' : 'row'};
  gap: ${props => props.$variant === 'list' ? '0.5rem' : '1rem'};
  align-items: center;
`;

const OAuthButton = styled.button<{
  $providerColor: string;
  $size: OAuthButtonsProps['size'];
  $variant: OAuthButtonsProps['variant'];
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: ${props => {
    switch (props.$size) {
      case 'small': return '0.5rem 1rem';
      case 'large': return '0.875rem 1.5rem';
      default: return '0.625rem 1.25rem';
    }
  }};
  font-size: ${props => {
    switch (props.$size) {
      case 'small': return '0.875rem';
      case 'large': return '1rem';
      default: return '0.9375rem';
    }
  }};
  font-weight: 500;
  border: 1px solid ${props => props.$variant === 'icons' ? 'transparent' : '#d1d5db'};
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  min-width: ${props => props.$variant === 'icons' ? 'auto' : '200px'};
  width: ${props => props.$variant === 'list' ? '100%' : 'auto'};

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: ${props => props.$providerColor};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProviderIcon = styled.span<{ $providerColor: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$size === 'small' ? '1.25rem' : props.$size === 'large' ? '1.75rem' : '1.5rem'};
  height: ${props => props.$size === 'small' ? '1.25rem' : props.$size === 'large' ? '1.75rem' : '1.5rem'};
  color: ${props => props.$providerColor};
  font-size: ${props => props.$size === 'small' ? '1.25rem' : props.$size === 'large' ? '1.75rem' : '1.5rem'};
`;

const ProviderLabel = styled.span<{ $variant: OAuthButtonsProps['variant'] }>`
  display: ${props => props.$variant === 'icons' ? 'none' : 'inline'};
`;

const LoadingSpinner = styled.svg<{ $size: OAuthButtonsProps['size'] }>`
  animation: spin 1s linear infinite;
  width: ${props => props.$size === 'small' ? '1rem' : props.$size === 'large' ? '1.5rem' : '1.25rem'};
  height: ${props => props.$size === 'small' ? '1rem' : props.$size === 'large' ? '1.5rem' : '1.25rem'};

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  width: 100%;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e5e7eb;
  }

  span {
    padding: 0 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
`;

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  providers,
  onLogin,
  loading = false,
  disabled = false,
  className,
  size = 'medium',
  variant = 'buttons'
}) => {
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  const handleLogin = async (providerId: string) => {
    if (loading || disabled) return;

    setLoggingIn(providerId);
    try {
      await onLogin(providerId);
    } finally {
      setLoggingIn(null);
    }
  };

  const getProviderIcon = (provider: OAuthProvider): string => {
    const icons: Record<string, string> = {
      google: 'G',
      github: '',
      microsoft: 'M',
      custom: ''
    };

    return icons[provider.id] || provider.icon;
  };

  return (
    <>
      <ButtonContainer className={className} $variant={variant}>
        {providers.map(provider => (
          <OAuthButton
            key={provider.id}
            $providerColor={provider.color}
            $size={size}
            $variant={variant}
            onClick={() => handleLogin(provider.id)}
            disabled={disabled || loggingIn !== null}
            type="button"
          >
            {loggingIn === provider.id ? (
              <LoadingSpinner viewBox="0 0 24 24" fill="none" $size={size}>
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  opacity="0.25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </LoadingSpinner>
            ) : (
              <>
                <ProviderIcon $providerColor={provider.color} $size={size}>
                  {provider.id === 'github' ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                  ) : (
                    getProviderIcon(provider)
                  )}
                </ProviderIcon>
                <ProviderLabel $variant={variant}>
                  {variant === 'list' ? (
                    <span>Continue with {provider.name}</span>
                  ) : (
                    provider.name
                  )}
                </ProviderLabel>
              </>
            )}
          </OAuthButton>
        ))}
      </ButtonContainer>

      <Divider>
        <span>or</span>
      </Divider>
    </>
  );
};

export default OAuthButtons;
