#!/usr/bin/env python3
"""Create all 6 K3RN n8n workflows via REST API."""

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


def create_workflow(wf_def):
    return api_request("POST", "/workflows", wf_def)


def activate_workflow(wf_id):
    return api_request("POST", f"/workflows/{wf_id}/activate")


def list_workflows():
    return api_request("GET", "/workflows?limit=100")


def delete_workflow(wf_id):
    return api_request("DELETE", f"/workflows/{wf_id}")


def find_existing(name):
    resp = list_workflows()
    for w in resp.get("data", []):
        if w["name"] == name:
            return w["id"]
    return None


def pg_node(node_id, name, query, params=None, position=None):
    node = {
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.6,
        "position": position or [250, 300],
        "credentials": {
            "postgres": {
                "id": PG_CRED_ID,
                "name": "Postgres account"
            }
        },
        "parameters": {
            "operation": "executeQuery",
            "query": query
        }
    }
    if params:
        node["parameters"]["additionalFields"] = {
            "queryParams": ",".join(params)
        }
    return node


def pg_node_with_params(node_id, name, query, params, position=None):
    """Postgres node with query parameters."""
    return {
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.6,
        "position": position or [250, 300],
        "credentials": {
            "postgres": {
                "id": PG_CRED_ID,
                "name": "Postgres account"
            }
        },
        "parameters": {
            "operation": "executeQuery",
            "query": query,
            "options": {
                "queryParams": params
            }
        }
    }


# ============================================================
# WORKFLOW 1: K3RN__DBSetup__v1
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
# WORKFLOW 2: K3RN__log_audit__v1
# ============================================================
def build_workflow_2():
    return {
        "name": "K3RN__log_audit__v1",
        "nodes": [
            {
                "id": "webhook",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [250, 300],
                "parameters": {
                    "path": "k3rn-log-audit",
                    "httpMethod": "POST",
                    "responseMode": "responseNode"
                },
                "webhookId": "k3rn-log-audit"
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
                        "if (!body.dossierId || !body.action || !body.entity) {\n"
                        "  throw new Error('Missing required fields: dossierId, action, entity');\n"
                        "}\n"
                        "return [{ json: { dossierId: body.dossierId, action: body.action, entity: body.entity, "
                        "metadata: body.metadata || {}, userId: body.userId || null } }];"
                    )
                }
            },
            {
                "id": "insert-audit",
                "name": "Insert audit log",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [850, 300],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": (
                        'INSERT INTO "AuditLog" (id, "dossierId", action, entity, metadata, "userId", "createdAt")\n'
                        "VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5, NOW())"
                    ),
                    "options": {
                        "queryParams": "={{ $json.dossierId }},={{ $json.action }},={{ $json.entity }},={{ JSON.stringify($json.metadata) }},={{ $json.userId }}"
                    }
                }
            },
            {
                "id": "respond-ok",
                "name": "Respond to Webhook",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [1150, 300],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={\"ok\": true}"
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Validate", "type": "main", "index": 0}]]},
            "Validate": {"main": [[{"node": "Insert audit log", "type": "main", "index": 0}]]},
            "Insert audit log": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }


# ============================================================
# WORKFLOW 3: K3RN__get_task_budget__v1
# ============================================================
def build_workflow_3():
    return {
        "name": "K3RN__get_task_budget__v1",
        "nodes": [
            {
                "id": "webhook",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [250, 300],
                "parameters": {
                    "path": "k3rn-get-task-budget",
                    "httpMethod": "POST",
                    "responseMode": "responseNode"
                },
                "webhookId": "k3rn-get-task-budget"
            },
            {
                "id": "upsert-budget",
                "name": "Upsert today budget",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.6,
                "position": [550, 300],
                "credentials": {"postgres": {"id": PG_CRED_ID, "name": "Postgres account"}},
                "parameters": {
                    "operation": "executeQuery",
                    "query": (
                        "INSERT INTO k3rn_task_budget (date, used) VALUES (CURRENT_DATE, 0) ON CONFLICT (date) DO NOTHING;\n"
                        "SELECT date, used, limit_per_day, updated_at FROM k3rn_task_budget WHERE date = CURRENT_DATE;"
                    )
                }
            },
            {
                "id": "compute-remaining",
                "name": "Compute remaining",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [850, 300],
                "parameters": {
                    "jsCode": (
                        "const row = $input.first().json;\n"
                        "const used = row.used || 0;\n"
                        "const limit = row.limit_per_day || 100;\n"
                        "const remaining = Math.max(0, limit - used);\n"
                        "const resetAt = new Date();\n"
                        "resetAt.setUTCHours(24, 0, 0, 0);\n"
                        "return [{ json: { ok: true, used, remaining, limit, reset_at: resetAt.toISOString() } }];"
                    )
                }
            },
            {
                "id": "respond",
                "name": "Respond to Webhook",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [1150, 300],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ JSON.stringify($json) }}"
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Upsert today budget", "type": "main", "index": 0}]]},
            "Upsert today budget": {"main": [[{"node": "Compute remaining", "type": "main", "index": 0}]]},
            "Compute remaining": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }


# ============================================================
# WORKFLOW 4: K3RN__notify_slack__v1
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
# WORKFLOW 5: K3RN__send_email__v1
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


# ============================================================
# WORKFLOW 6: K3RN__get_workflow_status__v1
# ============================================================
def build_workflow_6():
    return {
        "name": "K3RN__get_workflow_status__v1",
        "nodes": [
            {
                "id": "webhook",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [250, 300],
                "parameters": {
                    "path": "k3rn-get-workflow-status",
                    "httpMethod": "POST",
                    "responseMode": "responseNode"
                },
                "webhookId": "k3rn-get-workflow-status"
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
                        "if (!body.executionId) throw new Error('Missing executionId');\n"
                        "return [{ json: { executionId: body.executionId } }];"
                    )
                }
            },
            {
                "id": "get-execution",
                "name": "Get n8n execution",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [850, 300],
                "parameters": {
                    "method": "GET",
                    "url": "=https://agent.k3rnlabs.com/api/v1/executions/{{ $json.executionId }}",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {
                                "name": "X-N8N-API-KEY",
                                "value": "={{ $env.N8N_API_KEY }}"
                            }
                        ]
                    }
                }
            },
            {
                "id": "map-status",
                "name": "Map status",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [1150, 300],
                "parameters": {
                    "jsCode": (
                        "const data = $input.first().json;\n"
                        "const finished = data.finished ?? false;\n"
                        "const status = finished ? (data.stoppedAt ? 'COMPLETED' : 'FAILED') : 'RUNNING';\n"
                        "return [{ json: { ok: true, executionId: data.id, status, finished } }];"
                    )
                }
            },
            {
                "id": "respond",
                "name": "Respond to Webhook",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [1450, 300],
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ JSON.stringify($json) }}"
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Validate", "type": "main", "index": 0}]]},
            "Validate": {"main": [[{"node": "Get n8n execution", "type": "main", "index": 0}]]},
            "Get n8n execution": {"main": [[{"node": "Map status", "type": "main", "index": 0}]]},
            "Map status": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }


