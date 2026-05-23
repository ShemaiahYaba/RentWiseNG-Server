**TASK 2**

**Goal:** System structure     
**Task:** Define users, listings, verification, payment, DB sketch    
**Deliverables:** System structure draft    

# **RentWise — System Structure Draft v1**

**Team Neon | TechCrush Alumni Buildathon 2026**

**Backend Development Team**

---

## **1\. User Roles & Scopes**

### **Role Enum Values**

tenant | agent | landlord | admin

---

### **1.1 Tenant**

**Can:**

* Register and verify phone \+ email  
* Browse and search verified listings  
* Book inspections on available listings  
* Chat with agents/landlords scoped to a listing  
* Initiate and confirm payments  
* Submit reviews on completed rentals  
* File reports on listings or users  
* View their own audit trail \+ scoped actions taken on their records by counterparties

**Cannot:**

* Create or manage listings  
* Access admin or verification queues  
* View other tenants' data

---

### 

### **1.2 Agent**

**Can:**

* Register and verify phone \+ email  
* Submit KYC documents (required before creating listings)  
* Create, edit, and manage listings  
* Receive and manage inspection requests on their listings  
* Chat with tenants scoped to their listings  
* Receive released payments  
* View their own audit trail \+ scoped actions from landlords they are transacting with

**Cannot:**

* Access admin or verification queues  
* Manage listings they do not own  
* Release payments manually (system or tenant-triggered only)

---

### **1.3 Landlord**

**Can:**

* Register and verify phone \+ email  
* Submit KYC documents (required before creating listings)  
* Create listings directly  
* View inspections and payments on their properties  
* Chat with tenants scoped to their listings  
* Receive released payments  
* View their own audit trail \+ scoped actions from agents managing their properties

**Cannot:**

* Access admin or verification queues  
* Manage listings they do not own

---

### **1.4 Admin**

**Can:**

* Access and action the listing verification queue  
* Access and action the KYC/user verification queue  
* Approve, limit, or reject listings  
* Approve or reject KYC submissions  
* Moderate and resolve reports  
* View the full platform audit log  
* Manage system config values

**Cannot:**

* Self-register (admin accounts are created internally)  
* Initiate payments or bookings

---

## **2\. Database Schema**

### **Conventions**

* All primary keys are UUID  
* All tables include soft delete columns: deleted\_at TIMESTAMP NULL and deleted\_by UUID NULL FK → users  
* Timestamps are UTC  
* Enums are stored as VARCHAR with explicit allowed values documented per table

---

### **2.1 users**

id                UUID          PK  
role              VARCHAR       tenant | agent | landlord | admin  
full\_name         VARCHAR  
email             VARCHAR       UNIQUE  
phone             VARCHAR       UNIQUE  
password\_hash     VARCHAR  
phone\_verified    BOOLEAN       DEFAULT false  
email\_verified    BOOLEAN       DEFAULT false  
is\_active         BOOLEAN       DEFAULT true  
created\_at        TIMESTAMP  
updated\_at        TIMESTAMP  
deleted\_at        TIMESTAMP     NULL  
deleted\_by        UUID          NULL FK → users

---

### **2.2 kyc\_submissions**

One submission per user. Re-submission creates a new record; previous is soft-deleted.

id                    UUID          PK  
user\_id               UUID          FK → users  
document\_type         VARCHAR       nin | bvn | passport | drivers\_licence  
document\_number       VARCHAR       encrypted at rest  
document\_front\_url    VARCHAR       Cloudflare R2 URL  
document\_back\_url     VARCHAR       Cloudflare R2 URL, NULL if not applicable  
selfie\_url            VARCHAR       NULL, for future liveness check  
status                VARCHAR       pending | approved | rejected  
rejection\_reason      TEXT          NULL  
reviewed\_by           UUID          NULL FK → users (admin)  
reviewed\_at           TIMESTAMP     NULL  
submitted\_at          TIMESTAMP  
deleted\_at            TIMESTAMP     NULL  
deleted\_by            UUID          NULL FK → users

### **2.3 kyc\_status\_logs**

Tracks every KYC state transition.

id                UUID          PK  
kyc\_id            UUID          FK → kyc\_submissions  
from\_status       VARCHAR       pending | approved | rejected  
to\_status         VARCHAR       pending | approved | rejected  
changed\_by        UUID          FK → users (admin)  
note              TEXT          NULL  
changed\_at        TIMESTAMP  
---

### **2.4 sessions**

