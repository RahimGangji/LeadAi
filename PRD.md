# Product Requirements Document: AI Business Data Scraping Platform

## 1. Product Summary

The AI Business Data Scraping Platform is a Next.js web application that allows users to request Google Maps business data and LinkedIn company/contact data using natural language. Users describe what they need, such as "Give me 100 plumbers in Texas from Google Maps" or "Get LinkedIn company data for fintech companies in New York," and the system converts that request into structured scraping instructions.

The platform uses Cerebras AI with the ZAI GLM 4.7 model to understand the user request, extract relevant parameters, select the best Apify actor, start a scraping job, clean and normalize the returned data, and generate a downloadable Excel file.

The product is designed to reduce the manual work required to identify scraping tools, configure scraping jobs, validate data, remove duplicates, and format results for business use.

## 2. Problem Statement

Business users frequently need targeted lists of companies, local businesses, decision makers, or contact information for sales, research, recruiting, market analysis, and operations. Existing workflows are often slow and fragmented:

- Users must know which data source to search.
- Users must manually configure scraping tools.
- Scraped data is often inconsistent, duplicated, or incomplete.
- Exporting clean results into Excel requires additional manual work.
- Non-technical users struggle to translate business intent into scraper configuration.

This platform solves the problem by turning a natural language request into a guided, automated data collection workflow.

## 3. Target Users

### Primary Users

- Sales representatives and business development teams
- Lead generation agencies
- Founders and small business owners
- Recruiters and talent researchers
- Market research analysts
- Operations teams collecting vendor or competitor data

### Secondary Users

- Data enrichment teams
- Growth marketers
- Virtual assistants
- Consultants
- Internal analysts at SMBs and startups

## 4. Goals and Objectives

### Product Goals

- Allow users to request scraped business data using natural language.
- Automatically parse user intent into structured scraping parameters.
- Select the most suitable Apify actor based on request type and source.
- Generate clean, deduplicated, downloadable Excel files.
- Provide clear scraping job status and error feedback.
- Support Google Maps business scraping as a core MVP workflow.
- Support LinkedIn company and contact data scraping where configured actors allow it.

### Business Objectives

- Reduce the time required to collect targeted lead data.
- Make scraping workflows accessible to non-technical users.
- Create a foundation for paid usage limits, subscriptions, or credit-based scraping.
- Support repeatable data workflows focused on the two approved sources: Google Maps and LinkedIn.

### Engineering Objectives

- Build a maintainable Next.js application using API routes or server actions.
- Integrate reliably with Cerebras AI and Apify APIs.
- Keep scraping jobs trackable, auditable, and recoverable.
- Generate Excel files in a predictable structure.
- Protect user requests, generated files, API keys, and scraped data.

## 5. Key Features

### Natural Language Scraping Request

Users can enter a plain English request describing the data they want. The system should support prompts such as:

- "Give me 100 plumbers in Texas from Google Maps"
- "Find 10 SaaS companies from Google Maps"
- "Get LinkedIn company data for fintech companies in New York"
- "Scrape 50 restaurants in Los Angeles with phone numbers and websites"

### AI Request Parsing

The AI extracts structured parameters from the user's prompt:

- Business category or company type
- Location
- Quantity
- Preferred source
- Required fields
- Output format
- Contact or decision-maker intent
- Ambiguity or missing information

### Follow-Up Questions

When a request is too vague, the AI should ask targeted follow-up questions instead of starting an unreliable scrape.

Example:

User request: "Find me some companies."

System response: "What type of companies should I search for, which location should I use, and how many records do you need?"

### Automatic Apify Actor Selection

The backend should select an Apify actor based on the parsed request. For example:

- Google Maps business data: Google Maps scraper actor
- LinkedIn company data: LinkedIn company scraper actor
- LinkedIn contact data: LinkedIn profile scraper actor, if available

### Scraping Job Execution

The backend sends structured scraping instructions to Apify, starts the actor run, tracks status, retrieves results, and records job metadata.

### Data Cleaning and Deduplication

The system cleans returned data before export:

- Remove duplicate businesses or contacts.
- Normalize phone numbers where possible.
- Normalize URLs.
- Trim whitespace.
- Standardize column names.
- Remove empty rows.
- Validate required fields.

### Excel Export

