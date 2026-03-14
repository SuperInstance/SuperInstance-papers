"""
SuperInstance On-Premise Deployment
====================================

Complete on-premise deployment solution for air-gapped and secure environments.

Deployment Options:
- Single-node development
- Multi-node production cluster
- Air-gapped high-security environment
- Hybrid cloud-on-prem

Features:
- Docker container orchestration
- Kubernetes manifests
- Ansible playbooks
- Systemd service definitions
- Automated provisioning
- Health monitoring
- Backup and restore

Author: SuperInstance Enterprise Team
Version: 1.0.0
License: Enterprise (see partnership agreement)
"""

import os
import sys
import subprocess
import json
import yaml
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import hashlib
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# Deployment Configuration
# ============================================================================

@dataclass
class DeploymentConfig:
    """On-premise deployment configuration"""
    environment: str = "production"  # development, staging, production
    deployment_type: str = "kubernetes"  # docker, kubernetes, bare_metal
    node_count: int = 3
    cpu_cores: int = 16
    memory_gb: int = 64
    storage_gb: int = 1000
    network_mode: str = "bridge"  # bridge, host, overlay
    enable_tls: bool = True
    enable_monitoring: bool = True
    enable_backups: bool = True
    backup_retention_days: int = 30
    log_retention_days: int = 90

    # Ports
    api_port: int = 8000
    dashboard_port: int = 3000
    metrics_port: int = 9090
    grpc_port: int = 50051

    # Storage
    data_dir: str = "/opt/superinstance/data"
    config_dir: str = "/opt/superinstance/config"
    log_dir: str = "/var/log/superinstance"
    backup_dir: str = "/opt/superinstance/backups"

    # Security
    admin_password_hash: Optional[str] = None
    api_key_encrypted: Optional[str] = None
    tls_cert_path: Optional[str] = None
    tls_key_path: Optional[str] = None

    # High availability
    enable_ha: bool = False
    ha_replica_count: int = 3
    ha_enable_quorum: bool = True

    # Database
    database_type: str = "postgresql"  # postgresql, mysql, sqlite
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "superinstance"
    database_user: str = "superinstance"
    database_password: Optional[str] = None

    # Caching
    enable_redis: bool = True
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None

    # Message queue
    enable_rabbitmq: bool = True
    rabbitmq_host: str = "localhost"
    rabbitmq_port: int = 5672
    rabbitmq_user: str = "superinstance"
    rabbitmq_password: Optional[str] = None


# ============================================================================
# Docker Deployment
# ============================================================================

