/**
 * Provider Settings Component
 *
 * UI for managing linked OAuth providers
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  List,
  Button,
  Avatar,
  Typography,
  Space,
  Tag,
  Switch,
  Modal,
  message,
  Popconfirm,
  Divider
} from 'antd';
import {
  LinkOutlined,
  UnlinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  GoogleOutlined,
  GithubOutlined,
  MicrosoftOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

export interface LinkedProvider {
  id: string;
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  picture?: string;
  linkedAt: number;
  lastUsed: number;
  isPrimary: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  canLink: boolean;
  scopes: string[];
}

export interface ProviderSettingsProps {
  linkedProviders: LinkedProvider[];
  availableProviders: ProviderConfig[];
  onLinkProvider: (providerId: string) => Promise<void>;
  onUnlinkProvider: (providerId: string, providerUserId: string) => Promise<void>;
  onSetPrimary: (providerId: string, providerUserId: string) => Promise<void>;
  loading?: boolean;
}

const SettingsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const ProviderCard = styled(Card)`
  margin-bottom: 1rem;

  .ant-card-head {
    border-bottom: 1px solid #f0f0f0;
  }

  .ant-card-body {
    padding: 1.5rem;
  }
`;

const ProviderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const ProviderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ProviderAvatar = styled(Avatar)`
  background: ${props => props.$color || '#1890ff'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`;

const ProviderInfo = styled.div`
  flex: 1;
`;

const ProviderName = styled(Title)`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const ProviderEmail = styled(Text)`
  font-size: 0.875rem;
  color: #6b7280;
`;

const ProviderActions = styled(Space)`
  align-items: center;
`;

const ScopesSection = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
`;

const ScopesTitle = styled(Text)`
  font-weight: 600;
  font-size: 0.875rem;
  display: block;
  margin-bottom: 0.5rem;
`;

const ScopesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ScopeTag = styled(Tag)`
  margin: 0;
  font-size: 0.75rem;
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
`;

const StatLabel = styled(Text)`
  font-size: 0.875rem;
  color: #6b7280;
  display: block;
  margin-bottom: 0.25rem;
`;

const StatValue = styled(Text)`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  color: #d1d5db;
  margin-bottom: 1rem;
`;

const getProviderIcon = (provider: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    google: <GoogleOutlined />,
    github: <GithubOutlined />,
    microsoft: <MicrosoftOutlined />
  };

  return icons[provider] || <SettingOutlined />;
};

const getProviderColor = (provider: string): string => {
  const colors: Record<string, string> = {
    google: '#4285f4',
    github: '#333',
    microsoft: '#00a4ef'
  };

  return colors[provider] || '#6b7280';
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatRelativeTime = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return formatDate(timestamp);
};

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({
  linkedProviders,
  availableProviders,
  onLinkProvider,
  onUnlinkProvider,
  onSetPrimary,
  loading = false
}) => {
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  const handleUnlink = async (providerId: string, providerUserId: string) => {
    setUnlinkingProvider(`${providerId}:${providerUserId}`);
    try {
      await onUnlinkProvider(providerId, providerUserId);
      message.success('Account unlinked successfully');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to unlink account');
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const handleSetPrimary = async (providerId: string, providerUserId: string) => {
    setSettingPrimary(`${providerId}:${providerUserId}`);
    try {
      await onSetPrimary(providerId, providerUserId);
      message.success('Primary account updated');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update primary account');
    } finally {
      setSettingPrimary(null);
    }
  };

  const stats = {
    totalLinks: linkedProviders.length,
    uniqueProviders: new Set(linkedProviders.map(p => p.provider)).size,
    primaryLinks: linkedProviders.filter(p => p.isPrimary).length
  };

  return (
    <SettingsContainer>
      {/* Statistics */}
      <StatsSection>
        <StatCard>
          <StatLabel>Linked Accounts</StatLabel>
          <StatValue>{stats.totalLinks}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Providers</StatLabel>
          <StatValue>{stats.uniqueProviders}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Primary</StatLabel>
          <StatValue>{stats.primaryLinks}</StatValue>
        </StatCard>
      </StatsSection>

      <Title level={3} style={{ marginBottom: '1.5rem' }}>
        Connected Accounts
      </Title>

      {linkedProviders.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <LinkOutlined />
          </EmptyIcon>
          <Title level={4}>No linked accounts</Title>
          <Paragraph type="secondary">
            Link your accounts from other providers to sign in quickly
          </Paragraph>
          <Button type="primary" icon={<LinkOutlined />}>
            Link Your First Account
          </Button>
        </EmptyState>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {linkedProviders.map(provider => (
            <ProviderCard
              key={`${provider.provider}:${provider.providerUserId}`}
              size="small"
            >
              <ProviderHeader>
                <ProviderTitle>
                  {provider.picture ? (
                    <ProviderAvatar src={provider.picture} $color={getProviderColor(provider.provider)} />
                  ) : (
                    <ProviderAvatar $color={getProviderColor(provider.provider)}>
                      {getProviderIcon(provider.provider)}
                    </ProviderAvatar>
                  )}

                  <ProviderInfo>
                    <ProviderName level={5}>
                      {provider.name}
                      {provider.isPrimary && (
                        <Tag color="blue" style={{ marginLeft: '0.5rem' }}>
                          Primary
                        </Tag>
                      )}
                    </ProviderName>
                    <ProviderEmail>{provider.email}</ProviderEmail>
                    <Text type="secondary" style={{ fontSize: '0.75rem' }}>
                      Last used {formatRelativeTime(provider.lastUsed)}
                    </Text>
                  </ProviderInfo>
                </ProviderTitle>

                <ProviderActions>
                  {!provider.isPrimary && linkedProviders.length > 1 && (
                    <Button
                      size="small"
                      onClick={() => handleSetPrimary(provider.provider, provider.providerUserId)}
                      loading={settingPrimary === `${provider.provider}:${provider.providerUserId}`}
                    >
                      Set as Primary
                    </Button>
                  )}

                  <Popconfirm
                    title="Unlink this account?"
                    description={
                      provider.isPrimary
                        ? 'You cannot unlink your primary account. Set another account as primary first.'
                        : 'You will need to sign in with another account.'
                    }
                    onConfirm={() => handleUnlink(provider.provider, provider.providerUserId)}
                    disabled={provider.isPrimary}
                    okText="Unlink"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<UnlinkOutlined />}
                      disabled={provider.isPrimary || unlinkingProvider !== null}
                      loading={unlinkingProvider === `${provider.provider}:${provider.providerUserId}`}
                    >
                      Unlink
                    </Button>
                  </Popconfirm>
                </ProviderActions>
              </ProviderHeader>

              <ScopesSection>
                <ScopesTitle>Permissions</ScopesTitle>
                <ScopesList>
                  {availableProviders
                    .find(p => p.id === provider.provider)
                    ?.scopes.map(scope => (
                      <ScopeTag key={scope}>{scope}</ScopeTag>
                    ))}
                </ScopesList>
              </ScopesSection>

              <Divider style={{ margin: '1rem 0' }} />

              <Space>
                <Text type="secondary" style={{ fontSize: '0.75rem' }}>
                  Linked {formatDate(provider.linkedAt)}
                </Text>
                <Text type="secondary" style={{ fontSize: '0.75rem' }}>
                  Provider: {provider.provider}
                </Text>
              </Space>
            </ProviderCard>
          ))}
        </Space>
      )}

      {/* Available Providers */}
      <Title level={4} style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        Link Another Account
      </Title>

      <List
        grid={{
          gutter: 16,
          xs: 1,
          sm: 2,
          md: 3,
          lg: 3,
          xl: 3,
          xxl: 3
        }}
        dataSource={availableProviders.filter(
          p => p.enabled && !linkedProviders.some(lp => lp.provider === p.id)
        )}
        renderItem={provider => (
          <List.Item>
            <Card
              size="small"
              hoverable
              onClick={() => onLinkProvider(provider.id)}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <Avatar
                size={48}
                icon={getProviderIcon(provider.id)}
                style={{
                  backgroundColor: getProviderColor(provider.id),
                  marginBottom: '0.5rem'
                }}
              />
              <div>
                <Text strong>{provider.name}</Text>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </SettingsContainer>
  );
};

export default ProviderSettings;
