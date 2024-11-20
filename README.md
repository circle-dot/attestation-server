# Attestation Service

A NestJS-based backend service for managing attestations and proof-carrying data (PCDs) with Zupass integration. This service provides endpoints for creating and verifying attestations, handling PCDs, and integrating with various blockchain-based verification systems.

## 🌟 Features

- Attestation creation and verification
- PCD (Proof Carrying Data) validation
- Zupass ticket verification
- EAS (Ethereum Attestation Service) integration
- CORS-enabled API endpoints
- Privy authentication integration

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm
- Access to EAS infrastructure
- Zupass integration credentials

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# EAS Configuration
PRETRUST_SCHEMA=your_pretrust_schema
VOUCH_SCHEMA=your_vouch_schema
GRAPHQL_URL=your_graphql_url

# Privy Configuration
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_secret

# Server Configuration
PORT=8000
```

### Running the Application

```bash
# Development
pnpm run start:dev

# Production
pnpm run start:prod

# Testing
pnpm run test
```

## 📚 API Documentation

### Attestation Endpoints

#### Create Attestation

```http
POST /attestation
Authorization: Bearer <token>

{
  "platform": "string",
  "recipient": "string",
  "attester": "string",
  "signature": "string",
  "category": "string",
  "subcategory": "string"
}
```

Response:

```json
{
  "newAttestationUID": "string"
}
```

#### Get EAS Nonce

```http
GET /attestation/nonce?attester=<address>
```

Response:

```json
{
  "easNonce": "number"
}
```

#### Revoke Attestation

```http
POST /attestation/revoke
Authorization: Bearer <token>

{
  "signature": "string",
  "uid": "string",
  "address": "string"
}
```

### PCD Endpoints

#### Validate PCDs

```http
POST /pcds
x-privy-app-id: <app_id>

{
  "pcds": [
    {
      "pcd": {
        "claim": {
          "partialTicket": {
            "productId": "string",
            "eventId": "string"
          }
        }
      }
    }
  ],
  "user": {
    "wallet": {
      "address": "string"
    }
  }
}
```

### POD Endpoints

#### Create POD PCD

```http
POST /pod/create
x-privy-app-id: <app_id>

{
  "wallet": "string",
  "AgoraScore": "string"
}
```

## 🔒 Security

The service implements several security measures:

1. Authorization headers required for sensitive endpoints
2. Privy authentication guard for protected routes
3. CORS configuration for allowed origins
4. Input validation and sanitization

## 🏗 Architecture

The service is built using NestJS and follows a modular architecture:

- `AttestationModule`: Handles attestation-related operations
- `PCDsModule`: Manages PCD validation and processing
- `PODModule`: Handles POD-related operations
- `PrivyModule`: Manages authentication and authorization

## 🧪 Testing

The project includes unit tests and e2e tests:

```bash
# Run unit tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Generate test coverage
pnpm run test:cov
```

## 📦 Supported Ticket Types

The service supports various ticket types including:

- Zuzalu
- ZuConnect
- Devcon
- MegaZu24
- AgoraCore
- Esmeralda

Each ticket type has specific validation rules and configurations defined in the system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is MIT licensed.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation for more details

## 🔗 Related Projects

- [Zupass](https://zupass.org/)
- [EAS (Ethereum Attestation Service)](https://attest.org)
- [PCD (Proof Carrying Data)](https://github.com/proofcarryingdata/pcd)
