# API Implementation Guide - FYP Service Marketplace

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Services API](#services-api)
3. [Worker Registration Flow](#worker-registration-flow)
4. [Portfolio Management](#portfolio-management)
5. [Frontend Integration](#frontend-integration)
6. [Complete Example Workflows](#complete-example-workflows)

---

## Setup & Configuration

### CORS Configuration ✅
**Status:** Already configured in `src/main.ts`

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="your_supabase_connection_string"

# Frontend
FRONTEND_URL=http://localhost:3000

# Server
PORT=4000
NODE_ENV=development
```

### Start the Server
```bash
npm run start:dev
# Output: Application is running on: http://localhost:4000
```

---

## Services API

### Available Services (43 Total)
All services are pre-seeded with categories and emoji icons.

| ID | Service Name | Category | Icon |
|----|--------------|----------|------|
| 1 | Wiring & Rewiring | Electrician | ⚡ |
| 2 | Switch & Socket Repair | Electrician | 🔌 |
| 3 | Pipe Installation | Plumber | 🔧 |
| 4 | Leak Detection | Plumber | 💧 |
| 5 | General Carpentry | Carpenter | 🪵 |
| 6 | Custom Furniture | Carpenter | 🪑 |
| ... | ... | ... | ... |
| 43 | Pest Control | Pest Control | 🦟 |

### Endpoint 1: Get All Services

**Request:**
```http
GET /services HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json
```

**cURL:**
```bash
curl -X GET http://localhost:4000/services
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Services retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Wiring & Rewiring",
      "description": "Professional electrical wiring services",
      "category": "Electrician",
      "icon": "⚡",
      "isActive": true,
      "createdAt": "2026-04-14T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Switch & Socket Repair",
      "description": "Repair and replacement of electrical switches",
      "category": "Electrician",
      "icon": "🔌",
      "isActive": true,
      "createdAt": "2026-04-14T10:30:00Z"
    },
    // ... more services
  ],
  "pagination": {
    "total": 43,
    "page": 1,
    "pageSize": 50
  }
}
```

### Endpoint 2: Get Active Services Only

**Request:**
```http
GET /services/active HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Active services retrieved successfully",
  "data": [
    // Returns only services with isActive: true
  ]
}
```

### Endpoint 3: Get Single Service by ID

**Request:**
```http
GET /services/1 HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Service retrieved successfully",
  "data": {
    "id": 1,
    "name": "Wiring & Rewiring",
    "description": "Professional electrical wiring services",
    "category": "Electrician",
    "icon": "⚡",
    "isActive": true,
    "createdAt": "2026-04-14T10:30:00Z"
  }
}
```

### Endpoint 4: Get Services List (Alternative)

**Request:**
```http
GET /services/list/all HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json
```

**Response (200 OK):**
Same as "Get All Services" endpoint

---

## Worker Registration Flow

### Overview
Worker registration is a **2-step process**:

```
Step 1: Fill Personal Details + Select Services
           ↓
Step 2: Upload Portfolio Pictures (Optional)
           ↓
SUCCESS: Worker Account Created
```

### Step 1: Register Worker with Services

**Registration Data Structure:**

```typescript
{
  firstName: string;              // Required
  lastName: string;               // Required
  email: string;                  // Required, unique
  phoneNumber: string;            // Required
  password: string;               // Required, min 6 characters
  cnicNumber: string;             // Required, unique, 13 digits
  address: string;                // Required
  latitude?: number;              // Optional, for location
  longitude?: number;             // Optional, for location
  serviceIds: number[];           // Required, array of service IDs
  hourlyRate?: number;            // Optional, worker's rate
  portfolioImages?: Array<{
    imageUrl: string;
    description?: string;
  }>;                             // Optional, portfolio pics
}
```

**Request:**
```http
POST /workers/register HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json

