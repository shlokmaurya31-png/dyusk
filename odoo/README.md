# Odoo Online Tools

This is a local API helper for Odoo Online. It does not install or modify the
Odoo server source code.

## Setup

Copy `.env.example` to `.env`, then fill in your Odoo host, database, login, and
API key.

Create an Odoo API key in Odoo from your user preferences/account security page.

## Commands

Use PowerShell from this folder:

```powershell
.\.venv\Scripts\python.exe .\odoo_tool.py models --search product
.\.venv\Scripts\python.exe .\odoo_tool.py read res.partner --fields id,name,email --limit 10
.\.venv\Scripts\python.exe .\odoo_tool.py write res.partner --ids 12 --values '{ "name": "New Name" }'
```

## What this can and cannot do

It can read and update Odoo data through your user's permissions.

It cannot edit Odoo Online backend Python source code. For custom backend modules,
use Odoo.sh or a self-hosted Odoo instance with Git access.