Managed by Better Auth. Stores refresh token state and device context.

id                    UUID          PK  
user\_id               UUID          FK → users  
refresh\_token\_hash    VARCHAR       hashed, never raw  
expires\_at            TIMESTAMP  
ip\_address            VARCHAR       NULL  
user\_agent            VARCHAR       NULL  
revoked\_at            TIMESTAMP     NULL  
created\_at            TIMESTAMP

### **2.5 oauth\_accounts**

Stores linked OAuth provider accounts (e.g. Google).

id                    UUID          PK  
user\_id               UUID          FK → users  
provider              VARCHAR       google | (extendable)  
provider\_account\_id   VARCHAR       provider's user ID  
provider\_email        VARCHAR       NULL  
access\_token          TEXT          NULL, encrypted  
refresh\_token         TEXT          NULL, encrypted  
token\_expires\_at      TIMESTAMP     NULL  
linked\_at             TIMESTAMP  
deleted\_at            TIMESTAMP     NULL  
deleted\_by            UUID          NULL FK → users

---

### **2.6 locations**

Normalised location reference table. Listings FK into this.

id            UUID          PK  
state         VARCHAR  
city          VARCHAR  
area          VARCHAR  
latitude      DECIMAL       NULL  
longitude     DECIMAL       NULL  
created\_at    TIMESTAMP  
deleted\_at    TIMESTAMP     NULL  
deleted\_by    UUID          NULL FK → users

### **2.7 apartment\_types**

Lookup table for listing apartment type values.

id            UUID          PK  
label         VARCHAR       UNIQUE   e.g. self\_contain | one\_bedroom | two\_bedroom | flat | duplex | bungalow  
created\_at    TIMESTAMP  
deleted\_at    TIMESTAMP     NULL  
deleted\_by    UUID          NULL FK → users  
---

### **2.8 listings**

id                    UUID          PK  
owner\_id              UUID          FK → users (agent or landlord)  
location\_id           UUID          FK → locations  
apartment\_type\_id     UUID          FK → apartment\_types  
title                 VARCHAR  
description           TEXT  
rent\_amount           DECIMAL  
availability\_status   VARCHAR       available | rented | suspended  
verification\_status   VARCHAR       pending | verified | limited | rejected  
ownership\_doc\_url     VARCHAR       Cloudflare R2 URL  
video\_url             VARCHAR       NULL  
created\_at            TIMESTAMP  
updated\_at            TIMESTAMP  
deleted\_at            TIMESTAMP     NULL  
deleted\_by            UUID          NULL FK → users

### 

### **2.9 listing\_photos**

id            UUID          PK  
listing\_id    UUID          FK → listings  
photo\_url     VARCHAR       Cloudflare R2 URL  
sort\_order    SMALLINT      for display ordering  
uploaded\_at   TIMESTAMP  
deleted\_at    TIMESTAMP     NULL  
deleted\_by    UUID          NULL FK → users

### **2.10 listing\_verification\_logs**

Tracks every listing verification state transition.

id                UUID          PK  
listing\_id        UUID          FK → listings  
from\_status       VARCHAR       pending | verified | limited | rejected  
to\_status         VARCHAR       pending | verified | limited | rejected  
reviewed\_by       UUID          FK → users (admin)  
note              TEXT          NULL  
changed\_at        TIMESTAMP

---

### **2.11 inspections**

id                UUID          PK  
tenant\_id         UUID          FK → users  
listing\_id        UUID          FK → listings  
scheduled\_date    DATE  
scheduled\_time    TIME  
status            VARCHAR       pending | confirmed | completed | cancelled  
created\_at        TIMESTAMP  
updated\_at        TIMESTAMP  
deleted\_at        TIMESTAMP     NULL  
deleted\_by        UUID          NULL FK → users

### **2.12 inspection\_status\_logs**

Tracks every inspection state transition.

id                UUID          PK  
inspection\_id     UUID          FK → inspections  
from\_status       VARCHAR       pending | confirmed | completed | cancelled  
to\_status         VARCHAR       pending | confirmed | completed | cancelled  
changed\_by        UUID          FK → users  
note              TEXT          NULL  
changed\_at        TIMESTAMP  
---

### **2.13 conversations**

Links two parties to a listing for scoped messaging.

id                UUID          PK  
listing\_id        UUID          FK → listings  
participant\_one   UUID          FK → users  
participant\_two   UUID          FK → users  
created\_at        TIMESTAMP  
deleted\_at        TIMESTAMP     NULL  
deleted\_by        UUID          NULL FK → users