The system generates an `.xlsx` file with clean headers and one record per row. The filename should be based on the user request, such as:

```text
texas_100_plumbers_data.xlsx
```

### Status Tracking

Users should see the status of their scraping request:

- Request parsed
- Waiting for confirmation, if needed
- Scraping queued
- Scraping running
- Cleaning data
- Generating Excel
- Ready for download
- Failed

## 6. User Flow

1. User opens the web application.
2. User enters a natural language request.
3. Frontend submits the request to the backend.
4. Backend sends the prompt to Cerebras AI.
5. AI returns structured JSON with request parameters, confidence scores, and missing fields.
6. If required information is missing, the UI asks follow-up questions.
7. Once the request is valid, the backend selects the appropriate Apify actor.
8. Backend creates a scraping job record.
9. Backend starts the Apify actor run.
10. UI displays scraping progress.
11. Backend polls Apify or receives webhook updates.
12. Backend retrieves the Apify dataset.
13. Backend cleans, validates, normalizes, and deduplicates results.
14. Backend generates an Excel file.
15. Backend stores the generated file temporarily or persistently.
16. UI displays a download button.
17. User downloads the Excel file.

## 7. Functional Requirements

### Request Input

- The application must provide a text input for natural language scraping requests.
- The application must support multi-sentence prompts.
- The application must show example prompts to help users get started.
- The application must prevent empty submissions.
- The application should support optional advanced controls for quantity, source, or fields.

### AI Parsing

- The backend must send user prompts to Cerebras AI.
- The AI must return structured JSON.
- The system must validate AI output before using it.
- The AI must identify missing or ambiguous information.
- The AI must recommend fields based on the requested data type.
- The AI must identify whether the user is requesting local businesses, companies, contacts, CEOs, or mixed data.

### Scraping Job Creation

- The backend must create a job for every valid request.
- Each job must have a unique ID.
- Each job must store original prompt, parsed parameters, selected actor, status, timestamps, and result metadata.
- The frontend must be able to fetch job status by ID.

### Apify Actor Selection

- The backend must map request types to known Apify actors.
- The backend must support Google Maps business scraping for MVP.
- The actor selection logic must be configurable without changing user-facing UI.
- The selected actor must receive input that matches its expected schema.

### Apify Execution

- The backend must start Apify actor runs using the Apify API.
- The backend must store the Apify run ID and dataset ID.
- The backend must support polling for run status.
- The backend should support Apify webhooks for production readiness.
- The backend must handle Apify failures and timeouts.

### Data Processing

- The backend must retrieve Apify dataset results.
- The backend must clean and normalize records.
- The backend must deduplicate records.
- The backend must limit final rows to the requested quantity where applicable.
- The backend must preserve useful metadata such as source URL when available.

### Excel Generation

- The backend must generate an `.xlsx` file.
- The Excel file must include clean column headers.
- The Excel file must contain one record per row.
- The generated filename must be human-readable and based on the request.
- The file must be downloadable through a secure endpoint.

### Status and Notifications

- The frontend must show current job status.
- The frontend must update status without requiring a full page refresh.
- The frontend should display elapsed time.
- The frontend must show clear error messages.

## 8. Non-Functional Requirements

### Performance

- The initial page should load quickly and remain interactive.
- AI parsing should usually complete within a few seconds.
- Scraping duration depends on source, quantity, Apify actor, and rate limits.
- The UI must handle long-running jobs gracefully.

### Reliability

- The system must not lose job state if a user refreshes the page.
- Failed scraping jobs must be recorded with error details.
- Temporary failures should be retried where safe.
- Excel generation should be deterministic for the same cleaned dataset.

### Scalability

- The architecture should support multiple concurrent scraping jobs.
- Background processing should be introduced when synchronous API routes become insufficient.
- File storage should support both local development and production object storage.

### Maintainability

- AI prompt templates should be versioned or centralized.
- Actor mappings should be stored in configuration or database records.
- Data cleaning utilities should be modular.
- API response shapes should be documented and consistent.

### Usability

- Users should understand whether the system needs more information, is scraping, has failed, or is ready.
- The product should avoid exposing raw Apify configuration unless needed.
- The main request flow should be simple enough for non-technical users.

### Accessibility

