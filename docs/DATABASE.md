# FlowFactory Database

## Core Tables

- users
- roles
- permissions
- suppliers
- inventory_items
- inventory_transactions
- purchases
- purchase_items
- invoices
- invoice_items
- production_orders
- production_items
- consumption_records
- finished_goods
- sales
- sales_items
- qr_codes
- alerts
- notifications
- audit_logs

## Important Relationships

Supplier
→ Purchases

Purchase
→ Purchase Items
→ Inventory Transactions

Production Order
→ Consumption Records
→ Inventory Transactions

Production Order
→ Finished Goods

Finished Goods
→ Sales