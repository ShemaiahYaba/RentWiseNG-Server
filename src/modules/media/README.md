# Media module

Shared presigned upload URLs for Cloudflare R2.

## Routes (`/api/v1/media`)

| Method | Path | Auth | Roles | Description |
| --- | --- | --- | --- | --- |
| POST | `/presign` | Bearer | agent, landlord, admin | Get presigned PUT URL + public URL |

Returns **503** when R2 environment variables are not configured.