- The UI should support keyboard navigation.
- Inputs, buttons, loading states, and error messages should have accessible labels.
- Status updates should be screen-reader friendly where possible.

## 9. AI Request Understanding Logic

### AI Provider

- Provider: Cerebras AI
- Model: Cerebras ZAI GLM 4.7
- The Cerebras/Z.AI GLM API key and model configuration must be read from server-side environment variables, not hardcoded in source code.

### Environment Variables

The application must use a `.env.local` file for local development and platform-managed environment variables in production.

Required AI-related variables:

```text
CEREBRAS_API_KEY=your_cerebras_api_key
CEREBRAS_MODEL=zai-glm-4.7
```

If the provider integration requires a Z.AI-specific key or endpoint naming convention, the implementation may use:

```text
ZAI_API_KEY=your_zai_api_key
ZAI_GLM_MODEL=zai-glm-4.7
```

Only backend code, API routes, server actions, or background workers may read these values. They must not use the `NEXT_PUBLIC_` prefix.

### AI Responsibilities

The AI should:

- Understand the user's scraping intent.
- Convert natural language into structured JSON.
- Extract business type, company type, location, quantity, source, and requested fields.
- Identify whether the request is local business data, company data, or contact/CEO data.
- Determine whether Google Maps is explicitly requested or should be selected as the best available source.
- Ask follow-up questions when the request is too vague.
- Recommend relevant output fields.
- Help normalize and clean scraped data where appropriate.

### Expected AI JSON Output

```json
{
  "intent": "local_business_search",
  "businessType": "plumbers",
  "companyType": null,
  "location": "Texas",
  "quantity": 100,
  "source": "Google Maps",
  "fields": [
    "businessName",
    "phone",
    "website",
    "address",
    "rating",
    "reviewsCount"
  ],
  "outputFormat": "xlsx",
  "requiresFollowUp": false,
  "missingFields": [],
  "followUpQuestions": [],
  "confidence": 0.93
}
```

### Required Parsed Fields

For most scraping jobs, the system should require:

- `intent`
- `quantity`
- `location` or source-specific search target
- `businessType`, `companyType`, or contact target
- `source`
- `fields`
- `outputFormat`

### Supported Intents

- `local_business_search`
- `company_search`
- `contact_search`
- `ceo_search`
- `unknown`

### Follow-Up Trigger Conditions

The AI should request clarification when:

- Quantity is missing and cannot be safely defaulted.
- Business or company type is missing.
- Location is required but missing.
- The requested data source is unsupported.
- The user requests sensitive or disallowed personal data.
- The desired fields cannot be inferred.
- The request is too broad, such as "Find companies."

### Suggested Defaults

When the user's intent is clear but a minor value is missing, the system may apply safe defaults:

- Default source for local businesses: Google Maps
- Default quantity: 50, if business type and location are present
- Default output format: `.xlsx`
- Default fields for local businesses: business name, phone, website, address, rating, reviews count, category

Defaults should be shown to the user before starting large or costly jobs.

## 10. Apify Integration Requirements

### Environment Variables

The Apify API token must be stored in a server-side environment variable.

Required Apify-related variable:

```text
APIFY_API_TOKEN=your_apify_api_token
```

Optional Apify-related variables:

```text
APIFY_WEBHOOK_SECRET=your_apify_webhook_secret
APIFY_DEFAULT_GOOGLE_MAPS_ACTOR_ID=apify/google-maps-scraper
```

These variables must be loaded only by backend code, API routes, server actions, or background workers. They must never be exposed to the browser and must not use the `NEXT_PUBLIC_` prefix.

### Apify Responsibilities

Apify should:

- Receive structured scraping instructions.
- Run the most suitable actor for the requested task.
- Scrape data from the selected source.
- Return structured results to the application.
- Support job status tracking.
- Handle retries where the actor supports them.

### Actor Selection

The platform should maintain an actor registry. Each actor entry should define:

- Actor ID
- Supported intent
- Supported source
- Required input fields
- Optional input fields
- Output field mapping
- Maximum recommended quantity
- Cost notes
- Retry behavior

Example registry entry:

```json
{
  "actorKey": "google_maps_business_search",
  "actorId": "apify/google-maps-scraper",
  "supportedIntents": ["local_business_search"],
  "source": "Google Maps",
  "requiredInputs": ["searchQuery", "maxResults"],
  "outputMapping": {
    "title": "businessName",
    "phone": "phone",
    "website": "website",
    "address": "address",
    "rating": "rating",
    "reviewsCount": "reviewsCount"
  }
}
```

