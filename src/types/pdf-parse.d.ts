declare module "pdf-parse" {
  type PdfParseResult = {
    text?: string;
  };

  export default function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
}