def main():
    workflows = [
        ("K3RN__DBSetup__v1", build_workflow_1, False),
        ("K3RN__log_audit__v1", build_workflow_2, True),
        ("K3RN__get_task_budget__v1", build_workflow_3, True),
        ("K3RN__notify_slack__v1", build_workflow_4, True),
        ("K3RN__send_email__v1", build_workflow_5, True),
        ("K3RN__get_workflow_status__v1", build_workflow_6, True),
    ]

    results = {}

    for name, builder, should_activate in workflows:
        print(f"\n{'='*60}")
        print(f"Processing: {name}")

        # Check if already exists
        existing_id = find_existing(name)
        if existing_id:
            print(f"  Already exists with ID: {existing_id} — skipping creation")
            wf_id = existing_id
        else:
            wf_def = builder()
            resp = create_workflow(wf_def)
            if "error" in resp or "id" not in resp:
                print(f"  ERROR creating workflow: {resp}")
                results[name] = {"id": None, "error": str(resp)}
                continue
            wf_id = resp["id"]
            print(f"  Created with ID: {wf_id}")

        results[name] = {"id": wf_id}

        if should_activate:
            act_resp = activate_workflow(wf_id)
            if "id" in act_resp:
                print(f"  Activated successfully")
                results[name]["active"] = True
            else:
                print(f"  Activation response: {act_resp}")
                results[name]["active"] = False

    print(f"\n{'='*60}")
    print("SUMMARY:")
    print(json.dumps(results, indent=2))

    # Run DBSetup workflow
    dbsetup_id = results.get("K3RN__DBSetup__v1", {}).get("id")
    if dbsetup_id:
        print(f"\nDBSetup workflow ID: {dbsetup_id}")
        print("Note: Run this manually via the n8n UI or execute it with the API.")

    return results


if __name__ == "__main__":
    main()