### Apify Input Construction

For a prompt like "Give me 100 plumbers in Texas," the backend should create an Apify input similar to:

```json
{
  "searchStringsArray": ["plumbers in Texas"],
  "maxCrawledPlacesPerSearch": 100,
  "language": "en",
  "includeReviews": false
}
```

The exact input schema must be adapted to the selected actor's documented requirements.

### Status Tracking

The backend must track:

- Apify run ID
- Actor ID
- Run status
- Dataset ID
- Started time
- Finished time
- Error message, if any

### Webhooks

For production, the application should support Apify webhooks for:

- Run succeeded
- Run failed
- Run timed out
- Run aborted

Polling may be used for the MVP.

## 11. Excel Export Requirements

### File Format

- Export format: `.xlsx`
- MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Excel File Requirements

- Clean human-readable column headers
- One record per row
- No duplicate rows
- Validated fields where possible
- Empty values left blank
- Frozen header row preferred
- Auto-sized columns preferred
- Optional metadata worksheet for request details

### Filename Rules

The filename should be generated from parsed request parameters:

```text
{location}_{quantity}_{businessType}_data.xlsx
```

Example:

```text
texas_100_plumbers_data.xlsx
```

Filename generation should:

- Convert to lowercase.
- Replace spaces with underscores.
- Remove unsafe filename characters.
- Avoid exposing sensitive user-provided text.

### Recommended Libraries

For Next.js, use one of:

- `exceljs`
- `xlsx`

`exceljs` is recommended when formatting features such as frozen headers, column sizing, and multiple worksheets are desired.

## 12. Data Fields and Output Structure

### Local Business Fields

Recommended output columns:

| Field Key | Column Header | Required | Notes |
| --- | --- | --- | --- |
| `businessName` | Business Name | Yes | Main business name |
| `category` | Category | No | Business category |
| `phone` | Phone | No | Normalize where possible |
| `website` | Website | No | Normalize URL |
| `address` | Address | No | Full formatted address |
| `city` | City | No | Derived if available |
| `state` | State | No | Derived if available |
| `country` | Country | No | Derived if available |
| `rating` | Rating | No | Numeric rating |
| `reviewsCount` | Reviews Count | No | Number of reviews |
| `googleMapsUrl` | Google Maps URL | No | Source profile URL |
| `source` | Source | Yes | Example: Google Maps |

### Company Fields

Recommended output columns:

| Field Key | Column Header | Required | Notes |
| --- | --- | --- | --- |
| `companyName` | Company Name | Yes | Main company name |
| `industry` | Industry | No | Industry or vertical |
| `website` | Website | No | Company website |
| `location` | Location | No | Headquarters or target location |
| `linkedinUrl` | LinkedIn URL | No | Company LinkedIn URL |
| `description` | Description | No | Short company description |
| `employeeCount` | Employee Count | No | If available |
| `source` | Source | Yes | Source used |

### CEO and Contact Fields

Recommended output columns:

| Field Key | Column Header | Required | Notes |
| --- | --- | --- | --- |
| `companyName` | Company Name | Yes | Associated company |
| `contactName` | Contact Name | No | Person name |
| `title` | Title | No | Example: CEO, Founder |
| `email` | Email | No | Include only if lawfully sourced |
| `phone` | Phone | No | Include only if appropriate |
| `linkedinProfile` | LinkedIn Profile | No | Person profile URL |
| `companyWebsite` | Company Website | No | Associated company website |
| `location` | Location | No | Person or company location |
| `source` | Source | Yes | Source used |

### Deduplication Rules

Deduplicate local businesses by:

- Business name plus phone
- Business name plus address
- Website domain
- Google Maps URL, if available

Deduplicate companies by:

- Company name plus website domain
- LinkedIn company URL

Deduplicate contacts by:

- Contact name plus company name
- LinkedIn profile URL
- Email address, if available

## 13. Error Handling

### User-Facing Errors

The system should provide clear, non-technical messages:

