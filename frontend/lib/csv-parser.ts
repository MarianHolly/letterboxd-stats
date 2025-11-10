import Papa from "papaparse";

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

/**
 * Parse a CSV file and return structured data
 */
export async function parseCSV(file: File): Promise<ParsedCSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          return;
        }

        const data = results.data as Record<string, string>[];
        const headers = results.meta.fields || [];

        resolve({
          headers,
          rows: data,
          rowCount: data.length,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Validate watched.csv file structure
 */
export function validateWatchedCSV(data: ParsedCSVData): {
  valid: boolean;
  errors: string[];
} {
  const requiredColumns = ["Name", "Watched Date"];
  const errors: string[] = [];

  for (const col of requiredColumns) {
    if (!data.headers.includes(col)) {
      errors.push(`Missing required column: "${col}"`);
    }
  }

  if (data.rowCount === 0) {
    errors.push("CSV file is empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ratings.csv file structure
 */
export function validateRatingsCSV(data: ParsedCSVData): {
  valid: boolean;
  errors: string[];
} {
  // ratings.csv typically has: Name, Rating (in stars), Rated Date
  const commonColumns = ["Name", "Rating"];
  const errors: string[] = [];

  // Check if at least some identifying columns exist
  if (!data.headers.some((h) => commonColumns.includes(h))) {
    errors.push(`Expected columns like: ${commonColumns.join(", ")}`);
  }

  if (data.rowCount === 0) {
    errors.push("CSV file is empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate diary.csv file structure
 */
export function validateDiaryCSV(data: ParsedCSVData): {
  valid: boolean;
  errors: string[];
} {
  // diary.csv has: Letterboxd URI, Name, Watched Date, etc.
  const errors: string[] = [];

  if (!data.headers.includes("Name") && !data.headers.includes("Watched Date")) {
    errors.push('Expected at least "Name" and "Watched Date" columns');
  }

  if (data.rowCount === 0) {
    errors.push("CSV file is empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get file type from filename
 */
export function getFileType(
  filename: string
): "watched" | "ratings" | "diary" | "unknown" {
  const name = filename.toLowerCase();

  if (name === "watched.csv") return "watched";
  if (name === "ratings.csv") return "ratings";
  if (name === "diary.csv") return "diary";

  return "unknown";
}

/**
 * Validate CSV based on detected file type
 */
export function validateCSV(
  fileType: "watched" | "ratings" | "diary" | "unknown",
  data: ParsedCSVData
): { valid: boolean; errors: string[] } {
  if (fileType === "watched") {
    return validateWatchedCSV(data);
  } else if (fileType === "ratings") {
    return validateRatingsCSV(data);
  } else if (fileType === "diary") {
    return validateDiaryCSV(data);
  }

  return {
    valid: false,
    errors: ["Unknown file type"],
  };
}