### **2.14 messages**

id                  UUID          PK  
conversation\_id     UUID          FK → conversations  
sender\_id           UUID          FK → users  
content             TEXT  
is\_read             BOOLEAN       DEFAULT false  
sent\_at             TIMESTAMP  
deleted\_at          TIMESTAMP     NULL  
deleted\_by          UUID          NULL FK → users

---

### **2.15 payments**

id                    UUID          PK  
tenant\_id             UUID          FK → users  
listing\_id            UUID          FK → listings  
inspection\_id         UUID          FK → inspections  
amount                DECIMAL  
paystack\_reference    VARCHAR       UNIQUE  
status                VARCHAR       initiated | processing | held | released | failed | refunded  
created\_at            TIMESTAMP  
released\_at           TIMESTAMP     NULL  
deleted\_at            TIMESTAMP     NULL  
deleted\_by            UUID          NULL FK → users

### 

### **2.16 payment\_status\_logs**

Tracks every payment state transition.

id                UUID          PK  
payment\_id        UUID          FK → payments  
from\_status       VARCHAR       initiated | processing | held | released | failed | refunded  
to\_status         VARCHAR       initiated | processing | held | released | failed | refunded  
triggered\_by      UUID          NULL FK → users (NULL if system-triggered)  
trigger\_source    VARCHAR       user | system | webhook  
note              TEXT          NULL  
changed\_at        TIMESTAMP  
---

**2.17 reports**  
id              UUID          PK  
reporter\_id     UUID          FK → users  
target\_type     VARCHAR       listing | user  
target\_id       UUID  
reason          TEXT  
status          VARCHAR       open | under\_review | resolved | dismissed  
created\_at      TIMESTAMP  
deleted\_at      TIMESTAMP     NULL  
deleted\_by      UUID          NULL FK → users

### **2.18 report\_status\_logs**

id              UUID          PK  
report\_id       UUID          FK → reports  
from\_status     VARCHAR       open | under\_review | resolved | dismissed  
to\_status       VARCHAR       open | under\_review | resolved | dismissed  
actioned\_by     UUID          FK → users (admin)  
note            TEXT          NULL  
changed\_at      TIMESTAMP  
---

### **2.19 reviews**

id              UUID          PK  
reviewer\_id     UUID          FK → users  
listing\_id      UUID          FK → listings  
payment\_id      UUID          FK → payments (ensures review only after completed payment)  
rating          SMALLINT      1 | 2 | 3 | 4 | 5  
comment         TEXT          NULL  
created\_at      TIMESTAMP  
deleted\_at      TIMESTAMP     NULL  
deleted\_by      UUID          NULL FK → users

---

### **2.20 audit\_logs**

Generic audit trail for all significant platform actions. Scoped per role at the API layer.

id              UUID          PK  
actor\_id        UUID          FK → users (who performed the action)  
actor\_role      VARCHAR       tenant | agent | landlord | admin  
action          VARCHAR       e.g. listing.created | inspection.confirmed | payment.released | kyc.approved  
entity\_type     VARCHAR       e.g. listing | inspection | payment | user | kyc\_submission  
entity\_id       UUID          the record acted upon  
before\_state    JSONB         NULL — snapshot of record before action  
after\_state     JSONB         snapshot of record after action  
ip\_address      VARCHAR       NULL  
user\_agent      VARCHAR       NULL  
created\_at      TIMESTAMP

**Scoping rules (enforced at API layer):**

* tenant → rows where actor\_id \= self OR entity\_id matches their inspections/payments  
* agent → rows where actor\_id \= self OR entity\_id matches their listings/inspections/payments  
* landlord → rows where actor\_id \= self OR entity\_id matches their listings/inspections/payments  
* admin → all rows

---

### 

### **2.21 system\_config**

Centralises all runtime-configurable system values. No business rule should be hardcoded.

id              UUID          PK  
key             VARCHAR       UNIQUE  
value           TEXT  
description     TEXT          NULL — explains what this config controls  
updated\_by      UUID          FK → users (admin)  
updated\_at      TIMESTAMP

**Example config entries:**

| key | value | description |
| :---- | :---- | :---- |
| payment\_release\_window\_hours | 48 | Hours after inspection before auto-release triggers |
| max\_listing\_photos | 10 | Maximum photos allowed per listing |
| inspection\_advance\_booking\_days | 3 | Minimum days in advance an inspection can be booked |
| kyc\_required\_for\_listing | true | Whether KYC must be approved before agent/landlord can create listings |
| max\_active\_listings\_per\_agent | 20 | Listing cap per agent on MVP |

