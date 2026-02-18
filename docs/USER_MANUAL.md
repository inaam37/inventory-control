# PantryPilot Staff User Manual

## 1. Accessing the system
1. Open the PantryPilot web app URL provided by your manager.
2. Use your organization credentials to sign in (when auth is enabled).
3. Confirm backend availability by checking that dashboard widgets load without errors.

## 2. Core workflows for staff

### View inventory items
- Navigate to inventory dashboard.
- Review current item quantity (`onHand`), reorder level, and category.
- Use filters/search to find products quickly.

### Add a new inventory item
- Open **Items** page.
- Click **Create Item**.
- Fill required fields:
  - Name
  - Category
  - Unit
- Optionally provide current stock (`onHand`).
- Save and confirm success message.

### Monitor system health (for shift leads)
- Open `/api/overview` in an internal tools tab.
- Validate endpoint status and planned capabilities.
- If issues are suspected, notify manager/IT.

## 3. Admin operations panel
The admin panel is designed for supervisors and IT staff only.

- Open `admin.html` in the deployed frontend.
- Enter the admin token.
- Use **Refresh Status** to view:
  - Environment
  - Uptime
  - Cache entry count
  - Sentry status
- Use **Invalidate Cache** after data corrections or releases.

## 4. Incident handling
- If API requests fail repeatedly:
  1. Validate internet connectivity.
  2. Check `/health` endpoint.
  3. Escalate with timestamp + error details.
- If data seems stale:
  1. Ask admin to invalidate cache.
  2. Refresh dashboard and verify.

## 5. Best practices
- Keep item names standardized (e.g., `Tomato Paste 800g`).
- Always update on-hand counts at end-of-shift.
- Report abnormal pricing or usage spikes to procurement manager.
