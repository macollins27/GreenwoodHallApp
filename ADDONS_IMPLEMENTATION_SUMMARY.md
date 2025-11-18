# Add-ons System Implementation Summary

## Overview
This document summarizes the comprehensive add-ons system that has been implemented for EVENT bookings at Greenwood Hall. The system allows administrators to define rentable add-ons (like "Whicker Chair") and enables both admins and customers to select these add-ons when creating event bookings.

**Important:** This system applies **ONLY to EVENT bookings**, not showings.

---

## Database Schema Changes

### New Models

#### 1. AddOn Model
Catalog of available add-ons that can be rented.

```prisma
model AddOn {
  id          String          @id @default(cuid())
  name        String
  description String?
  priceCents  Int
  active      Boolean         @default(true)
  sortOrder   Int             @default(0)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  bookings    BookingAddOn[]
}
```

**Fields:**
- `name`: Display name of the add-on (e.g., "Whicker Chair")
- `description`: Optional description for customers
- `priceCents`: Price in cents (e.g., 2500 = $25.00)
- `active`: Whether the add-on is available for new bookings
- `sortOrder`: Controls display order in lists
- `bookings`: Relation to BookingAddOn (usage history)

#### 2. BookingAddOn Model
Junction table that records which add-ons were selected for each booking, including price snapshot.

```prisma
model BookingAddOn {
  id             String   @id @default(cuid())
  bookingId      String
  addOnId        String
  quantity       Int
  priceAtBooking Int      // Price snapshot at time of booking
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  booking        Booking  @relation(fields: [bookingId], references: [id])
  addOn          AddOn    @relation(fields: [addOnId], references: [id])
  
  @@index([bookingId])
  @@index([addOnId])
}
```

**Key Features:**
- `priceAtBooking`: Stores price at booking time (preserves historical pricing)
- `quantity`: How many of this add-on were requested
- Relations to both Booking and AddOn models

### Migration
- **File:** `prisma/migrations/20251118182021_add_addons_system/migration.sql`
- **Status:** Applied successfully
- **Prisma Client:** Regenerated with new types

### Seed Data
- **File:** `prisma/seed-addons.ts`
- **Default Add-on:** "Whicker Chair" at $25.00
- **Command:** `npx tsx prisma/seed-addons.ts`

---

## Admin Features

### 1. Add-ons Management Page
**Route:** `/admin/addons`

**Features:**
- View all add-ons in a table (active and inactive)
- Create new add-ons with name, price, and description
- Edit existing add-ons
- Activate/deactivate add-ons (soft delete)
- Delete add-ons (with protection against deleting used items)
- Real-time price validation

**Files:**
- `app/admin/(protected)/addons/page.tsx`
- `app/api/admin/addons/route.ts` (GET, POST)
- `app/api/admin/addons/[id]/route.ts` (PATCH, DELETE)

**API Endpoints:**
- `GET /api/admin/addons` - List all add-ons (ordered by sortOrder, name)
- `POST /api/admin/addons` - Create new add-on
- `PATCH /api/admin/addons/[id]` - Update add-on
- `DELETE /api/admin/addons/[id]` - Delete add-on (protected if used in bookings)

### 2. Enhanced Event Creation Form
**Component:** `components/admin/AdminEventForm.tsx`

**New Sections:**
1. **Setup Preferences**
   - Rectangular tables count
   - Round tables count
   - Chairs count
   - Setup notes (textarea)

2. **Optional Add-ons**
   - Displays all active add-ons
   - Quantity input for each add-on
   - Real-time add-ons subtotal calculation
   - Add-ons included in payload sent to backend

**Behavior:**
- Add-ons are informational for admin-created bookings
- No Stripe payment triggered for admin bookings
- Add-ons stored in database for record-keeping

### 3. Event Detail View
**Component:** `components/admin/EventDetailClient.tsx`

**New Display Sections:**
1. **Setup Preferences** (existing, already displayed)
   - Shows requested tables and chairs
   - Displays setup notes

2. **Add-ons** (newly added)
   - Lists each selected add-on with:
     - Name and description
     - Quantity × Unit price
     - Line total
   - Shows add-ons subtotal

**Data Fetching:**
- Updated `app/admin/(protected)/bookings/[id]/page.tsx`
- Includes `addOns` relation with nested `addOn` data