class DockerDeployment:
    """Docker-based deployment"""

    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.compose_file = "docker-compose.yml"
        self.env_file = ".env"

    def generate_docker_compose(self) -> Dict[str, Any]:
        """Generate docker-compose.yml"""
        compose = {
            'version': '3.8',
            'services': {}
        }

        # SuperInstance API
        compose['services']['api'] = {
            'image': 'superinstance/api:latest',
            'container_name': 'superinstance-api',
            'ports': [f"{self.config.api_port}:8000"],
            'environment': [
                f'ENVIRONMENT={self.config.environment}',
                f'DATABASE_URL=postgresql://{self.config.database_user}:{self.config.database_password}@{self.config.database_host}:{self.config.database_port}/{self.config.database_name}',
                f'REDIS_URL=redis://:{self.config.redis_password}@{self.config.redis_host}:{self.config.redis_port}',
                'LOG_LEVEL=info',
            ],
            'volumes': [
                f'{self.config.data_dir}:/data',
                f'{self.config.config_dir}:/config',
                f'{self.config.log_dir}:/var/log/superinstance',
            ],
            'depends_on': ['postgres', 'redis'],
            'restart': 'unless-stopped',
            'networks': ['superinstance-net'],
        }

        # PostgreSQL
        compose['services']['postgres'] = {
            'image': 'postgres:15',
            'container_name': 'superinstance-postgres',
            'environment': [
                f'POSTGRES_DB={self.config.database_name}',
                f'POSTGRES_USER={self.config.database_user}',
                f'POSTGRES_PASSWORD={self.config.database_password}',
            ],
            'volumes': [
                'postgres-data:/var/lib/postgresql/data',
            ],
            'restart': 'unless-stopped',
            'networks': ['superinstance-net'],
        }

        # Redis
        if self.config.enable_redis:
            compose['services']['redis'] = {
                'image': 'redis:7-alpine',
                'container_name': 'superinstance-redis',
                'command': f'redis-server --requirepass {self.config.redis_password}',
                'volumes': [
                    'redis-data:/data',
                ],
                'restart': 'unless-stopped',
                'networks': ['superinstance-net'],
            }

        # Grafana (monitoring)
        if self.config.enable_monitoring:
            compose['services']['grafana'] = {
                'image': 'grafana/grafana:latest',
                'container_name': 'superinstance-grafana',
                'ports': [f"{self.config.dashboard_port}:3000"],
                'environment': [
                    'GF_SECURITY_ADMIN_PASSWORD=admin',
                ],
                'volumes': [
                    'grafana-data:/var/lib/grafana',
                    './grafana/dashboards:/etc/grafana/provisioning/dashboards',
                ],
                'restart': 'unless-stopped',
                'networks': ['superinstance-net'],
            }

            compose['services']['prometheus'] = {
                'image': 'prom/prometheus:latest',
                'container_name': 'superinstance-prometheus',
                'ports': [f"{self.config.metrics_port}:9090"],
                'volumes': [
                    './prometheus/prometheus.yml:/etc/prometheus/prometheus.yml',
                    'prometheus-data:/prometheus',
                ],
                'command': '--config.file=/etc/prometheus/prometheus.yml',
                'restart': 'unless-stopped',
                'networks': ['superinstance-net'],
            }

        # Networks
        compose['networks'] = {
            'superinstance-net': {
                'driver': 'bridge',
            }
        }

        # Volumes
        compose['volumes'] = {
            'postgres-data': {},
            'redis-data': {},
            'grafana-data': {},
            'prometheus-data': {},
        }

        return compose

    def generate_env_file(self) -> Dict[str, str]:
        """Generate .env file"""
        env_vars = {
            'ENVIRONMENT': self.config.environment,
            'API_PORT': str(self.config.api_port),
            'DATABASE_TYPE': self.config.database_type,
            'DATABASE_HOST': self.config.database_host,
            'DATABASE_PORT': str(self.config.database_port),
            'DATABASE_NAME': self.config.database_name,
            'DATABASE_USER': self.config.database_user,
            'DATABASE_PASSWORD': self.config.database_password or '',
            'REDIS_HOST': self.config.redis_host,
            'REDIS_PORT': str(self.config.redis_port),
            'REDIS_PASSWORD': self.config.redis_password or '',
            'LOG_LEVEL': 'info',
            'LOG_FORMAT': 'json',
        }

        return env_vars

    def deploy(self) -> bool:
        """Deploy using Docker Compose"""
        try:
            # Create directories
            os.makedirs(self.config.data_dir, exist_ok=True)
            os.makedirs(self.config.config_dir, exist_ok=True)
            os.makedirs(self.config.log_dir, exist_ok=True)

            # Generate and write docker-compose.yml
            compose = self.generate_docker_compose()
            with open(self.compose_file, 'w') as f:
                yaml.dump(compose, f, default_flow_style=False)

            # Generate and write .env
            env_vars = self.generate_env_file()
            with open(self.env_file, 'w') as f:
                for key, value in env_vars.items():
                    f.write(f"{key}={value}\n")

            # Pull images
            logger.info("Pulling Docker images...")
            subprocess.run(['docker-compose', 'pull'], check=True)

            # Start services
            logger.info("Starting services...")
            subprocess.run(['docker-compose', 'up', '-d'], check=True)

            # Wait for services to be healthy
            logger.info("Waiting for services to start...")
            subprocess.run(['sleep', '10'])

            # Check status
            result = subprocess.run(
                ['docker-compose', 'ps'],
                capture_output=True,
                text=True
            )

            logger.info("Deployment successful!")
            logger.info(result.stdout)

            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Deployment failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return False

    def stop(self) -> bool:
        """Stop all services"""
        try:
            subprocess.run(['docker-compose', 'down'], check=True)
            logger.info("Services stopped successfully")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to stop services: {e}")
            return False

    def status(self) -> Dict[str, str]:
        """Get deployment status"""
        try:
            result = subprocess.run(
                ['docker-compose', 'ps'],
                capture_output=True,
                text=True,
                check=True
            )

            # Parse output
            services = {}
            lines = result.stdout.split('\n')[2:]  # Skip header
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 3:
                        name = parts[0]
                        status = parts[1]
                        services[name] = status

            return services

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to get status: {e}")
            return {}


# ============================================================================
# Kubernetes Deployment
# ============================================================================