- "Please include a business type and location."
- "This request is too broad. Try asking for a specific industry, location, and number of records."
- "The scraping job failed. Please try again or reduce the number of records."
- "The data source is temporarily unavailable."
- "No matching records were found."
- "The Excel file could not be generated."

### Backend Errors

The backend should capture:

- AI API errors
- Invalid AI JSON output
- Actor selection failures
- Apify API failures
- Apify timeout or aborted runs
- Dataset retrieval failures
- Data cleaning failures
- Excel generation failures
- File storage failures

### Retry Strategy

- Retry transient AI API failures with exponential backoff.
- Retry Apify status checks.
- Avoid retrying jobs that fail due to invalid input.
- Allow user-initiated retry for failed jobs.

### Logging

Logs should include:

- Job ID
- User ID, if authentication is enabled
- Request ID
- Apify run ID
- Status transitions
- Error type and message

Logs should not include secrets or sensitive personal data beyond what is necessary for debugging.

## 14. Edge Cases

- User provides no quantity.
- User provides an extremely large quantity.
- User provides no location.
- User asks for a business type that is too broad.
- User asks for a data source that is unsupported.
- User asks for fields unavailable from the selected source.
- AI returns invalid JSON.
- AI incorrectly classifies intent.
- Apify actor schema changes.
- Apify returns fewer results than requested.
- Apify returns duplicate or low-quality records.
- Apify job takes longer than expected.
- User refreshes the page during scraping.
- User attempts to download an expired file.
- Generated Excel file is empty.
- User requests personal data that is sensitive, inappropriate, or not lawfully accessible.
- Multiple users submit large jobs at the same time.
- User prompt includes conflicting requirements, such as "100 restaurants in Texas and New York but only in Los Angeles."

## 15. Security and Privacy Requirements

### API Key Security

- Cerebras/Z.AI GLM and Apify API keys must be stored in `.env.local` for local development and secure environment variables in production.
- Required server-side variables should include `CEREBRAS_API_KEY` or `ZAI_API_KEY`, the selected GLM model variable such as `CEREBRAS_MODEL` or `ZAI_GLM_MODEL`, and `APIFY_API_TOKEN`.
- Secret environment variables must only be accessed from backend code, API routes, server actions, or background workers.
- Secret variables must not use the `NEXT_PUBLIC_` prefix because that would expose them to the frontend bundle.
- API keys must never be exposed to the frontend.
- API keys must not be logged.

### Data Privacy

- The platform should only scrape and export data from lawful and permitted sources.
- The system should avoid collecting sensitive personal data.
- Contact data should be handled carefully and only exported when source terms and applicable laws allow it.
- Generated files should expire after a defined retention period unless persistent storage is enabled.

### File Access

- Download URLs should be scoped to a job and user session where possible.
- Public unauthenticated file URLs should be avoided in production.
- Expired files should not be downloadable.

### Input Security

- User prompts must be validated and length-limited.
- AI output must be treated as untrusted data and validated before use.
- Apify actor inputs must be constructed using safe server-side mapping logic.
- The application must protect against injection in filenames, logs, and exported cell values.

### Authentication

Authentication is optional for MVP but recommended for production. If enabled, users should only access their own jobs and generated files.

## 16. Rate Limits and Usage Limits

### User Limits

For MVP, suggested limits:

- Maximum records per job: 100 to 500
- Maximum active jobs per user/session: 1 to 3
- Maximum prompt length: 1,000 characters
- File retention: 24 hours

### API Limits

The system must account for:

- Cerebras API rate limits
- Apify API rate limits
- Apify actor concurrency limits
- Apify account usage and billing limits

### Abuse Prevention

- Rate limit request parsing endpoint.
- Rate limit scraping job creation.
- Require authentication for higher usage tiers.
- Consider credit-based usage for production.
- Reject clearly abusive or unsupported scraping requests.

## 17. Suggested Database Schema

The application can use PostgreSQL, MySQL, SQLite, or another relational database. Prisma is recommended for a Next.js project.

### `users`

Required only if authentication is enabled.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string / uuid | Primary key |
| `email` | string | Unique |
| `name` | string | Optional |
| `createdAt` | datetime | Created timestamp |
| `updatedAt` | datetime | Updated timestamp |