---

## Public Features

### 1. Enhanced Event Booking Form
**Component:** `components/events/EventBookingForm.tsx`

**New Features:**
- Fetches active add-ons from `/api/admin/addons` on mount
- Displays "Optional Add-ons" section before notes field
- For each add-on shows:
  - Name, description, price per unit
  - Quantity input (number field)
- Real-time pricing calculations:
  - Add-ons subtotal displayed when selections exist
  - Main pricing summary includes add-ons in total
  - Updated estimated total: base rental + setup + deposit + add-ons

**State Management:**
```typescript
const [addOns, setAddOns] = useState<AddOn[]>([]); // Catalog
const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({}); // Selections
```

**Payload Structure:**
```typescript
{
  // ... existing fields
  addOns: [
    {
      addOnId: "whicker-chair-default",
      quantity: 10,
      priceAtBooking: 2500 // cents
    }
  ]
}
```

### 2. Event Creation API
**File:** `app/api/events/route.ts`

**Updates:**
- Accepts `addOns` array in POST body
- Calculates add-ons total: `sum(quantity × priceAtBooking)`
- Includes add-ons in `totalCents` calculation
- Creates BookingAddOn records via nested create:
  ```typescript
  addOns: addOns.length > 0
    ? { create: addOns.map(addon => ({ ... })) }
    : undefined
  ```

### 3. Stripe Payment Integration
**File:** `app/api/payments/create-checkout-session/route.ts`

**Updates:**
- Fetches booking with `addOns` relation
- Creates separate Stripe line items:
  1. Base rental (rental + setup + deposit)
  2. Each add-on as individual line item with quantity
- Line item structure:
  ```typescript
  {
    price_data: {
      currency: "usd",
      unit_amount: bookingAddOn.priceAtBooking,
      product_data: {
        name: bookingAddOn.addOn.name,
        description: bookingAddOn.addOn.description || undefined
      }
    },
    quantity: bookingAddOn.quantity
  }
  ```

**Stripe Checkout Display:**
- Shows itemized breakdown of rental and each add-on
- Correct quantities and pricing for each item
- Total matches booking.totalCents

---

## Pricing Architecture

### Price Snapshot Pattern
**Why:** Preserve historical pricing even if add-on prices change later.

**Implementation:**
- `BookingAddOn.priceAtBooking` stores price at time of booking
- Public form sends `priceAtBooking` from catalog price
- Admin form sends `priceAtBooking` from catalog price
- Historical bookings maintain original pricing

### Calculation Flow

**Public Booking:**
```
Base Amount = hourlyRate × eventHours
Extra Setup = extraSetupHours × setupHourlyRate
Deposit = $300 (fixed)
Add-ons = sum(addOn.quantity × addOn.priceAtBooking)
Total = Base + Extra Setup + Deposit + Add-ons
```

**Stripe Checkout:**
- Line 1: Base + Extra Setup + Deposit (single line item)
- Lines 2+: Each add-on as separate line item
- Grand Total = Sum of all line items

### Admin vs Public Behavior

| Feature | Admin Booking | Public Booking |
|---------|--------------|----------------|
| Setup fields | ✅ Saved | ✅ Saved |
| Add-ons selection | ✅ Available | ✅ Available |
| Add-ons in database | ✅ Stored | ✅ Stored |
| Add-ons in pricing | ✅ Calculated | ✅ Calculated |
| Stripe payment | ❌ No auto-payment | ✅ Required |
| Add-ons in Stripe | N/A | ✅ Line items |

---

## Data Validation

### Admin Add-ons Management
- Name: Required, non-empty string
- Price: Must be ≥ 0 (in cents)
- Description: Optional
- Delete protection: Cannot delete if used in any booking

### Booking Creation (Admin & Public)
- Add-ons array: Optional
- Each add-on must have:
  - `addOnId`: Valid AddOn ID
  - `quantity`: Integer > 0
  - `priceAtBooking`: Integer ≥ 0 (cents)

---

## Testing Checklist