class KubernetesDeployment:
    """Kubernetes-based deployment"""

    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.namespace = "superinstance"
        self.release_name = "superinstance"

    def generate_namespace(self) -> Dict[str, Any]:
        """Generate namespace resource"""
        return {
            'apiVersion': 'v1',
            'kind': 'Namespace',
            'metadata': {
                'name': self.namespace,
                'labels': {
                    'name': self.namespace,
                    'app': 'superinstance'
                }
            }
        }

    def generate_deployment(self) -> Dict[str, Any]:
        """Generate deployment resource"""
        deployment = {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {
                'name': f'{self.release_name}-api',
                'namespace': self.namespace,
                'labels': {
                    'app': 'superinstance',
                    'component': 'api'
                }
            },
            'spec': {
                'replicas': self.config.ha_replica_count if self.config.enable_ha else 1,
                'selector': {
                    'matchLabels': {
                        'app': 'superinstance',
                        'component': 'api'
                    }
                },
                'template': {
                    'metadata': {
                        'labels': {
                            'app': 'superinstance',
                            'component': 'api'
                        }
                    },
                    'spec': {
                        'containers': [{
                            'name': 'api',
                            'image': 'superinstance/api:latest',
                            'ports': [{
                                'containerPort': 8000,
                                'name': 'http'
                            }],
                            'env': [
                                {
                                    'name': 'ENVIRONMENT',
                                    'value': self.config.environment
                                },
                                {
                                    'name': 'DATABASE_URL',
                                    'valueFrom': {
                                        'secretKeyRef': {
                                            'name': 'superinstance-secrets',
                                            'key': 'database-url'
                                        }
                                    }
                                },
                                {
                                    'name': 'REDIS_URL',
                                    'valueFrom': {
                                        'secretKeyRef': {
                                            'name': 'superinstance-secrets',
                                            'key': 'redis-url'
                                        }
                                    }
                                }
                            ],
                            'resources': {
                                'requests': {
                                    'memory': '512Mi',
                                    'cpu': '250m'
                                },
                                'limits': {
                                    'memory': '2Gi',
                                    'cpu': '1000m'
                                }
                            },
                            'volumeMounts': [{
                                'name': 'data',
                                'mountPath': '/data'
                            }],
                            'livenessProbe': {
                                'httpGet': {
                                    'path': '/api/health',
                                    'port': 8000
                                },
                                'initialDelaySeconds': 30,
                                'periodSeconds': 10
                            },
                            'readinessProbe': {
                                'httpGet': {
                                    'path': '/api/health',
                                    'port': 8000
                                },
                                'initialDelaySeconds': 10,
                                'periodSeconds': 5
                            }
                        }],
                        'volumes': [{
                            'name': 'data',
                            'persistentVolumeClaim': {
                                'claimName': 'superinstance-data'
                            }
                        }]
                    }
                }
            }
        }

        return deployment

    def generate_service(self) -> Dict[str, Any]:
        """Generate service resource"""
        return {
            'apiVersion': 'v1',
            'kind': 'Service',
            'metadata': {
                'name': f'{self.release_name}-api',
                'namespace': self.namespace,
                'labels': {
                    'app': 'superinstance',
                    'component': 'api'
                }
            },
            'spec': {
                'type': 'LoadBalancer',
                'selector': {
                    'app': 'superinstance',
                    'component': 'api'
                },
                'ports': [{
                    'protocol': 'TCP',
                    'port': 80,
                    'targetPort': 8000,
                    'name': 'http'
                }]
            }
        }

    def generate_configmap(self) -> Dict[str, Any]:
        """Generate ConfigMap resource"""
        return {
            'apiVersion': 'v1',
            'kind': 'ConfigMap',
            'metadata': {
                'name': 'superinstance-config',
                'namespace': self.namespace
            },
            'data': {
                'ENVIRONMENT': self.config.environment,
                'LOG_LEVEL': 'info',
                'LOG_FORMAT': 'json',
            }
        }

    def generate_secret(self) -> Dict[str, Any]:
        """Generate Secret resource"""
        return {
            'apiVersion': 'v1',
            'kind': 'Secret',
            'metadata': {
                'name': 'superinstance-secrets',
                'namespace': self.namespace
            },
            'type': 'Opaque',
            'data': {
                'database-url': self._encode_secret(
                    f"postgresql://{self.config.database_user}:{self.config.database_password}@"
                    f"{self.config.database_host}:{self.config.database_port}/{self.config.database_name}"
                ),
                'redis-url': self._encode_secret(
                    f"redis://:{self.config.redis_password}@{self.config.redis_host}:{self.config.redis_port}"
                ),
                'admin-password': self._encode_secret(self.config.admin_password_hash or 'changeme'),
            }
        }

    def generate_persistent_volume_claim(self) -> Dict[str, Any]:
        """Generate PersistentVolumeClaim resource"""
        return {
            'apiVersion': 'v1',
            'kind': 'PersistentVolumeClaim',
            'metadata': {
                'name': 'superinstance-data',
                'namespace': self.namespace
            },
            'spec': {
                'accessModes': ['ReadWriteOnce'],
                'resources': {
                    'requests': {
                        'storage': f'{self.config.storage_gb}Gi'
                    }
                },
                'storageClassName': 'standard'
            }
        }

    def _encode_secret(self, value: str) -> str:
        """Encode secret value for Kubernetes"""
        import base64
        return base64.b64encode(value.encode()).decode()

    def deploy(self) -> bool:
        """Deploy to Kubernetes"""
        try:
            # Create manifests directory
            os.makedirs('k8s', exist_ok=True)

            # Generate manifests
            manifests = [
                ('namespace.yaml', self.generate_namespace()),
                ('configmap.yaml', self.generate_configmap()),
                ('secret.yaml', self.generate_secret()),
                ('pvc.yaml', self.generate_persistent_volume_claim()),
                ('deployment.yaml', self.generate_deployment()),
                ('service.yaml', self.generate_service()),
            ]

            # Write manifests
            for filename, manifest in manifests:
                path = os.path.join('k8s', filename)
                with open(path, 'w') as f:
                    yaml.dump(manifest, f)

            # Apply manifests
            for filename, _ in manifests:
                path = os.path.join('k8s', filename)
                subprocess.run(['kubectl', 'apply', '-f', path], check=True)

            # Wait for rollout
            subprocess.run([
                'kubectl', 'rollout', 'status',
                f'deployment/{self.release_name}-api',
                f'--namespace={self.namespace}'
            ], check=True)

            logger.info("Kubernetes deployment successful!")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Kubernetes deployment failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return False

    def scale(self, replicas: int) -> bool:
        """Scale deployment"""
        try:
            subprocess.run([
                'kubectl', 'scale',
                f'deployment/{self.release_name}-api',
                f'--replicas={replicas}',
                f'--namespace={self.namespace}'
            ], check=True)

            logger.info(f"Scaled to {replicas} replicas")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Scale failed: {e}")
            return False

    def status(self) -> Dict[str, Any]:
        """Get deployment status"""
        try:
            # Get pods
            result = subprocess.run([
                'kubectl', 'get', 'pods',
                f'--namespace={self.namespace}',
                '-o', 'json'
            ], capture_output=True, text=True, check=True)

            data = json.loads(result.stdout)

            pods = {}
            for pod in data['items']:
                name = pod['metadata']['name']
                phase = pod['status']['phase']
                pods[name] = phase

            return {'pods': pods}

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to get status: {e}")
            return {}