{
  "firstName": "Ahmed",
  "lastName": "Khan",
  "email": "ahmed@example.com",
  "phoneNumber": "+923334445566",
  "password": "SecurePass123",
  "cnicNumber": "3520123456789",
  "address": "123 Main Street, Karachi",
  "latitude": 24.8607,
  "longitude": 67.0011,
  "serviceIds": [1, 2],
  "hourlyRate": 500,
  "portfolioImages": [
    {
      "imageUrl": "https://example.com/wiring-project-1.jpg",
      "description": "Completed wiring project at commercial building"
    },
    {
      "imageUrl": "https://example.com/repair-project-1.jpg",
      "description": "Socket replacement in home"
    }
  ]
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/workers/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ahmed",
    "lastName": "Khan",
    "email": "ahmed@example.com",
    "phoneNumber": "+923334445566",
    "password": "SecurePass123",
    "cnicNumber": "3520123456789",
    "address": "123 Main Street, Karachi",
    "latitude": 24.8607,
    "longitude": 67.0011,
    "serviceIds": [1, 2],
    "hourlyRate": 500,
    "portfolioImages": [
      {
        "imageUrl": "https://example.com/wiring-project-1.jpg",
        "description": "Completed wiring project"
      }
    ]
  }'
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Worker registered successfully",
  "data": {
    "id": "user-uuid-123",
    "firstName": "Ahmed",
    "lastName": "Khan",
    "email": "ahmed@example.com",
    "phoneNumber": "+923334445566",
    "cnicNumber": "3520123456789",
    "address": "123 Main Street, Karachi",
    "role": "WORKER",
    "verificationStatus": "PENDING",
    "hourlyRate": 500,
    "workerProfile": {
      "id": "profile-uuid-456",
      "profilePicture": null,
      "bio": null,
      "rating": 5.0,
      "totalBookings": 0,
      "isOnline": false,
      "verificationStatus": "PENDING",
      "services": [
        {
          "id": 1,
          "name": "Wiring & Rewiring",
          "category": "Electrician",
          "icon": "⚡"
        },
        {
          "id": 2,
          "name": "Switch & Socket Repair",
          "category": "Electrician",
          "icon": "🔌"
        }
      ]
    },
    "portfolio": [
      {
        "id": "portfolio-uuid-1",
        "imageUrl": "https://example.com/wiring-project-1.jpg",
        "description": "Completed wiring project at commercial building",
        "createdAt": "2026-04-14T10:30:00Z"
      },
      {
        "id": "portfolio-uuid-2",
        "imageUrl": "https://example.com/repair-project-1.jpg",
        "description": "Socket replacement in home",
        "createdAt": "2026-04-14T10:30:00Z"
      }
    ],
    "createdAt": "2026-04-14T10:30:00Z"
  }
}
```

**Error Responses:**

```json
{
  "statusCode": 400,
  "message": "Email already taken",
  "error": "BAD_REQUEST"
}
```

```json
{
  "statusCode": 400,
  "message": "CNIC already registered",
  "error": "BAD_REQUEST"
}
```

---

## Portfolio Management

### Endpoint 1: Add Portfolio Image

**Add a new portfolio picture after registration.**

**Request:**
```http
POST /workers/{workerId}/portfolio HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json

{
  "imageUrl": "https://example.com/new-project.jpg",
  "description": "Beautiful kitchen remodeling"
}
```

**Path Variables:**
- `{workerId}` - The UUID of the worker (returned from registration)

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Portfolio image added successfully",
  "data": {
    "id": "portfolio-uuid-new",
    "imageUrl": "https://example.com/new-project.jpg",
    "description": "Beautiful kitchen remodeling",
    "createdAt": "2026-04-14T11:00:00Z"
  }
}
```

### Endpoint 2: Get All Portfolio Images

**Retrieve all portfolio pictures for a worker.**

**Request:**
```http
GET /workers/{workerId}/portfolio HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Portfolio retrieved successfully",
  "data": [
    {
      "id": "portfolio-uuid-1",
      "imageUrl": "https://example.com/project-1.jpg",
      "description": "Commercial building wiring",
      "createdAt": "2026-04-14T10:30:00Z"
    },
    {
      "id": "portfolio-uuid-2",
      "imageUrl": "https://example.com/project-2.jpg",
      "description": "Residential repair work",
      "createdAt": "2026-04-14T10:35:00Z"
    }
  ]
}
```

### Endpoint 3: Update Portfolio Description

**Update the description of a specific portfolio image.**

**Request:**
```http
PUT /workers/{workerId}/portfolio/{portfolioId} HTTP/1.1
Host: http://localhost:4000
Content-Type: application/json

{
  "description": "Updated description for this project"
}
```