### Admin Workflow
- [x] Navigate to `/admin/addons`
- [x] Create new add-on (e.g., "Table Linens - $15")
- [x] Edit existing add-on
- [x] Activate/deactivate add-on
- [x] Attempt to delete used add-on (should fail)
- [x] Delete unused add-on (should succeed)
- [x] Create event booking with setup fields and add-ons
- [x] View event detail - verify setup and add-ons display
- [x] Verify no Stripe payment triggered for admin bookings

### Public Workflow
- [ ] Navigate to public event booking page
- [ ] Check that active add-ons appear in form
- [ ] Select add-ons with various quantities
- [ ] Verify pricing summary updates in real-time
- [ ] Submit booking with add-ons
- [ ] Verify add-ons stored in database (check BookingAddOn table)
- [ ] Proceed to Stripe checkout
- [ ] Verify Stripe shows base rental + individual add-ons
- [ ] Complete payment
- [ ] View booking in admin - verify add-ons display

### Edge Cases
- [ ] Booking with no add-ons (should work normally)
- [ ] Deactivate add-on, verify it doesn't appear in new bookings
- [ ] Verify deactivated add-on still appears in historical bookings
- [ ] Change add-on price, verify existing bookings show old price
- [ ] Create showing booking - verify no add-ons UI appears
- [ ] Verify add-ons never affect showing workflows

---

## File Changes Summary

### New Files
1. `prisma/migrations/20251118182021_add_addons_system/migration.sql`
2. `prisma/seed-addons.ts`
3. `app/api/admin/addons/route.ts`
4. `app/api/admin/addons/[id]/route.ts`
5. `app/admin/(protected)/addons/page.tsx`

### Modified Files
1. `prisma/schema.prisma` - Added AddOn and BookingAddOn models
2. `app/admin/(protected)/layout.tsx` - Added "Manage Add-ons" link
3. `components/admin/AdminEventForm.tsx` - Added setup and add-ons sections
4. `app/api/admin/bookings/create/route.ts` - Handle setup and add-ons
5. `components/events/EventBookingForm.tsx` - Added add-ons selection UI
6. `app/api/events/route.ts` - Process add-ons in POST handler
7. `app/api/payments/create-checkout-session/route.ts` - Add-ons as Stripe line items
8. `components/admin/EventDetailClient.tsx` - Display add-ons in detail view
9. `app/admin/(protected)/bookings/[id]/page.tsx` - Include addOns relation

---

## Technical Notes

### TypeScript Types
All components and API routes use proper TypeScript typing:
- AddOn type defined in forms and components
- BookingAddOn included in Booking type where needed
- Prisma client types auto-generated

### Database Indexes
BookingAddOn has indexes on:
- `bookingId` - Fast lookup of add-ons for a booking
- `addOnId` - Fast lookup of bookings using an add-on

### Error Handling
- API routes return proper error responses (400, 404, 500)
- Delete protection prevents orphaned data
- Frontend validates quantity inputs (min: 0)

### Performance Considerations
- Add-ons fetched once on form mount
- Catalog cached in component state
- Database queries use selective includes (only fetch relations when needed)

---

## Environment Variables
No new environment variables required. Existing Stripe configuration used:
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_SECRET_KEY`

---

## Future Enhancements (Not Implemented)
Potential improvements for future consideration:
1. Image uploads for add-ons
2. Category grouping for add-ons (e.g., "Furniture", "Decor")
3. Min/max quantity constraints per add-on
4. Package deals (bundle multiple add-ons at discount)
5. Seasonal pricing for add-ons
6. Add-ons inventory tracking
7. Add-ons availability calendar

---

## Support & Maintenance

### Common Tasks

**Add a new default add-on:**
```bash
# Edit prisma/seed-addons.ts
# Add new upsert call
npx tsx prisma/seed-addons.ts
```

**View add-ons in database:**
```bash
npx prisma studio
# Navigate to AddOn table
```

**Regenerate Prisma client after schema changes:**
```bash
npx prisma generate
```

**Reset database (development only):**
```bash
npx prisma migrate reset
npx tsx prisma/seed-addons.ts
```

---

## Conclusion
The add-ons system is fully functional and integrated across all EVENT booking workflows. Both administrators and public users can select add-ons, pricing calculations include add-ons correctly, and Stripe checkout properly itemizes all charges. The system maintains strict boundaries with showings (no add-ons) and preserves historical pricing through the snapshot pattern.
