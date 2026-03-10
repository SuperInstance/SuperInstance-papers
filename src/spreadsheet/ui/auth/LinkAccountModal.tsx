/**
 * Link Account Modal Component
 *
 * Modal for linking additional OAuth providers to an existing account
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal, Button, Typography, Space, Alert } from 'antd';
import {
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

export interface LinkedAccount {
  id: string;
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  picture?: string;
  linkedAt: number;
}

export interface AvailableProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface LinkAccountModalProps {
  visible: boolean;
  onClose: () => void;
  linkedAccounts: LinkedAccount[];
  availableProviders: AvailableProvider[];
  onLinkProvider: (providerId: string) => Promise<void>;
  onUnlinkProvider: (providerId: string, providerUserId: string) => Promise<void>;
  loading?: boolean;
}

const ModalContent = styled.div`
  padding: 1rem 0;
`;

const AccountsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const AccountItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`;

const AccountInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const AccountAvatar = styled.img`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
`;

const AccountAvatarFallback = styled.div<{ $color: string }>`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
`;

const AccountDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const AccountName = styled(Text)`
  font-weight: 500;
  font-size: 0.9375rem;
`;

const AccountEmail = styled(Text)`
  font-size: 0.875rem;
  color: #6b7280;
`;

const AccountBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
`;

const PrimaryBadge = styled(AccountBadge)`
  background: #dbeafe;
  color: #1e40af;
`;

const ProviderButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ProviderButton = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: ${props => props.$color};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProviderIcon = styled.span<{ $color: string }>`
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  font-size: 1.25rem;
  font-weight: 600;
`;

const ProviderLabel = styled.span`
  flex: 1;
  text-align: left;
  font-weight: 500;
  font-size: 0.9375rem;
`;

const LinkIcon = styled(LinkOutlined)`
  font-size: 1rem;
  color: #6b7280;
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 1rem;
`;

const getProviderInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const LinkAccountModal: React.FC<LinkAccountModalProps> = ({
  visible,
  onClose,
  linkedAccounts,
  availableProviders,
  onLinkProvider,
  onUnlinkProvider,
  loading = false
}) => {
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkedProviderIds = linkedAccounts.map(la => la.provider);
  const availableToLink = availableProviders.filter(
    p => !linkedProviderIds.includes(p.id)
  );

  const handleLinkProvider = async (providerId: string) => {
    setError(null);
    setLinkingProvider(providerId);
    try {
      await onLinkProvider(providerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlinkProvider = async (providerId: string, providerUserId: string) => {
    setError(null);
    setUnlinkingProvider(providerId);
    try {
      await onUnlinkProvider(providerId, providerUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink account');
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const getProviderIcon = (provider: AvailableProvider | LinkedAccount): string => {
    if ('picture' in provider && provider.picture) {
      return '';
    }

    const icons: Record<string, string> = {
      google: 'G',
      github: '',
      microsoft: 'M',
      custom: '⚙'
    };

    return icons[provider.provider] || provider.provider[0].toUpperCase();
  };

  return (
    <Modal
      title="Manage Linked Accounts"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      width={600}
    >
      <ModalContent>
        {error && (
          <StyledAlert
            message={error}
            type="error"
            closable
            onClose={() => setError(null)}
          />
        )}

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Linked Accounts */}
          <div>
            <Title level={5} style={{ marginBottom: '1rem' }}>
              Linked Accounts ({linkedAccounts.length})
            </Title>

            {linkedAccounts.length === 0 ? (
              <Text type="secondary">No accounts linked yet</Text>
            ) : (
              <AccountsList>
                {linkedAccounts.map(account => (
                  <AccountItem key={account.id}>
                    <AccountInfo>
                      {account.picture ? (
                        <AccountAvatar src={account.picture} alt={account.name} />
                      ) : (
                        <AccountAvatarFallback $color="#6b7280">
                          {getProviderInitials(account.name)}
                        </AccountAvatarFallback>
                      )}

                      <AccountDetails>
                        <AccountName>{account.name}</AccountName>
                        <AccountEmail>{account.email}</AccountEmail>
                      </AccountDetails>

                      <AccountBadge>{account.provider}</AccountBadge>
                    </AccountInfo>

                    <Button
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                      loading={unlinkingProvider === account.provider}
                      disabled={linkedAccounts.length === 1}
                      onClick={() => handleUnlinkProvider(account.provider, account.providerUserId)}
                    >
                      Unlink
                    </Button>
                  </AccountItem>
                ))}
              </AccountsList>
            )}
          </div>

          {/* Available Providers */}
          {availableToLink.length > 0 && (
            <div>
              <Title level={5} style={{ marginBottom: '1rem' }}>
                Link Another Account
              </Title>

              <ProviderButtons>
                {availableToLink.map(provider => (
                  <ProviderButton
                    key={provider.id}
                    $color={provider.color}
                    onClick={() => handleLinkProvider(provider.id)}
                    disabled={linkingProvider !== null}
                  >
                    <ProviderIcon $color={provider.color}>
                      {getProviderIcon({ ...provider, provider: provider.id })}
                    </ProviderIcon>
                    <ProviderLabel>
                      {linkingProvider === provider.id ? (
                        <span>
                          <LoadingOutlined /> Linking...
                        </span>
                      ) : (
                        `Link ${provider.name}`
                      )}
                    </ProviderLabel>
                    <LinkIcon />
                  </ProviderButton>
                ))}
              </ProviderButtons>
            </div>
          )}
        </Space>
      </ModalContent>
    </Modal>
  );
};

export default LinkAccountModal;
