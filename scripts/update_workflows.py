#!/usr/bin/env python3
"""Update existing K3RN n8n workflows to match the specification."""

import json
import sys
import urllib.request
import urllib.error

N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYmYyMWRlOS04MzUyLTRlMGEtYTI4MC1lNDU3OGZhYTUzMWMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNGE2ZGU3YjktNzYxNy00YTc3LTgwZjktYWZiMmFkMGQ1YmM0IiwiaWF0IjoxNzcxMjkwNDk0fQ.uAJ_PkDQoyyxjNuLiTUnWUIsUINY0G_v8SxDpq25V1A"
N8N_BASE = "https://agent.k3rnlabs.com/api/v1"
PG_CRED_ID = "Nl0ptIY5ANjEApX8"
GMAIL_CRED_ID = "n5COOi6bESTdG7f6"


def api_request(method, path, body=None):
    url = N8N_BASE + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("X-N8N-API-KEY", N8N_API_KEY)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"HTTP Error {e.code}: {err_body}", file=sys.stderr)
        return {"error": err_body, "status": e.code}


def update_workflow(wf_id, wf_def):
    """PUT /workflows/:id"""
    return api_request("PUT", f"/workflows/{wf_id}", wf_def)


def activate_workflow(wf_id):
    return api_request("POST", f"/workflows/{wf_id}/activate")


def deactivate_workflow(wf_id):
    return api_request("POST", f"/workflows/{wf_id}/deactivate")


