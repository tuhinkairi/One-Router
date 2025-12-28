import re
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class ServiceDetection(BaseModel):
    service_name: str
    confidence: float  # 0.0 to 1.0
    features: Dict[str, bool]
    required_keys: List[str]
    detected_keys: List[str]
    feature_metadata: Dict[str, Any] = {}  # NEW field for plan IDs, configs, etc.

class EnvParserService:
    """Service for parsing .env files and detecting payment services"""

    def __init__(self):
        # Service detection patterns
        self.service_patterns = {
            'razorpay': {
                'credential_patterns': [
                    r'^RAZORPAY_KEY_ID$',
                    r'^RAZORPAY_KEY_SECRET$',
                    r'^RAZORPAY_WEBHOOK_SECRET$'
                ],
                'feature_patterns': {
                    'payments': {
                        'required': [r'^RAZORPAY_KEY_ID$', r'^RAZORPAY_KEY_SECRET$'],
                        'indicator': ['KEY_ID', 'KEY_SECRET']
                    },
                    'subscriptions': {
                        'optional': [
                            r'^RAZORPAY_SUBSCRIPTION_PLAN_.*$',
                            r'^RAZORPAY_PLAN_.*$',
                            r'^SUBSCRIPTION_PLAN_.*$'  # Generic patterns
                        ],
                        'indicator': ['SUBSCRIPTION', 'PLAN']
                    },
                    'payment_links': {
                        'optional': [
                            r'^RAZORPAY_PAYMENT_LINK_.*$',
                            r'^PAYMENT_LINK_.*$'
                        ],
                        'indicator': ['PAYMENT_LINK']
                    },
                    'payouts': {
                        'optional': [
                            r'^RAZORPAY_PAYOUT_ACCOUNT$',
                            r'^RAZORPAY_ACCOUNT_NUMBER$'
                        ],
                        'indicator': ['PAYOUT', 'ACCOUNT_NUMBER']
                    },
                    'webhooks': {
                        'required': [r'^RAZORPAY_WEBHOOK_SECRET$'],
                        'indicator': ['WEBHOOK_SECRET']
                    }
                }
            },
            'paypal': {
                'credential_patterns': [
                    r'^PAYPAL_CLIENT_ID$',
                    r'^PAYPAL_CLIENT_SECRET$',
                    r'^PAYPAL_MODE$'
                ],
                'feature_patterns': {
                    'payments': {
                        'required': [r'^PAYPAL_CLIENT_ID$', r'^PAYPAL_CLIENT_SECRET$'],
                        'indicator': ['CLIENT_ID', 'CLIENT_SECRET']
                    },
                    'subscriptions': {
                        'optional': [
                            r'^PAYPAL_SUBSCRIPTION_PLAN_.*$',
                            r'^PAYPAL_PLAN_.*$',
                            r'^PAYPAL_BILLING_PLAN_.*$'
                        ],
                        'indicator': ['SUBSCRIPTION', 'PLAN', 'BILLING']
                    }
                }
            },
            'twilio': {
                'credential_patterns': [
                    r'^TWILIO_ACCOUNT_SID$',
                    r'^TWILIO_AUTH_TOKEN$',
                    r'^TWILIO_PHONE_NUMBER$'
                ],
                'feature_patterns': {
                    'sms': {
                        'required': [r'^TWILIO_ACCOUNT_SID$', r'^TWILIO_AUTH_TOKEN$'],
                        'indicator': ['ACCOUNT_SID', 'AUTH_TOKEN']
                    },
                    'calls': {
                        'required': [r'^TWILIO_ACCOUNT_SID$', r'^TWILIO_AUTH_TOKEN$'],
                        'indicator': ['ACCOUNT_SID', 'AUTH_TOKEN']
                    },
                    'verification': {
                        'required': [r'^TWILIO_ACCOUNT_SID$', r'^TWILIO_AUTH_TOKEN$'],
                        'indicator': ['ACCOUNT_SID', 'AUTH_TOKEN']
                    }
                }
            },
            'aws_s3': {
                'credential_patterns': [
                    r'^AWS_ACCESS_KEY_ID$',
                    r'^AWS_SECRET_ACCESS_KEY$',
                    r'^AWS_REGION$',
                    r'^AWS_S3_BUCKET$'
                ],
                'feature_patterns': {
                    'storage': {
                        'required': [r'^AWS_ACCESS_KEY_ID$', r'^AWS_SECRET_ACCESS_KEY$', r'^AWS_S3_BUCKET$'],
                        'indicator': ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'S3_BUCKET']
                    },
                    'file_upload': {
                        'required': [r'^AWS_ACCESS_KEY_ID$', r'^AWS_SECRET_ACCESS_KEY$', r'^AWS_S3_BUCKET$'],
                        'indicator': ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'S3_BUCKET']
                    },
                    'cdn': {
                        'required': [r'^AWS_S3_BUCKET$', r'^AWS_REGION$'],
                        'indicator': ['S3_BUCKET', 'REGION']
                    }
                }
            }
        }

    def parse_env_content(self, content: str) -> Dict[str, str]:
        """Parse .env file content into key-value pairs"""
        env_vars = {}

        for line in content.split('\n'):
            line = line.strip()

            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue

            # Parse key=value pairs
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"\'')
                env_vars[key] = value

        return env_vars

    def detect_services(self, env_vars: Dict[str, str]) -> List[ServiceDetection]:
        """Enhanced service detection with feature analysis"""
        detections = []

        for service_name, patterns in self.service_patterns.items():
            # 1. Detect credentials (existing logic)
            detected_credentials = self._detect_credentials(service_name, env_vars, patterns)

            if not detected_credentials:
                continue

            # 2. Detect features (NEW)
            detected_features = self._detect_features(service_name, env_vars, patterns)

            # 3. Extract plan IDs and other metadata (NEW)
            feature_metadata = self._extract_feature_metadata(service_name, env_vars, patterns)

            # 4. Calculate confidence
            confidence = self._calculate_confidence(detected_credentials, detected_features, patterns)

            detections.append(ServiceDetection(
                service_name=service_name,
                confidence=confidence,
                features=detected_features,
                required_keys=patterns['credential_patterns'],
                detected_keys=detected_credentials,
                feature_metadata=feature_metadata  # NEW field
            ))

        # Sort by confidence
        detections.sort(key=lambda x: x.confidence, reverse=True)
        return detections

    def _detect_credentials(self, service_name: str, env_vars: Dict[str, str], patterns: dict) -> List[str]:
        """Detect credential keys (existing logic)"""
        detected_keys = []
        for pattern in patterns['credential_patterns']:
            for env_key in env_vars.keys():
                if re.match(pattern, env_key, re.IGNORECASE):
                    detected_keys.append(env_key)
        return detected_keys

    def _detect_features(self, service_name: str, env_vars: Dict[str, str], patterns: dict) -> Dict[str, bool]:
        """Detect which features are available based on .env contents"""
        features = {}

        feature_patterns = patterns.get('feature_patterns', {})

        for feature_name, feature_config in feature_patterns.items():
            # Check required patterns - all must be present
            required_patterns = feature_config.get('required', [])
            has_required = len(required_patterns) > 0 and all(
                any(re.match(pattern, key, re.IGNORECASE) for key in env_vars.keys())
                for pattern in required_patterns
            )

            # Check optional patterns - at least one must be present
            optional_patterns = feature_config.get('optional', [])
            has_optional = any(
                any(re.match(pattern, key, re.IGNORECASE) for key in env_vars.keys())
                for pattern in optional_patterns
            )

            # Feature is enabled if:
            # - All required patterns exist (if any required), OR
            # - At least one optional pattern exists
            features[feature_name] = has_required or has_optional

        return features

    def _extract_feature_metadata(self, service_name: str, env_vars: Dict[str, str], patterns: dict) -> Dict[str, Any]:
        """Extract plan IDs, URLs, and other metadata from .env for specific service"""
        metadata = {
            'subscription_plans': [],
            'payment_link_configs': [],
            'payout_accounts': [],
            'webhook_urls': []
        }

        # Service-specific prefixes
        service_prefixes = {
            'razorpay': ['RAZORPAY_', 'SUBSCRIPTION_PLAN_', 'PAYMENT_LINK_'],
            'paypal': ['PAYPAL_', 'SUBSCRIPTION_PLAN_', 'PAYMENT_LINK_'],
            'twilio': ['TWILIO_'],
            'aws_s3': ['AWS_']
        }

        prefixes = service_prefixes.get(service_name, [service_name.upper() + '_'])

        # Extract subscription plans for this service
        for key, value in env_vars.items():
            # Check if key belongs to this service
            belongs_to_service = any(key.upper().startswith(prefix) for prefix in prefixes)

            if belongs_to_service:
                if re.match(r'.*SUBSCRIPTION.*PLAN.*', key, re.IGNORECASE):
                    metadata['subscription_plans'].append({
                        'env_key': key,
                        'plan_id': value,
                        'name': self._prettify_plan_name(key)
                    })

                elif re.match(r'.*PAYMENT.*LINK.*', key, re.IGNORECASE):
                    metadata['payment_link_configs'].append({
                        'env_key': key,
                        'value': value
                    })

                elif re.match(r'.*PAYOUT.*ACCOUNT.*', key, re.IGNORECASE):
                    metadata['payout_accounts'].append({
                        'env_key': key,
                        'account_number': value
                    })

                elif re.match(r'.*WEBHOOK.*URL.*', key, re.IGNORECASE):
                    metadata['webhook_urls'].append(value)

        return metadata

    def _prettify_plan_name(self, env_key: str) -> str:
        """Convert RAZORPAY_SUBSCRIPTION_PLAN_BASIC to 'Basic Plan'"""
        parts = env_key.split('_')
        if 'PLAN' in parts:
            plan_name_parts = parts[parts.index('PLAN') + 1:]
            if plan_name_parts:
                return ' '.join(word.capitalize() for word in plan_name_parts) + ' Plan'
            return 'Default Plan'
        return env_key
    def _calculate_confidence(self, detected_credentials: List[str], detected_features: Dict[str, bool], patterns: dict) -> float:
        """Calculate confidence score for service detection"""
        base_confidence = len(detected_credentials) * 0.3

        # Boost confidence for detected features
        feature_count = sum(1 for enabled in detected_features.values() if enabled)
        feature_confidence = feature_count * 0.2

        return min(base_confidence + feature_confidence, 1.0)



    def validate_env_syntax(self, content: str) -> Dict[str, str]:
        """Validate .env file syntax and return errors"""
        errors = {}

        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            line = line.strip()

            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue

            # Check for basic key=value format
            if '=' not in line:
                errors[f"line_{i}"] = "Missing '=' separator"
                continue

            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()

            # Validate key format (allow letters in both cases, digits, and underscores)
            if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key):
                errors[f"line_{i}"] = f"Invalid key format: {key}"

            # Check for unclosed quotes
            if (value.startswith('"') and not value.endswith('"')) or \
               (value.startswith("'") and not value.endswith("'")):
                errors[f"line_{i}"] = "Unclosed quote"

        return errors