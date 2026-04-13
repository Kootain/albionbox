# Guild Regear API Documentation

This document outlines the RESTful API endpoints required to support the "Guild Regear" (补装) feature in the dashboard.

## Base Path
`/api/guilds/:guildId/regears`

---

## 1. List Regear Orders (工单列表)

Retrieves a paginated list of regear orders for a specific guild, along with aggregated statistics.

**Endpoint:**
`GET /api/guilds/:guildId/regears`

**Query Parameters:**
- `status` (optional): Filter by order status (`active` | `completed`)
- `limit` (optional): Items per page (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "total": 24,
  "data": [
    {
      "id": "ord-001",
      "startTime": "2026-04-10T14:00:00Z",
      "endTime": "2026-04-10T15:30:00Z",
      "status": "active",
      "battleIds": ["BR-1001", "BR-1002", "BR-1003"],
      "stats": {
        "totalDeaths": 150,
        "reviewedDeaths": 100,
        "pendingReview": 50,
        "pendingRegear": 80,
        "completedRegear": 20
      }
    }
  ]
}
```

---

## 2. Get Regear Order Details (工单详情)

Retrieves detailed information about a specific regear order, including its configuration rules and the full list of death records (which double as regear requests).

**Endpoint:**
`GET /api/guilds/:guildId/regears/:orderId`

**Response:**
```json
{
  "order": {
    "id": "ord-001",
    "startTime": "2026-04-10T14:00:00Z",
    "endTime": "2026-04-10T15:30:00Z",
    "status": "active",
    "battleIds": ["BR-1001", "BR-1002", "BR-1003"],
    "stats": {
      "totalDeaths": 150,
      "reviewedDeaths": 100,
      "pendingReview": 50,
      "pendingRegear": 80,
      "completedRegear": 20
    }
  },
  "config": {
    "allowedSlots": ["MainHand", "OffHand", "Head", "Armor", "Shoes", "Cape"]
  },
  "records": [
    {
      "id": "rec-1",
      "status": "pending_review",
      "reviewComment": null,
      "deathTime": "2026-04-10T14:15:00Z",
      "deathFame": 125000,
      "playerName": "Kootain",
      "ip": 1450,
      "mainHandType": "T6_MAIN_DAGGER@2",
      "equipment": [
        { "slot": "MainHand", "url": "https://img.albionbox.com/...", "type": "T6_MAIN_DAGGER@2" },
        { "slot": "OffHand", "url": "https://img.albionbox.com/...", "type": "T6_OFF_HORN_KEEPER@1" }
      ]
    }
  ]
}
```

---

## 3. Update Regear Configuration (修改补装配置)

Updates the equipment slot configuration for a specific regear order. Unchecked slots will be ignored when aggregating equipment statistics.

**Endpoint:**
`PUT /api/guilds/:guildId/regears/:orderId/config`

**Request Body:**
```json
{
  "allowedSlots": ["MainHand", "OffHand", "Head", "Armor", "Shoes", "Cape", "Mount"]
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "allowedSlots": ["MainHand", "OffHand", "Head", "Armor", "Shoes", "Cape", "Mount"]
  }
}
```

---

## 4. Update Record Status (操作死亡记录/审批)

Updates the status of an individual death record (regear request). This endpoint supports actions like Approving, Rejecting, Excluding, Completing, and Rolling back.

**Endpoint:**
`POST /api/guilds/:guildId/regears/:orderId/records/:recordId/status`

**Request Body:**
- `status`: The new status. Allowed values: `pending_review` | `rejected` | `excluded` | `pending_regear` | `completed`.
- `comment` (optional): The review or rejection reason entered by the reviewer. Required/recommended for `rejected` or `excluded`.

**Example Request (Approve to Pending Regear):**
```json
{
  "status": "pending_regear",
  "comment": "Approved for ZvZ regear."
}
```

**Example Request (Reject):**
```json
{
  "status": "rejected",
  "comment": "Did not wear the required alliance cape."
}
```

**Response:**
```json
{
  "success": true,
  "record": {
    "id": "rec-1",
    "status": "pending_regear",
    "reviewComment": "Approved for ZvZ regear."
  }
}
```

---

## Data Models Reference

### RegearOrderStatus
Enum: `'active' | 'completed'`

### RegearRecordStatus
Enum: `'excluded' | 'pending_review' | 'rejected' | 'pending_regear' | 'completed'`

### EquipmentSlot
Enum: `'MainHand' | 'OffHand' | 'Head' | 'Armor' | 'Shoes' | 'Cape' | 'Bag' | 'Mount' | 'Potion' | 'Food'`