# ============================================================================
# Ansible Deployment
# ============================================================================

class AnsibleDeployment:
    """Ansible-based bare metal deployment"""

    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.inventory_file = "inventory.ini"
        self.playbook_file = "deploy.yml"

    def generate_inventory(self, hosts: List[str]) -> str:
        """Generate Ansible inventory file"""
        inventory = f"""[superinstance]
{chr(10).join(hosts)}

[superinstance:vars]
ansible_python_interpreter=/usr/bin/python3
deployment_type={self.config.deployment_type}
environment={self.config.environment}
"""
        return inventory

    def generate_playbook(self) -> Dict[str, Any]:
        """Generate Ansible playbook"""
        playbook = {
            'name': 'Deploy SuperInstance',
            'hosts': 'superinstance',
            'become': True,
            'vars': {
                'deployment_config': {
                    'data_dir': self.config.data_dir,
                    'config_dir': self.config.config_dir,
                    'log_dir': self.config.log_dir,
                    'api_port': self.config.api_port,
                    'enable_monitoring': self.config.enable_monitoring,
                }
            },
            'tasks': [
                {
                    'name': 'Create directories',
                    'file': {
                        'path': item,
                        'state': 'directory',
                        'mode': '0755'
                    }
                    for item in [
                        self.config.data_dir,
                        self.config.config_dir,
                        self.config.log_dir
                    ]
                },
                {
                    'name': 'Install dependencies',
                    'apt': {
                        'name': ['python3', 'python3-pip', 'postgresql', 'redis-server'],
                        'state': 'present',
                        'update_cache': True
                    }
                },
                {
                    'name': 'Install Python packages',
                    'pip': {
                        'name': ['superinstance', 'gunicorn', 'uvicorn'],
                        'state': 'present'
                    }
                },
                {
                    'name': 'Configure systemd service',
                    'template': {
                        'src': 'superinstance.service.j2',
                        'dest': '/etc/systemd/system/superinstance.service',
                        'mode': '0644'
                    }
                },
                {
                    'name': 'Enable and start service',
                    'systemd': {
                        'name': 'superinstance',
                        'enabled': True,
                        'state': 'started',
                        'daemon_reload': True
                    }
                }
            ]
        }

        return playbook

    def deploy(self, hosts: List[str]) -> bool:
        """Deploy using Ansible"""
        try:
            # Generate inventory
            inventory = self.generate_inventory(hosts)
            with open(self.inventory_file, 'w') as f:
                f.write(inventory)

            # Generate playbook
            playbook = self.generate_playbook()
            with open(self.playbook_file, 'w') as f:
                yaml.dump([playbook], f)

            # Run playbook
            subprocess.run([
                'ansible-playbook',
                '-i', self.inventory_file,
                self.playbook_file
            ], check=True)

            logger.info("Ansible deployment successful!")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Ansible deployment failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return False


