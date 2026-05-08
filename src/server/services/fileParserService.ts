import path from 'path';
import { createRequire } from "module";

export const fileParserService = {
  parseBuffer: async (originalname: string, buffer: Buffer): Promise<{ text?: string, error?: string }> => {
    try {
      const require = createRequire(import.meta.url);
      let extractedText = "";
      const ext = path.extname(originalname).toLowerCase();

      if (ext === '.pdf') {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer: buffer });
        extractedText = result.value;
      } else if (ext === '.rtf') {
        const { parseOffice } = require("officeparser");
        const doc = await parseOffice(buffer);
        extractedText = doc.toText();
      } else if (ext === '.txt' || ext === '.md') {
        extractedText = buffer.toString('utf-8');
      } else {
        return { error: "Unsupported file type." };
      }
      return { text: extractedText };
    } catch (err) {
      return { error: "Failed to extract pearl payload." };
    }
  }
};