# ============================================================
# WORKFLOW 1 UPDATE: K3RN__DBSetup__v1 (J6VpAcGAUiFJLmW7)
# ============================================================
def build_workflow_1():
    return {
        "name": "K3RN__DBSetup__v1",
        "nodes": [
            {
                "id": "manual-trigger",
                "name": "ManualTrigger",
                "type": "n8n-nodes-base.manualTrigger",
                "typeVersion": 1,
                "position": [250, 300],
                "parameters": {}
            },
            {
                "id": "create-idempotency",
                "name": "Create idempotency table",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [550, 300],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": (
                        "CREATE TABLE IF NOT EXISTS k3rn_idempotency (\n"
                        "  idempotency_key TEXT PRIMARY KEY,\n"
                        "  tool TEXT NOT NULL,\n"
                        "  created_at TIMESTAMPTZ DEFAULT NOW(),\n"
                        "  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'\n"
                        ");\n"
                        "CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON k3rn_idempotency(expires_at);"
                    )
                }
            },
            {
                "id": "create-budget",
                "name": "Create budget table",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [850, 300],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": (
                        "CREATE TABLE IF NOT EXISTS k3rn_task_budget (\n"
                        "  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,\n"
                        "  used INTEGER DEFAULT 0,\n"
                        "  limit_per_day INTEGER DEFAULT 100,\n"
                        "  updated_at TIMESTAMPTZ DEFAULT NOW()\n"
                        ");\n"
                        "INSERT INTO k3rn_task_budget (date, used) VALUES (CURRENT_DATE, 0) ON CONFLICT (date) DO NOTHING;"
                    )
                }
            },
            {
                "id": "respond-ok",
                "name": "Respond OK",
                "type": "n8n-nodes-base.set",
                "typeVersion": 3.4,
                "position": [1150, 300],
                "parameters": {
                    "mode": "manual",
                    "assignments": {
                        "assignments": [
                            {"id": "f1", "name": "ok", "value": True, "type": "boolean"},
                            {"id": "f2", "name": "message", "value": "Tables created", "type": "string"}
                        ]
                    }
                }
            }
        ],
        "connections": {
            "ManualTrigger": {"main": [[{"node": "Create idempotency table", "type": "main", "index": 0}]]},
            "Create idempotency table": {"main": [[{"node": "Create budget table", "type": "main", "index": 0}]]},
            "Create budget table": {"main": [[{"node": "Respond OK", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }


# ============================================================
# WORKFLOW 4 UPDATE: K3RN__notify_slack__v1 (9V2MuDFtcFnqzVjr)
# ============================================================
def build_workflow_4():
    return {
        "name": "K3RN__notify_slack__v1",
        "nodes": [
            {
                "id": "webhook",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [250, 300],
                "parameters": {
                    "path": "k3rn-notify-slack",
                    "httpMethod": "POST",
                    "responseMode": "responseNode"
                },
                "webhookId": "k3rn-notify-slack"
            },
            {
                "id": "validate",
                "name": "Validate",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [550, 300],
                "parameters": {
                    "jsCode": (
                        "const body = $input.first().json.body || $input.first().json;\n"
                        "if (!body.channel || !body.message) throw new Error('Missing channel or message');\n"
                        "return [{ json: { channel: body.channel, message: body.message, "
                        "level: body.level || 'info', idempotency_key: body.idempotency_key || null } }];"
                    )
                }
            },
            {
                "id": "check-idempotency",
                "name": "Check idempotency",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [850, 300],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": "SELECT idempotency_key FROM k3rn_idempotency WHERE idempotency_key = $1 AND expires_at > NOW()",
                    "options": {
                        "queryParams": "={{ $json.idempotency_key }}"
                    }
                }
            },
            {
                "id": "is-duplicate",
                "name": "Is duplicate?",
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.2,
                "position": [1150, 300],
                "parameters": {
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "cond1",
                                "leftValue": "={{ $json.idempotency_key }}",
                                "rightValue": "",
                                "operator": {"type": "string", "operation": "exists", "singleValue": True}
                            }
                        ],
                        "combinator": "and"
                    }
                }
            },
            {
                "id": "respond-duplicate",
                "name": "Respond duplicate",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [1450, 150],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "{\"ok\": true, \"skipped\": true, \"reason\": \"duplicate\"}"
                }
            },
            {
                "id": "send-slack",
                "name": "Send to Slack",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1450, 450],
                "parameters": {
                    "method": "POST",
                    "url": "={{ $env.SLACK_INCOMING_WEBHOOK_URL }}",
                    "sendBody": True,
                    "contentType": "json",
                    "body": {
                        "mode": "raw",
                        "rawBody": "={{ JSON.stringify({ text: $('Validate').first().json.message, channel: $('Validate').first().json.channel }) }}"
                    }
                }
            },
            {
                "id": "save-idempotency",
                "name": "Save idempotency key",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [1750, 450],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": "INSERT INTO k3rn_idempotency (idempotency_key, tool) VALUES ($1, 'notify_slack') ON CONFLICT DO NOTHING",
                    "options": {
                        "queryParams": "={{ $('Validate').first().json.idempotency_key }}"
                    }
                }
            },
            {
                "id": "increment-budget",
                "name": "Increment budget",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [2050, 450],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": (
                        "INSERT INTO k3rn_task_budget (date, used) VALUES (CURRENT_DATE, 1) "
                        "ON CONFLICT (date) DO UPDATE SET used = k3rn_task_budget.used + 1, updated_at = NOW()"
                    )
                }
            },
            {
                "id": "respond-ok",
                "name": "Respond OK",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [2350, 450],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "{\"ok\": true, \"sent\": true}"
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Validate", "type": "main", "index": 0}]]},
            "Validate": {"main": [[{"node": "Check idempotency", "type": "main", "index": 0}]]},
            "Check idempotency": {"main": [[{"node": "Is duplicate?", "type": "main", "index": 0}]]},
            "Is duplicate?": {
                "main": [
                    [{"node": "Respond duplicate", "type": "main", "index": 0}],
                    [{"node": "Send to Slack", "type": "main", "index": 0}]
                ]
            },
            "Send to Slack": {"main": [[{"node": "Save idempotency key", "type": "main", "index": 0}]]},
            "Save idempotency key": {"main": [[{"node": "Increment budget", "type": "main", "index": 0}]]},
            "Increment budget": {"main": [[{"node": "Respond OK", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }


# ============================================================
# WORKFLOW 5 UPDATE: K3RN__send_email__v1 (URkEZGMtaZqg7XRF)
# ============================================================
def build_workflow_5():
    return {
        "name": "K3RN__send_email__v1",
        "nodes": [
            {
                "id": "webhook",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [250, 300],
                "parameters": {
                    "path": "k3rn-send-email",
                    "httpMethod": "POST",
                    "responseMode": "responseNode"
                },
                "webhookId": "k3rn-send-email"
            },
            {
                "id": "validate",
                "name": "Validate",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [550, 300],
                "parameters": {
                    "jsCode": (
                        "const body = $input.first().json.body || $input.first().json;\n"
                        "if (!body.to || !body.subject || !body.body_md) throw new Error('Missing to, subject, or body_md');\n"
                        "return [{ json: { to: body.to, subject: body.subject, body_md: body.body_md, "
                        "reply_to: body.reply_to || null, idempotency_key: body.idempotency_key || null } }];"
                    )
                }
            },
            {
                "id": "check-idempotency",
                "name": "Check idempotency",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [850, 300],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": "SELECT idempotency_key FROM k3rn_idempotency WHERE idempotency_key = $1 AND expires_at > NOW()",
                    "options": {
                        "queryParams": "={{ $json.idempotency_key }}"
                    }
                }
            },
            {
                "id": "is-duplicate",
                "name": "Is duplicate?",
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.2,
                "position": [1150, 300],
                "parameters": {
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "cond1",
                                "leftValue": "={{ $json.idempotency_key }}",
                                "rightValue": "",
                                "operator": {"type": "string", "operation": "exists", "singleValue": True}
                            }
                        ],
                        "combinator": "and"
                    }
                }
            },
            {
                "id": "respond-duplicate",
                "name": "Respond duplicate",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [1450, 150],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "{\"ok\": true, \"skipped\": true}"
                }
            },
            {
                "id": "send-email",
                "name": "Send email",
                "type": "n8n-nodes-base.gmail",
                "typeVersion": 2.1,
                "position": [1450, 450],
                "credentials": {
                    "gmailOAuth2": {
                        "id": GMAIL_CRED_ID,
                        "name": "Gmail account"
                    }
                },
                "parameters": {
                    "sendTo": "={{ $('Validate').first().json.to }}",
                    "subject": "={{ $('Validate').first().json.subject }}",
                    "message": "={{ $('Validate').first().json.body_md }}",
                    "options": {}
                }
            },
            {
                "id": "save-idempotency",
                "name": "Save idempotency key",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [1750, 450],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": "INSERT INTO k3rn_idempotency (idempotency_key, tool) VALUES ($1, 'send_email') ON CONFLICT DO NOTHING",
                    "options": {
                        "queryParams": "={{ $('Validate').first().json.idempotency_key }}"
                    }
                }
            },
            {
                "id": "increment-budget",
                "name": "Increment budget",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [2050, 450],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": (
                        "INSERT INTO k3rn_task_budget (date, used) VALUES (CURRENT_DATE, 1) "
                        "ON CONFLICT (date) DO UPDATE SET used = k3rn_task_budget.used + 1, updated_at = NOW()"
                    )
                }
            },
            {
                "id": "respond-ok",
                "name": "Respond OK",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [2350, 450],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "{\"ok\": true, \"sent\": true}"
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Validate", "type": "main", "index": 0}]]},
            "Validate": {"main": [[{"node": "Check idempotency", "type": "main", "index": 0}]]},
            "Check idempotency": {"main": [[{"node": "Is duplicate?", "type": "main", "index": 0}]]},
            "Is duplicate?": {
                "main": [
                    [{"node": "Respond duplicate", "type": "main", "index": 0}],
                    [{"node": "Send email", "type": "main", "index": 0}]
                ]
            },
            "Send email": {"main": [[{"node": "Save idempotency key", "type": "main", "index": 0}]]},
            "Save idempotency key": {"main": [[{"node": "Increment budget", "type": "main", "index": 0}]]},
            "Increment budget": {"main": [[{"node": "Respond OK", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }


def main():
    updates = [
        ("K3RN__DBSetup__v1", "J6VpAcGAUiFJLmW7", build_workflow_1, False),
        ("K3RN__notify_slack__v1", "9V2MuDFtcFnqzVjr", build_workflow_4, True),
        ("K3RN__send_email__v1", "URkEZGMtaZqg7XRF", build_workflow_5, True),
    ]

    for name, wf_id, builder, should_activate in updates:
        print(f"\n{'='*60}")
        print(f"Updating: {name} (ID: {wf_id})")

        # Deactivate first if needed
        if should_activate:
            deact = deactivate_workflow(wf_id)
            print(f"  Deactivated: {deact.get('id', deact)}")

        wf_def = builder()
        resp = update_workflow(wf_id, wf_def)

        if "id" in resp:
            print(f"  Updated successfully: {resp['id']}")
            print(f"  Nodes: {[n['name'] for n in resp.get('nodes', [])]}")
        else:
            print(f"  ERROR: {resp}")
            continue

        if should_activate:
            act = activate_workflow(wf_id)
            if "id" in act:
                print(f"  Re-activated successfully")
            else:
                print(f"  Activation: {act}")

    print(f"\n{'='*60}")
    print("Done!")


if __name__ == "__main__":
    main()
