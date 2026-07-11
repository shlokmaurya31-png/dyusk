import argparse
import json
import os

import odoorpc
from dotenv import load_dotenv


def connect():
    load_dotenv()
    host = os.environ["ODOO_HOST"].replace("https://", "").replace("http://", "").strip("/")
    port = int(os.environ.get("ODOO_PORT", "443"))
    protocol = os.environ.get("ODOO_PROTOCOL", "jsonrpc+ssl")
    db = os.environ["ODOO_DB"]
    login = os.environ["ODOO_LOGIN"]
    api_key = os.environ["ODOO_API_KEY"]

    odoo = odoorpc.ODOO(host, port=port, protocol=protocol)
    odoo.login(db, login, api_key)
    return odoo


def cmd_models(args):
    odoo = connect()
    domain = []
    if args.search:
        domain = [("model", "ilike", args.search)]
    rows = odoo.env["ir.model"].search_read(domain, ["model", "name"], limit=args.limit)
    print(json.dumps(rows, indent=2, ensure_ascii=False))


def cmd_read(args):
    odoo = connect()
    domain = json.loads(args.domain)
    fields = [field.strip() for field in args.fields.split(",") if field.strip()]
    rows = odoo.env[args.model].search_read(domain, fields, limit=args.limit)
    print(json.dumps(rows, indent=2, ensure_ascii=False, default=str))


def cmd_write(args):
    odoo = connect()
    ids = [int(value.strip()) for value in args.ids.split(",") if value.strip()]
    values = json.loads(args.values)
    ok = odoo.env[args.model].write(ids, values)
    print(json.dumps({"ok": ok, "model": args.model, "ids": ids}, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Small Odoo Online API helper.")
    sub = parser.add_subparsers(required=True)

    models = sub.add_parser("models", help="List Odoo models.")
    models.add_argument("--search", default="")
    models.add_argument("--limit", type=int, default=20)
    models.set_defaults(func=cmd_models)

    read = sub.add_parser("read", help="Read records from a model.")
    read.add_argument("model")
    read.add_argument("--domain", default="[]", help='JSON domain, e.g. "[[\"name\", \"ilike\", \"test\"]]"')
    read.add_argument("--fields", default="id,name")
    read.add_argument("--limit", type=int, default=20)
    read.set_defaults(func=cmd_read)

    write = sub.add_parser("write", help="Write values to existing records.")
    write.add_argument("model")
    write.add_argument("--ids", required=True, help="Comma-separated record IDs.")
    write.add_argument("--values", required=True, help='JSON values, e.g. "{\"name\":\"New name\"}"')
    write.set_defaults(func=cmd_write)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