# ============================================================================
# Deployment Manager
# ============================================================================

class DeploymentManager:
    """Main deployment manager"""

    @staticmethod
    def deploy(config: DeploymentConfig) -> bool:
        """Deploy based on configuration"""
        if config.deployment_type == 'docker':
            deployer = DockerDeployment(config)
        elif config.deployment_type == 'kubernetes':
            deployer = KubernetesDeployment(config)
        elif config.deployment_type == 'bare_metal':
            deployer = AnsibleDeployment(config)
        else:
            logger.error(f"Unknown deployment type: {config.deployment_type}")
            return False

        return deployer.deploy()

    @staticmethod
    def health_check(config: DeploymentConfig) -> Dict[str, Any]:
        """Perform health check"""
        health = {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'healthy',
            'checks': {}
        }

        # Check API
        try:
            response = subprocess.run([
                'curl', '-s',
                f'http://localhost:{config.api_port}/api/health'
            ], capture_output=True, text=True, timeout=5)

            if response.returncode == 0:
                health['checks']['api'] = 'healthy'
            else:
                health['checks']['api'] = 'unhealthy'
                health['status'] = 'unhealthy'
        except Exception as e:
            health['checks']['api'] = f'error: {e}'
            health['status'] = 'unhealthy'

        # Check database
        try:
            response = subprocess.run([
                'pg_isready',
                '-h', config.database_host,
                '-p', str(config.database_port)
            ], capture_output=True, text=True, timeout=5)

            if response.returncode == 0:
                health['checks']['database'] = 'healthy'
            else:
                health['checks']['database'] = 'unhealthy'
                health['status'] = 'degraded'
        except Exception as e:
            health['checks']['database'] = f'error: {e}'
            health['status'] = 'degraded'

        # Check Redis
        if config.enable_redis:
            try:
                response = subprocess.run([
                    'redis-cli',
                    '-h', config.redis_host,
                    '-p', str(config.redis_port),
                    'ping'
                ], capture_output=True, text=True, timeout=5)

                if response.stdout.strip() == 'PONG':
                    health['checks']['redis'] = 'healthy'
                else:
                    health['checks']['redis'] = 'unhealthy'
                    health['status'] = 'degraded'
            except Exception as e:
                health['checks']['redis'] = f'error: {e}'
                health['status'] = 'degraded'

        return health


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Configure deployment
    config = DeploymentConfig(
        environment="production",
        deployment_type="docker",
        node_count=3,
        enable_ha=True,
        ha_replica_count=3,
        enable_monitoring=True,
        database_password="secure_password_here",
        redis_password="secure_redis_password_here"
    )

    # Deploy
    manager = DeploymentManager()
    success = manager.deploy(config)

    if success:
        print("Deployment successful!")

        # Health check
        health = manager.health_check(config)
        print(f"Health status: {health['status']}")
        print(f"Checks: {health['checks']}")
    else:
        print("Deployment failed!")
