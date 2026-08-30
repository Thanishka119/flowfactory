# FlowFactory API

## Authentication

POST /api/auth/login
POST /api/auth/register
GET /api/auth/me

## Inventory

GET /api/inventory
POST /api/inventory
GET /api/inventory/:id
PUT /api/inventory/:id
GET /api/inventory/:id/transactions

## Suppliers

GET /api/suppliers
POST /api/suppliers
GET /api/suppliers/:id
PUT /api/suppliers/:id

## Purchases

GET /api/purchases
POST /api/purchases
GET /api/purchases/:id

## Invoice

POST /api/invoices/upload
GET /api/invoices/:id
POST /api/invoices/:id/process
POST /api/invoices/:id/verify

## Production

GET /api/production
POST /api/production

## Consumption

POST /api/consumption
GET /api/consumption

## Sales

GET /api/sales
POST /api/sales