**Path Variables:**
- `{workerId}` - The UUID of the worker
- `{portfolioId}` - The UUID of the portfolio image

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Portfolio updated successfully",
  "data": {
    "id": "portfolio-uuid-1",
    "imageUrl": "https://example.com/project-1.jpg",
    "description": "Updated description for this project",
    "createdAt": "2026-04-14T10:30:00Z"
  }
}
```

### Endpoint 4: Delete Portfolio Image

**Remove a portfolio picture.**

**Request:**
```http
DELETE /workers/{workerId}/portfolio/{portfolioId} HTTP/1.1
Host: http://localhost:4000
```

**Path Variables:**
- `{workerId}` - The UUID of the worker
- `{portfolioId}` - The UUID of the portfolio image

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Portfolio image deleted successfully",
  "data": {
    "id": "portfolio-uuid-1",
    "message": "Deleted"
  }
}
```

---

## Frontend Integration

### Step 1: Install Axios (HTTP Client)

```bash
npm install axios
```

### Step 2: Create API Service

**File: `src/services/api.js`**

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Services API
export const getServices = async () => {
  const response = await api.get('/services');
  return response.data.data;
};

export const getActiveServices = async () => {
  const response = await api.get('/services/active');
  return response.data.data;
};

export const getServiceById = async (id) => {
  const response = await api.get(`/services/${id}`);
  return response.data.data;
};

// Worker Registration API
export const registerWorker = async (workerData) => {
  const response = await api.post('/workers/register', workerData);
  return response.data.data;
};

// Portfolio APIs
export const addPortfolioImage = async (workerId, portfolioData) => {
  const response = await api.post(`/workers/${workerId}/portfolio`, portfolioData);
  return response.data.data;
};

export const getPortfolio = async (workerId) => {
  const response = await api.get(`/workers/${workerId}/portfolio`);
  return response.data.data;
};

export const updatePortfolioImage = async (workerId, portfolioId, description) => {
  const response = await api.put(`/workers/${workerId}/portfolio/${portfolioId}`, {
    description,
  });
  return response.data.data;
};

export const deletePortfolioImage = async (workerId, portfolioId) => {
  const response = await api.delete(`/workers/${workerId}/portfolio/${portfolioId}`);
  return response.data.data;
};

export default api;
```

### Step 3: React Component Example

**File: `src/components/WorkerRegistration.jsx`**

```javascript
import React, { useState, useEffect } from 'react';
import { getServices, registerWorker } from '../services/api';

export default function WorkerRegistration() {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    cnicNumber: '',
    address: '',
    latitude: '',
    longitude: '',
    hourlyRate: '',
    portfolioImages: [],
  });

  // Fetch services on component mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServices();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleServiceToggle = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        serviceIds: selectedServices,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        hourlyRate: parseFloat(formData.hourlyRate),
      };

      const response = await registerWorker(payload);
      console.log('Registration successful:', response);
      alert('Worker registered successfully!');
      // Redirect to dashboard or next page
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Worker Registration</h2>

      {/* Personal Info */}
      <input
        type="text"
        name="firstName"
        placeholder="First Name"
        value={formData.firstName}
        onChange={handleInputChange}
        required
      />
      <input
        type="text"
        name="lastName"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={handleInputChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleInputChange}
        required
      />
      <input
        type="tel"
        name="phoneNumber"
        placeholder="Phone Number"
        value={formData.phoneNumber}
        onChange={handleInputChange}
        required
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleInputChange}
        required
      />
      <input
        type="text"
        name="cnicNumber"
        placeholder="CNIC Number"
        value={formData.cnicNumber}
        onChange={handleInputChange}
        required
      />
      <input
        type="text"
        name="address"
        placeholder="Address"
        value={formData.address}
        onChange={handleInputChange}
        required
      />
      <input
        type="number"
        name="hourlyRate"
        placeholder="Hourly Rate"
        value={formData.hourlyRate}
        onChange={handleInputChange}
      />

      {/* Services Selection */}
      <h3>Select Services</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {services.map((service) => (
          <label key={service.id}>
            <input
              type="checkbox"
              checked={selectedServices.includes(service.id)}
              onChange={() => handleServiceToggle(service.id)}
            />
            {service.icon} {service.name}
          </label>
        ))}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register Worker'}
      </button>
    </form>
  );
}
```

### Step 4: Services List Component

**File: `src/components/ServicesList.jsx`**

```javascript
import React, { useState, useEffect } from 'react';
import { getServices } from '../services/api';