### `scraping_jobs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string / uuid | Primary key |
| `userId` | string / uuid | Nullable if auth is disabled |
| `originalPrompt` | text | User's request |
| `status` | enum | `draft`, `needs_clarification`, `queued`, `running`, `processing`, `ready`, `failed`, `expired` |
| `intent` | string | Parsed intent |
| `businessType` | string | Nullable |
| `companyType` | string | Nullable |
| `location` | string | Nullable |
| `quantity` | integer | Requested quantity |
| `source` | string | Selected source |
| `fields` | json | Requested output fields |
| `parsedRequest` | json | Full AI output |
| `selectedActorKey` | string | Internal actor key |
| `apifyActorId` | string | Apify actor ID |
| `apifyRunId` | string | Apify run ID |
| `apifyDatasetId` | string | Apify dataset ID |
| `resultCount` | integer | Final cleaned result count |
| `fileId` | string | Generated file reference |
| `errorMessage` | text | Nullable |
| `createdAt` | datetime | Created timestamp |
| `updatedAt` | datetime | Updated timestamp |
| `completedAt` | datetime | Nullable |
| `expiresAt` | datetime | Nullable |

### `generated_files`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string / uuid | Primary key |
| `jobId` | string / uuid | Related scraping job |
| `storageProvider` | string | `local`, `s3`, `r2`, etc. |
| `storageKey` | string | File path or object key |
| `filename` | string | Download filename |
| `mimeType` | string | Excel MIME type |
| `sizeBytes` | integer | File size |
| `createdAt` | datetime | Created timestamp |
| `expiresAt` | datetime | Expiration timestamp |

### `actor_registry`

This can be a database table or static config.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string | Internal actor key |
| `actorId` | string | Apify actor ID |
| `source` | string | Source name |
| `supportedIntents` | json | Supported intent list |
| `inputSchema` | json | Required and optional inputs |
| `outputMapping` | json | Apify field to app field mapping |
| `enabled` | boolean | Whether actor is available |
| `createdAt` | datetime | Created timestamp |
| `updatedAt` | datetime | Updated timestamp |

## 18. API Endpoints

The following endpoints are suggested for a Next.js App Router implementation.

### `POST /api/requests/parse`

Parses a natural language request using Cerebras AI.

Request:

```json
{
  "prompt": "Give me 100 plumbers in Texas"
}
```

Response:

```json
{
  "parsedRequest": {
    "intent": "local_business_search",
    "businessType": "plumbers",
    "location": "Texas",
    "quantity": 100,
    "source": "Google Maps",
    "fields": ["businessName", "phone", "website", "address"],
    "outputFormat": "xlsx",
    "requiresFollowUp": false,
    "missingFields": []
  }
}
```

### `POST /api/jobs`

Creates and starts a scraping job.

Request:

```json
{
  "prompt": "Give me 100 plumbers in Texas",
  "parsedRequest": {
    "intent": "local_business_search",
    "businessType": "plumbers",
    "location": "Texas",
    "quantity": 100,
    "source": "Google Maps",
    "fields": ["businessName", "phone", "website", "address"],
    "outputFormat": "xlsx"
  }
}
```

Response:

```json
{
  "jobId": "job_123",
  "status": "queued"
}
```

### `GET /api/jobs/:jobId`

Returns job status and metadata.

Response:

```json
{
  "jobId": "job_123",
  "status": "running",
  "resultCount": null,
  "downloadUrl": null,
  "errorMessage": null
}
```

### `POST /api/jobs/:jobId/process`

Processes completed Apify results, cleans data, and generates the Excel file. This may be called by a background worker, webhook handler, or internal job scheduler.

Response:

```json
{
  "jobId": "job_123",
  "status": "ready",
  "resultCount": 100,
  "downloadUrl": "/api/files/file_123/download"
}
```

### `GET /api/files/:fileId/download`

Downloads the generated Excel file.

Response:

- Returns `.xlsx` binary file.
- Requires authorization if authentication is enabled.
- Returns `404` or `410` if file does not exist or has expired.

### `POST /api/apify/webhook`

Receives Apify webhook events.

Request:

```json
{
  "eventType": "ACTOR.RUN.SUCCEEDED",
  "resource": {
    "id": "apify_run_id",
    "defaultDatasetId": "dataset_id"
  }
}
```

Response:

```json
{
  "received": true
}
```

## 19. System Architecture

