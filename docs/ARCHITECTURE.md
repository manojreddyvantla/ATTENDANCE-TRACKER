# MITS Attendance Tracker - Architecture & Data Flow

## Overview
MITS Attendance Tracker connects students of Madanapalle Institute of Technology & Science directly to their live GEMS attendance records.

```mermaid
graph TD
    User([Student]) -->|1. Enter Roll No & Password| ClientApp[Next.js Web UI]
    ClientApp -->|2. POST /api/attendance| ApiRoute[Next.js API Handler]
    ApiRoute -->|3. Forward Auth| ScraperService[GEMS Scraper Engine]
    ScraperService -->|4. Authenticate & Scrape| GEMS[Official MITS GEMS Portal]
    GEMS -->|5. Raw Attendance HTML| ScraperService
    ScraperService -->|6. Normalized JSON Payload| ApiRoute
    ApiRoute -->|7. Calculate 75% Safe Bunks| ClientApp
    ClientApp -->|8. Render Stats & Dashboard| User
```

## Calculation Logic
- **Exact Subject Percentage**: `(Attended / Conducted) * 100`
- **Safe Bunks**: `floor((Attended / 0.75) - Conducted)`
- **Mandatory Classes Required**: `ceil((0.75 * Conducted - Attended) / (1 - 0.75))`