---

## 

## **3\. Key Relationships**

users ──\< kyc\_submissions               one user, one active KYC record  
kyc\_submissions ──\< kyc\_status\_logs     full KYC state history  
users ──\< sessions                      one user, many sessions  
users ──\< oauth\_accounts                one user, many OAuth providers  
locations ──\< listings                  normalised location  
apartment\_types ──\< listings            normalised apartment type  
listings ──\< listing\_photos             one listing, many photos  
listings ──\< listing\_verification\_logs  full verification state history  
listings ──\< inspections                one listing, many inspections  
inspections ──\< inspection\_status\_logs  full inspection state history  
inspections ──\< payments                one inspection, one payment  
payments ──\< payment\_status\_logs        full payment state history  
listings ──\< conversations              chat scoped to listing  
conversations ──\< messages              messages within a conversation  
listings ──\< reviews                    reviews scoped to listing  
payments ──\< reviews                    review gated behind completed payment  
reports                                 polymorphic: targets listing or user  
audit\_logs                              all entities feed into one audit table  
system\_config                           global key-value config store  
---

**4\. API Shape**

### **4.1 Auth**

POST   /auth/register  
POST   /auth/login  
POST   /auth/logout  
POST   /auth/refresh-token  
POST   /auth/verify-phone  
POST   /auth/verify-email  
POST   /auth/oauth/google

### **4.2 Users**

GET    /users/me  
PATCH  /users/me

### **4.3 KYC**

POST   /kyc                          submit KYC documents  
GET    /kyc/me                       view own KYC status

### **4.4 Listings**

GET    /listings                     search \+ filter (public)  
GET    /listings/:id                 single listing detail (public)  
POST   /listings                     create listing (agent | landlord)  
PATCH  /listings/:id                 update listing (owner only)  
DELETE /listings/:id                 soft delete (owner only)

### **4.5 Inspections**

POST   /inspections                  tenant books inspection  
GET    /inspections/:id  
PATCH  /inspections/:id/status       confirm | cancel (agent | landlord)  
GET    /inspections/me               all inspections for current user

### **4.6 Payments**

POST   /payments/initiate            tenant initiates payment  
POST   /payments/webhook             Paystack webhook (internal, HMAC-verified)  
POST   /payments/:id/release         tenant confirms satisfaction → triggers release  
GET    /payments/:id  
GET    /payments/me                  all payments for current user

### **4.7 Chat**

GET    /conversations                list conversations for current user  
GET    /conversations/:id/messages   paginated message history  
POST   /conversations                start a conversation (tenant → listing)

Real-time delivery via WebSocket. REST endpoints handle history and conversation init.

### **4.8 Reports**

POST   /reports  
GET    /reports/me                   reporter sees their own filed reports

### **4.9 Reviews**

POST   /reviews  
GET    /reviews/listing/:id

### **4.10 Audit Log**

GET    /audit-logs                   scoped to current user's role (see scoping rules)

Query params:  
  ?entity\_type=listing|inspection|payment|user|kyc\_submission  
  ?entity\_id=UUID  
  ?action=listing.created  
  ?from=ISO8601  
  ?to=ISO8601  
  ?page=1  
  ?limit=20

### 

### **4.11 Admin**

GET    /admin/verification-queue/listings         pending listings  
PATCH  /admin/verification-queue/listings/:id     assign verified | limited | rejected  
GET    /admin/verification-queue/kyc              pending KYC submissions  
PATCH  /admin/verification-queue/kyc/:id          approve | reject

GET    /admin/reports                             all open/under-review reports  
PATCH  /admin/reports/:id/status                  under\_review | resolved | dismissed

GET    /admin/audit-logs                          full unscoped audit log (same query params as 4.10)

GET    /admin/config                              list all system config entries  
PATCH  /admin/config/:key                         update a config value  
---

## **5\. Tech Stack**

| Layer | Choice |
| :---- | :---- |
| Framework | Express.js |
| Database | Neon with DrizzleORM |
| Auth | Better Auth (JWT, refresh tokens, Google OAuth) |
| File Storage | Cloudflare R2 |
| Payments | Paystack |
| Hosting | Fly.io |

---

*Draft v2 — Backend Development Team, Team Neon*  
*TechCrush Alumni Buildathon 2026*  
*Pending: PM clarification on agent vs property manager role distinction*  
