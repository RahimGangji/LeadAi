import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import type { DataRecord, GeneratedFile, ParsedRequest } from "@/lib/types";

const MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const FIELD_LABELS: Record<string, string> = {
  businessName: "Business Name",
  companyName: "Company Name",
  contactName: "Contact Name",
  title: "Title",
  category: "Category",
  phone: "Phone",
  phones: "Phones",
  email: "Email",
  emails: "Emails",
  website: "Website",
  address: "Address",
  city: "City",
  state: "State",
  country: "Country",
  location: "Location",
  rating: "Rating",
  reviewsCount: "Reviews Count",
  googleMapsUrl: "Google Maps URL",
  linkedinCompanyUrl: "LinkedIn Company URL",
  linkedinProfileUrl: "LinkedIn Profile URL",
  industry: "Industry",
  companySize: "Company Size",
  employeeCount: "Employee Count",
  headquarters: "Headquarters",
  description: "Description",
  url: "URL",
  likes: "Likes",
  followers: "Followers",
  source: "Source",
};

function storageDir() {
  return path.join(process.cwd(), "storage", "generated");
}

export function safeFilename(parsedRequest: ParsedRequest) {
  const location = parsedRequest.locations.length > 0 ? parsedRequest.locations.join("_") : parsedRequest.location || parsedRequest.sourceType || "results";
  const subject = parsedRequest.businessType || parsedRequest.companyType || parsedRequest.sourceType || "data";
  const name = `${location}_${parsedRequest.quantity}_${subject}_data`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${name || "scraped_business_data"}.xlsx`;
}

export async function ensureStorage() {
  await fs.mkdir(storageDir(), { recursive: true });
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function labelForField(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function columnWidth(field: string) {
  if (/url|website|description/i.test(field)) return 38;
  if (/address|headquarters|location/i.test(field)) return 34;
  if (/email|companyName|businessName|contactName/i.test(field)) return 28;
  return 18;
}

function selectedColumns(parsedRequest: ParsedRequest, records: DataRecord[]) {
  const fields = new Set(parsedRequest.fields);

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (record[key] !== undefined && record[key] !== null && `${record[key]}`.trim() !== "") fields.add(key);
    }
  }

  fields.add("source");

  return Array.from(fields).map((field) => ({
    header: labelForField(field),
    key: field,
    width: columnWidth(field),
  }));
}

export async function createExcelFile(jobId: string, parsedRequest: ParsedRequest, records: DataRecord[]) {
  await ensureStorage();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SkillLead";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Results");
  sheet.columns = selectedColumns(parsedRequest, records);
  sheet.getRow(1).font = { bold: true, color: { argb: "FF111827" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.addRows(records);

  const metadata = workbook.addWorksheet("Request");
  metadata.columns = [
    { header: "Field", key: "field", width: 24 },
    { header: "Value", key: "value", width: 72 },
  ];
  metadata.addRows([
    { field: "Source", value: parsedRequest.source },
    { field: "Source Type", value: parsedRequest.sourceType },
    { field: "Search Query", value: parsedRequest.searchQuery },
    { field: "Business Type", value: parsedRequest.businessType || "" },
    { field: "Company Type", value: parsedRequest.companyType || "" },
    { field: "Location", value: parsedRequest.location || "" },
    { field: "Locations", value: parsedRequest.locations.join(", ") },
    { field: "Quantity Requested", value: parsedRequest.quantity },
    { field: "Fields", value: parsedRequest.fields.join(", ") },
    { field: "Records Exported", value: records.length },
  ]);
  metadata.getRow(1).font = { bold: true };

  const filename = safeFilename(parsedRequest);
  const id = crypto.randomUUID();
  const filePath = path.join(storageDir(), `${id}-${filename}`);
  await workbook.xlsx.writeFile(filePath);

  const stats = await fs.stat(filePath);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    id,
    jobId,
    filename,
    path: filePath,
    mimeType: MIME_TYPE,
    sizeBytes: stats.size,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  } satisfies GeneratedFile;
}
