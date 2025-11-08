# MJ Jewellers - Invoice Management API

REST API for managing invoices and customers for MJ Jewellers billing system.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally on port 27017)

## Setup

1. Make sure MongoDB is running:

   ```bash
   mongod
   ```

2. Install dependencies (already done):

   ```bash
   npm install
   ```

3. Environment variables are configured in `.env` file

## Running the API

Start the API server in development mode:

```bash
npm run api:dev
```

The API will be available at: `http://localhost:3004`

## API Endpoints

### Health Check

- `GET /health` - Server health status

### Customers

- `GET /api/customers` - Get all customers (with pagination and search)
  - Query params: `search`, `page`, `limit`
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Invoices

- `GET /api/invoices` - Get all invoices (with filters and pagination)
  - Query params: `status`, `search`, `page`, `limit`, `sortBy`, `order`
- `GET /api/invoices/stats/dashboard` - Get dashboard statistics
- `GET /api/invoices/:id` - Get invoice by ID
- `GET /api/invoices/number/:invoiceNumber` - Get invoice by invoice number
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `PATCH /api/invoices/:id/status` - Update invoice status
- `DELETE /api/invoices/:id` - Delete invoice

## Data Models

### Customer Schema

```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "phone": "string (required)",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string (default: India)"
  },
  "gstNumber": "string (optional)"
}
```

### Invoice Schema

```json
{
  "invoiceNumber": "string (auto-generated)",
  "customerId": "ObjectId (required)",
  "items": [
    {
      "description": "string",
      "quantity": "number",
      "rate": "number",
      "amount": "number",
      "hsnCode": "string (optional)",
      "taxRate": "number (optional)"
    }
  ],
  "subtotal": "number",
  "taxAmount": "number",
  "taxRate": "number",
  "discount": "number",
  "total": "number",
  "status": "draft | sent | paid | cancelled | overdue",
  "invoiceDate": "Date",
  "dueDate": "Date",
  "notes": "string (optional)",
  "terms": "string (optional)",
  "paymentMethod": "string (optional)"
}
```

## Example Requests

### Create Customer

```bash
curl -X POST http://localhost:3004/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    }
  }'
```

### Create Invoice

```bash
curl -X POST http://localhost:3004/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID_HERE",
    "items": [
      {
        "description": "Gold Ring",
        "quantity": 1,
        "rate": 50000,
        "hsnCode": "7113"
      }
    ],
    "taxRate": 18,
    "discount": 0,
    "dueDate": "2025-12-31"
  }'
```

## Database

The API connects to MongoDB at: `mongodb://localhost:27017/mj_invoice_db`

Collections:

- `customers` - Customer data
- `invoices` - Invoice data

## Notes

- Invoice numbers are auto-generated in the format: `INV-00001`
- All monetary amounts are in the smallest currency unit (paise/cents)
- Timestamps (`createdAt`, `updatedAt`) are automatically managed
- Customer information is denormalized in invoices for historical accuracy