export default function ServicesList() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServices();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) return <div>Loading services...</div>;

  return (
    <div>
      <h2>Available Services ({services.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {services.map((service) => (
          <div key={service.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>{service.icon} {service.name}</h3>
            <p><strong>Category:</strong> {service.category}</p>
            <p>{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Complete Example Workflows

### Workflow 1: Complete Worker Registration with Portfolio

```javascript
// Step 1: Get all services
const services = await getServices();
console.log(`Available services: ${services.length}`);

// Step 2: Select electrician services
const electricianServices = services
  .filter(s => s.category === 'Electrician')
  .map(s => s.id);

// Step 3: Prepare portfolio images
const portfolio = [
  {
    imageUrl: 'https://example.com/project1.jpg',
    description: 'Commercial building wiring installation'
  },
  {
    imageUrl: 'https://example.com/project2.jpg',
    description: 'Residential electrical maintenance'
  }
];

// Step 4: Register worker with portfolio
const workerData = {
  firstName: 'Hassan',
  lastName: 'Ali',
  email: 'hassan@example.com',
  phoneNumber: '+923001234567',
  password: 'SecurePassword123',
  cnicNumber: '3510112345678',
  address: 'Karachi, Pakistan',
  latitude: 24.8607,
  longitude: 67.0011,
  hourlyRate: 600,
  serviceIds: electricianServices,
  portfolioImages: portfolio
};

const registeredWorker = await registerWorker(workerData);
console.log('Registration successful, Worker ID:', registeredWorker.id);
console.log('Portfolio images added:', registeredWorker.portfolio.length);
```

### Workflow 2: Add Portfolio After Registration

```javascript
const workerId = 'worker-uuid-from-registration';

// Add new portfolio image
const newPortfolio = {
  imageUrl: 'https://example.com/recent-project.jpg',
  description: 'Latest commercial project completed'
};

const addedImage = await addPortfolioImage(workerId, newPortfolio);
console.log('Portfolio image added:', addedImage.id);

// Get all portfolio images
const allPortfolio = await getPortfolio(workerId);
console.log('Total portfolio images:', allPortfolio.length);
```

### Workflow 3: Complete Filtered Service Search

```javascript
// Get all services
const allServices = await getServices();

// Group by category
const servicesByCategory = allServices.reduce((acc, service) => {
  if (!acc[service.category]) {
    acc[service.category] = [];
  }
  acc[service.category].push(service);
  return acc;
}, {});

// Display grouped services
Object.entries(servicesByCategory).forEach(([category, services]) => {
  console.log(`\n${category}:`);
  services.forEach(s => {
    console.log(`  ${s.icon} ${s.name}`);
  });
});

// Output:
// Electrician:
//   ⚡ Wiring & Rewiring
//   🔌 Switch & Socket Repair
// Plumber:
//   🔧 Pipe Installation
//   💧 Leak Detection
// ... and so on
```

---

## Status Codes Reference

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success (GET) | Services retrieved successfully |
| 201 | Created | Worker registered successfully |
| 400 | Bad Request | Email already taken, validation error |
| 404 | Not Found | Service/Worker not found |
| 500 | Server Error | Database connection error |

---

## Testing with HTTP Client Extension

If using the HTTP Client extension in VS Code, see `requests.http` file for complete test examples.

```http
### Get All Services
GET http://localhost:4000/services

### Register Worker
POST http://localhost:4000/workers/register
Content-Type: application/json

{
  "firstName": "Ahmed",
  "lastName": "Khan",
  "email": "ahmed@example.com",
  "phoneNumber": "+923334445566",
  "password": "SecurePass123",
  "cnicNumber": "3520123456789",
  "address": "123 Main Street",
  "latitude": 24.8607,
  "longitude": 67.0011,
  "serviceIds": [1, 2],
  "hourlyRate": 500,
  "portfolioImages": [
    {
      "imageUrl": "https://example.com/project1.jpg",
      "description": "Sample project"
    }
  ]
}
```

---

## Quick Checklist

- [ ] Backend running: `npm run start:dev`
- [ ] CORS configured in `main.ts`
- [ ] Services seeded (43 total): `npm run prisma:seed`
- [ ] Frontend API service created
- [ ] Worker registration form connected to API
- [ ] Portfolio management working
- [ ] Testing with HTTP Client or Postman

---

**Last Updated:** April 14, 2026  
**Backend Status:** ✅ Ready for Frontend Integration