### Recommended High-Level Architecture

```text
User Browser
  |
  v
Next.js Frontend
  |
  v
Next.js API Routes / Server Actions
  |
  +--> Cerebras AI API
  |
  +--> Job Database
  |
  +--> Apify API
  |
  +--> Data Cleaning Service
  |
  +--> Excel Generation Service
  |
  +--> File Storage
```

### Components

#### Frontend

- Request input form
- Example prompts
- Parsed request preview
- Follow-up question UI
- Job status display
- Download button
- Error and empty-state messages

#### Backend

- AI parsing service
- Request validation service
- Actor selection service
- Apify client service
- Job status service
- Data processing service
- Excel generation service
- File storage service

#### External Services

- Cerebras AI for request understanding
- Apify for scraping execution
- Optional object storage for generated files
- Optional authentication provider

### Background Processing

For MVP, polling from API routes may be acceptable for small jobs. For production, use a background worker or queue such as:

- BullMQ with Redis
- Inngest
- Trigger.dev
- Temporal
- Vercel background functions where suitable

Background processing is recommended because scraping jobs may exceed normal serverless execution limits.

## 20. MVP Scope

### Included in MVP

- Next.js web interface
- Natural language request input
- Cerebras AI request parsing
- Validation and follow-up questions for vague requests
- Google Maps business data scraping through Apify
- LinkedIn company/contact scraping through configured Apify actors
- Basic actor registry for Google Maps and LinkedIn workflows
- Job creation and status tracking
- Polling-based Apify status updates
- Dataset retrieval from Apify
- Data cleaning and deduplication
- Excel file generation
- Downloadable result files
- Basic error handling
- Environment-based API key configuration

### Excluded from MVP

- Full authentication system, unless required by launch scope
- Paid billing or subscription management
- Advanced contact enrichment
- Scraping workflows outside Google Maps and LinkedIn
- Real-time websocket status updates
- Admin dashboard
- Long-term file retention
- Team accounts
- CRM integrations
- Full compliance automation

## 21. Future Enhancements

- User authentication and account history
- Credit-based usage limits
- Stripe billing integration
- Saved prompt templates
- Recurring scraping jobs
- Additional source support beyond Google Maps and LinkedIn
- CRM exports to HubSpot, Salesforce, or Pipedrive
- CSV export in addition to Excel
- Email notification when job completes
- Websocket or server-sent event status updates
- Admin dashboard for job monitoring
- Actor performance analytics
- User-selectable Apify actors
- Data quality scoring
- Lead enrichment using additional lawful data providers
- Team workspaces
- API access for programmatic scraping requests
- Prompt history and job reruns
- Regional compliance controls

## 22. Acceptance Criteria

### Natural Language Parsing

- Given a request like "Give me 100 plumbers in Texas," the system extracts business type, location, quantity, source, fields, and output format.
- Given a vague request like "Find me companies," the system asks follow-up questions instead of starting a scrape.
- Given a request with Google Maps specified, the system selects Google Maps as the source.

### Apify Integration

- The system can start an Apify actor run from a valid parsed request.
- The system stores the Apify run ID and dataset ID.
- The system can retrieve Apify results after a run completes.
- Failed Apify jobs are reflected in the UI with a clear error state.

### Job Tracking

- Every scraping request has a unique job ID.
- The user can view job status after job creation.
- The job status updates through the expected lifecycle.
- Refreshing the page does not lose the job status if the job ID is available.

### Data Cleaning

- Duplicate records are removed before export.
- Empty rows are removed before export.
- URLs and phone numbers are normalized where possible.
- Final result count is shown to the user.

### Excel Export

- The system generates a valid `.xlsx` file.
- The Excel file contains clean column headers.
- The Excel file contains one record per row.
- The file can be downloaded from the UI.
- The filename is based on the request, such as `texas_100_plumbers_data.xlsx`.

### Security

- Cerebras and Apify API keys are not exposed to the browser.
- Download endpoints do not expose files from unrelated jobs.
- User input and AI output are validated before use.
- Generated files expire according to retention settings.

### MVP Completion

The MVP is complete when a user can enter "Give me 100 plumbers in Texas from Google Maps," the system parses the request, starts an Apify Google Maps scraping job, retrieves and cleans the results, generates an Excel file, and provides a working download button.
